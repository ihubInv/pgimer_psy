const db = require('../config/database');
const { sanitizeAdlRequestBody, tryDdMmYyyyToYyyyMmDd } = require('../utils/adlPayloadSanitize');

/** null = unknown; set after first information_schema check */
let adlFilesHasChildPatientIdColumn = null;

const getAdlFilesHasChildPatientIdColumn = async () => {
  if (adlFilesHasChildPatientIdColumn !== null) {
    return adlFilesHasChildPatientIdColumn;
  }
  try {
    const r = await db.query(
      `SELECT 1 AS ok
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'adl_files'
         AND column_name = 'child_patient_id'
       LIMIT 1`
    );
    adlFilesHasChildPatientIdColumn = r.rows.length > 0;
  } catch {
    adlFilesHasChildPatientIdColumn = false;
  }
  return adlFilesHasChildPatientIdColumn;
};

// Helper function to sanitize date fields - converts empty strings to null; DD/MM/YYYY → YYYY-MM-DD
const sanitizeDate = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return tryDdMmYyyyToYyyyMmDd(value.trim());
  }
  return value;
};

// Helper function to sanitize all date fields in adlData
const sanitizeDateFields = (data) => {
  // All DATE type columns in the adl_files table
  const dateFields = [
    'file_created_date', 
    'last_accessed_date', 
    'family_history_father_death_date',
    'family_history_mother_death_date', 
    'personal_birth_date'
  ];
  
  const sanitized = { ...data };
  dateFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = sanitizeDate(sanitized[field]);
    }
  });
  return sanitized;
};

// Helper function to sanitize integer fields - converts empty strings to null
const sanitizeIntegerFields = (data) => {
  // All INTEGER type columns in the adl_files table
  const integerFields = [
    'family_history_father_age',
    'family_history_father_death_age',
    'family_history_mother_age',
    'family_history_mother_death_age'
  ];
  
  const sanitized = { ...data };
  integerFields.forEach(field => {
    if (field in sanitized) {
      const value = sanitized[field];
      // Convert empty string, null, undefined, or invalid values to null
      if (value === '' || value === null || value === undefined) {
        sanitized[field] = null;
      } else {
        // Try to parse as integer, if invalid, set to null
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          sanitized[field] = null;
        } else {
          sanitized[field] = parsed;
        }
      }
    }
  });
  return sanitized;
};

/**
 * Some clients send JSONB arrays as `[ "{\"name\":\"x\"}" ]` (objects stringified per element)
 * or double-encode the whole payload. PostgreSQL then receives invalid JSON text for `::jsonb`.
 * Peel string layers with JSON.parse until the value is no longer a JSON-looking string.
 */
const parseJsonStringLayers = (value, maxDepth = 12) => {
  let current = value;
  let depth = 0;
  while (typeof current === 'string' && depth < maxDepth) {
    const trimmed = current.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    const looksLikeJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'));
    if (!looksLikeJson) {
      return current;
    }
    try {
      current = JSON.parse(trimmed);
      depth += 1;
    } catch {
      return value;
    }
  }
  return current;
};

const stripUndefinedDeep = (v) => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (Array.isArray(v)) {
    return v
      .filter((x) => x !== undefined)
      .map((x) => stripUndefinedDeep(x));
  }
  if (typeof v !== 'object') return v;
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === undefined) continue;
    out[k] = stripUndefinedDeep(val);
  }
  return out;
};

// Helper: normalize JSON/JSONB array fields (ensures valid JSON arrays for node-pg + PostgreSQL)
// - Empty string/null/undefined -> []
// - String that parses to an array -> parsed array (elements unwrapped if stringified JSON)
// - Non-array objects -> [object]
const normalizeJsonArray = (value) => {
  if (value === '' || value === null || value === undefined) {
    return [];
  }

  let items;
  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === 'string') {
    const parsed = parseJsonStringLayers(value);
    if (parsed === null || parsed === undefined) return [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (typeof parsed === 'object') {
      const cleaned = stripUndefinedDeep(parsed);
      return cleaned === undefined ? [] : [cleaned];
    } else {
      return [];
    }
  } else if (typeof value === 'object' && value !== null) {
    const cleaned = stripUndefinedDeep(value);
    return cleaned === undefined ? [] : [cleaned];
  } else {
    return [];
  }

  const out = [];
  const walk = (el) => {
    const peeled = parseJsonStringLayers(el);
    if (Array.isArray(peeled)) {
      peeled.forEach(walk);
      return;
    }
    if (typeof peeled === 'object' && peeled !== null) {
      const cleaned = stripUndefinedDeep(peeled);
      if (cleaned !== undefined) out.push(cleaned);
      return;
    }
    if (peeled !== null && peeled !== undefined) {
      out.push(peeled);
    }
  };
  items.forEach(walk);
  return out;
};

/** Unwrap JSON-looking strings nested inside objects (e.g. a field double-encoded as text). */
const deepRepairJsonStringsInValue = (v) => {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(deepRepairJsonStringsInValue);
  if (typeof v === 'string') {
    const layered = parseJsonStringLayers(v);
    if (layered !== v && typeof layered === 'object') {
      return deepRepairJsonStringsInValue(layered);
    }
    return v;
  }
  if (typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) continue;
      out[k] = deepRepairJsonStringsInValue(val);
    }
    return out;
  }
  return v;
};

/**
 * Validated JSON **text** for `$n::jsonb` parameters.
 *
 * ROOT CAUSE of PostgreSQL "invalid input syntax for type json" (22P02) on `::jsonb` casts:
 *   node-pg encodes raw JavaScript arrays using the PostgreSQL *array literal* format
 *   (e.g. `{"{\"name\":\"x\"}"}`), NOT JSON. When this text is then cast with `::jsonb`,
 *   PostgreSQL's JSON parser fails with:
 *     detail: 'Expected ":", but found "}".'
 *     where:  JSON data, line 1: ...reliability\":\"Reliable\"}"}
 *   Reproducible: `await pool.query('SELECT $1::jsonb', [[{a:1}]])` fails every time
 *   on pg >= 8.x. The fix is to serialize JSON ourselves and pass a **string**.
 *
 * This helper always returns a valid JSON text string (never a JS array/object), so
 * node-pg sends it as plain text to `$n::jsonb` where PostgreSQL parses it correctly.
 */
const serializeJsonbArrayForSql = (value) => {
  let arr = normalizeJsonArray(value);
  arr = deepRepairJsonStringsInValue(arr);
  try {
    const text = JSON.stringify(arr);
    JSON.parse(text); // sanity check: throws if text is somehow not valid JSON
    return text;
  } catch (e) {
    console.warn('[serializeJsonbArrayForSql] falling back to []:', e.message);
    return '[]';
  }
};

/**
 * Safe bind for `$n::jsonb` parameters. ALWAYS returns a `string`.
 * Defensive guard: even if a future caller somehow passes a non-array through,
 * we never hand node-pg a raw JS array/object for a jsonb column.
 */
const jsonbArrayParam = (value) => {
  const text = serializeJsonbArrayForSql(value);
  if (typeof text !== 'string') {
    // Should be impossible, but guarantee the invariant
    return '[]';
  }
  return text;
};

/** node-pg rejects `undefined` in query parameters — map to SQL NULL. */
const pgParam = (v) => (v === undefined ? null : v);

/**
 * `family_history` is normally free-text (TEXT). If the column is JSON/JSONB, plain prose
 * must be stored as a JSON string value. This normalizer always produces a value PostgreSQL accepts.
 */
const normalizeFamilyHistoryDb = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed);
  } catch {
    // Free-text narrative (TEXT column). If your DB has this column as JSON/JSONB instead, run:
    // Backend/database/migrations/adl_files_family_history_to_text.sql
    return trimmed;
  }
};

class ADLFile {
  /** Normalizes JSONB array columns (unwraps double-encoded JSON strings from some clients). */
  static normalizeJsonbArray(value) {
    return normalizeJsonArray(value);
  }

  constructor(data) {
    this.id = data.id;
    this.patient_id = data.patient_id;
    this.child_patient_id = data.child_patient_id;
    this.adl_no = data.adl_no;
    this.created_by = data.created_by;
    this.clinical_proforma_id = data.clinical_proforma_id;
    this.file_status = data.file_status;
    this.physical_file_location = data.physical_file_location;
    this.file_created_date = data.file_created_date;
    this.last_accessed_date = data.last_accessed_date;
    this.last_accessed_by = data.last_accessed_by;
    this.total_visits = data.total_visits;
    this.is_active = data.is_active;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    // Joined fields from patients table
    this.patient_name = data.patient_name || null;
    this.cr_no = data.cr_no;
    this.psy_no = data.psy_no;

    // Joined fields from users table
    this.created_by_name = data.created_by_name;
    this.created_by_role = data.created_by_role;
    this.last_accessed_by_name = data.last_accessed_by_name;

    // Joined fields from clinical_proforma table
    // assigned_doctor is the ID (integer), assigned_doctor_name and assigned_doctor_role come from users table JOIN
    this.assigned_doctor = data.assigned_doctor || null;
    this.assigned_doctor_name = data.assigned_doctor_name || null;
    this.assigned_doctor_role = data.assigned_doctor_role || null;
    this.proforma_visit_date = data.proforma_visit_date || null;

    // Complex Case Data Fields (stored in ADL file, not in clinical_proforma)
    // History of Present Illness (A–C combined) + section D treatment
    this.history_present_illness = data.history_present_illness;
    this.history_treatment_drugs = data.history_treatment_drugs;
    this.history_treatment_response = data.history_treatment_response;

    // Multiple Informants (JSONB)
    this.informants = data.informants ? (typeof data.informants === 'string' ? JSON.parse(data.informants) : data.informants) : [];

    // Complaints and Duration (JSONB)
    this.complaints_patient = data.complaints_patient ? (typeof data.complaints_patient === 'string' ? JSON.parse(data.complaints_patient) : data.complaints_patient) : [];
    this.complaints_informant = data.complaints_informant ? (typeof data.complaints_informant === 'string' ? JSON.parse(data.complaints_informant) : data.complaints_informant) : [];

    // Illness Details
    this.onset_duration = data.onset_duration;
    this.precipitating_factor = data.precipitating_factor;
    this.course = data.course;

    // Past History - Detailed
    this.past_history_medical = data.past_history_medical;
    this.past_history_psychiatric = data.past_history_psychiatric;

    // Family History - Detailed
    this.family_history_father_age = data.family_history_father_age;
    this.family_history_father_education = data.family_history_father_education;
    this.family_history_father_occupation = data.family_history_father_occupation;
    this.family_history_father_personality = data.family_history_father_personality;
    this.family_history_father_deceased = data.family_history_father_deceased || false;
    this.family_history_father_death_age = data.family_history_father_death_age;
    this.family_history_father_death_date = data.family_history_father_death_date;
    this.family_history_father_death_cause = data.family_history_father_death_cause;
    this.family_history_mother_age = data.family_history_mother_age;
    this.family_history_mother_education = data.family_history_mother_education;
    this.family_history_mother_occupation = data.family_history_mother_occupation;
    this.family_history_mother_personality = data.family_history_mother_personality;
    this.family_history_mother_deceased = data.family_history_mother_deceased || false;
    this.family_history_mother_death_age = data.family_history_mother_death_age;
    this.family_history_mother_death_date = data.family_history_mother_death_date;
    this.family_history_mother_death_cause = data.family_history_mother_death_cause;
    this.family_history_siblings = data.family_history_siblings ? (typeof data.family_history_siblings === 'string' ? JSON.parse(data.family_history_siblings) : data.family_history_siblings) : [];
    // Family History of Mental Illness
    this.family_history = data.family_history;

    // Diagnostic Formulation
    this.diagnostic_formulation_history = data.diagnostic_formulation_history;

    // Premorbid Personality
    this.premorbid_personality_history = data.premorbid_personality_history;

    // Physical Examination - Comprehensive
    this.physical_appearance = data.physical_appearance;
    this.physical_body_build = data.physical_body_build;
    this.physical_pallor = data.physical_pallor || false;
    this.physical_icterus = data.physical_icterus || false;
    this.physical_oedema = data.physical_oedema || false;
    this.physical_lymphadenopathy = data.physical_lymphadenopathy || false;
    this.physical_pulse = data.physical_pulse;
    this.physical_bp = data.physical_bp;
    this.physical_height = data.physical_height;
    this.physical_weight = data.physical_weight;
    this.physical_waist = data.physical_waist;
    this.physical_fundus = data.physical_fundus;
    this.physical_cvs_examination = data.physical_cvs_examination;
    this.physical_chest_examination = data.physical_chest_examination;
    this.physical_abdomen_examination = data.physical_abdomen_examination;
    this.physical_cns_cranial = data.physical_cns_cranial;
    this.physical_cns_motor_sensory = data.physical_cns_motor_sensory;
    this.physical_cns_rigidity = data.physical_cns_rigidity;
    this.physical_cns_involuntary = data.physical_cns_involuntary;
    this.physical_cns_superficial_reflexes = data.physical_cns_superficial_reflexes;
    this.physical_cns_dtrs = data.physical_cns_dtrs;
    this.physical_cns_plantar = data.physical_cns_plantar;
    this.physical_cns_cerebellar = data.physical_cns_cerebellar;

    // Mental Status Examination - Expanded
    this.mse_general_examination = data.mse_general_examination;
    this.mse_psychomotor_examination = data.mse_psychomotor_examination;
    this.mse_affect_examination = data.mse_affect_examination;
    this.mse_thought_flow = data.mse_thought_flow;
    this.mse_thought_form = data.mse_thought_form;
    this.mse_thought_content = data.mse_thought_content;
    this.mse_thought_possession = data.mse_thought_possession;
    this.mse_thought_perception = data.mse_thought_perception;
    this.mse_cognitive_consciousness = data.mse_cognitive_consciousness;
    this.mse_cognitive_orientation_time = data.mse_cognitive_orientation_time;
    this.mse_cognitive_orientation_place = data.mse_cognitive_orientation_place;
    this.mse_cognitive_orientation_person = data.mse_cognitive_orientation_person;
    this.mse_cognitive_memory_immediate = data.mse_cognitive_memory_immediate;
    this.mse_cognitive_memory_recent = data.mse_cognitive_memory_recent;
    this.mse_cognitive_memory_remote = data.mse_cognitive_memory_remote;
    this.mse_cognitive_subtraction = data.mse_cognitive_subtraction;
    this.mse_cognitive_digit_span = data.mse_cognitive_digit_span;
    this.mse_cognitive_counting = data.mse_cognitive_counting;
    this.mse_cognitive_general_knowledge = data.mse_cognitive_general_knowledge;
    this.mse_cognitive_calculation = data.mse_cognitive_calculation;
    this.mse_cognitive_similarities = data.mse_cognitive_similarities;
    this.mse_cognitive_proverbs = data.mse_cognitive_proverbs;
    this.mse_insight_examination = data.mse_insight_examination;

    // Educational History
    this.education_history = data.education_history;

    // Occupational History (JSONB)
    this.occupation_history = data.occupation_history;

    // Sexual and Marital History
    this.sexual_menarche_age = data.sexual_menarche_age;
    this.sexual_menarche_reaction = data.sexual_menarche_reaction;
    this.sexual_education = data.sexual_education;
    this.sexual_masturbation = data.sexual_masturbation;
    this.sexual_contact = data.sexual_contact;
    this.sexual_premarital_extramarital = data.sexual_premarital_extramarital;
    this.sexual_marriage_arranged = data.sexual_marriage_arranged;
    this.sexual_marriage_details = data.sexual_marriage_details;
    this.sexual_children = data.sexual_children ? (typeof data.sexual_children === 'string' ? JSON.parse(data.sexual_children) : data.sexual_children) : [];

    // Religion
    this.religion_history = data.religion_history;

    // Present Living Situation
    this.living_situation_history = data.living_situation_history;

    // General Home Situation and Early Development
    this.general_home_situation = data.general_home_situation;
    this.personal_birth_date = data.personal_birth_date;
    this.personal_birth_place = data.personal_birth_place;
    this.personal_delivery_type = data.personal_delivery_type;
    this.personal_complications_prenatal = data.personal_complications_prenatal;
    this.personal_complications_natal = data.personal_complications_natal;
    this.personal_complications_postnatal = data.personal_complications_postnatal;
    this.development_history = data.development_history;

    // Final assessment (provisional diagnosis, treatment plan, consultant comments)
    this.final_assessment_history = data.final_assessment_history;
  }

  // Static method to create ADL file with transaction support
  static async createWithTransaction(client, adlData) {
    // Sanitize date fields - convert empty strings to null for PostgreSQL date columns
    let sanitizedData = sanitizeDateFields(adlData);
    // Sanitize integer fields - convert empty strings to null for PostgreSQL integer columns
    sanitizedData = sanitizeIntegerFields(sanitizedData);
    // Normalize JSONB array fields to avoid invalid JSON
    sanitizedData = {
      ...sanitizedData,
      informants: normalizeJsonArray(sanitizedData.informants),
      complaints_patient: normalizeJsonArray(sanitizedData.complaints_patient),
      complaints_informant: normalizeJsonArray(sanitizedData.complaints_informant),
      family_history_siblings: normalizeJsonArray(sanitizedData.family_history_siblings),
      sexual_children: normalizeJsonArray(sanitizedData.sexual_children),
      family_history: normalizeFamilyHistoryDb(sanitizedData.family_history),
    };
    
    const {
      patient_id, child_patient_id, adl_no, created_by, clinical_proforma_id,
      file_status = 'created', file_created_date = new Date(), total_visits = 1,
      history_present_illness, history_treatment_drugs,
      history_treatment_response, informants, complaints_patient, complaints_informant,
      onset_duration, precipitating_factor, course,
      past_history_medical, past_history_psychiatric, family_history_father_age,
      family_history_father_education, family_history_father_occupation,
      family_history_father_personality, family_history_father_deceased,
      family_history_father_death_age, family_history_father_death_date,
      family_history_father_death_cause, family_history_mother_age,
      family_history_mother_education, family_history_mother_occupation,
      family_history_mother_personality, family_history_mother_deceased,
      family_history_mother_death_age, family_history_mother_death_date,
      family_history_mother_death_cause, family_history_siblings, family_history,
      diagnostic_formulation_history, premorbid_personality_history,
      physical_appearance, physical_body_build, physical_pallor, physical_icterus,
      physical_oedema, physical_lymphadenopathy, physical_pulse, physical_bp,
      physical_height, physical_weight, physical_waist, physical_fundus,
      physical_cvs_examination, physical_chest_examination, physical_abdomen_examination,
      physical_cns_cranial, physical_cns_motor_sensory,
      physical_cns_rigidity, physical_cns_involuntary, physical_cns_superficial_reflexes,
      physical_cns_dtrs, physical_cns_plantar, physical_cns_cerebellar,
      mse_general_examination, mse_psychomotor_examination, mse_affect_examination,
      mse_thought_flow, mse_thought_form,
      mse_thought_content, mse_thought_possession, mse_thought_perception, mse_cognitive_consciousness, mse_cognitive_orientation_time,
      mse_cognitive_orientation_place, mse_cognitive_orientation_person,
      mse_cognitive_memory_immediate, mse_cognitive_memory_recent,
      mse_cognitive_memory_remote, mse_cognitive_subtraction, mse_cognitive_digit_span,
      mse_cognitive_counting, mse_cognitive_general_knowledge, mse_cognitive_calculation,
      mse_cognitive_similarities, mse_cognitive_proverbs, mse_insight_examination,
      education_history,
      occupation_history, sexual_menarche_age, sexual_menarche_reaction, sexual_education,
      sexual_masturbation, sexual_contact, sexual_premarital_extramarital,
      sexual_marriage_arranged, sexual_marriage_details,
      sexual_children, religion_history, living_situation_history,
      general_home_situation, personal_birth_date,
      personal_birth_place, personal_delivery_type, personal_complications_prenatal,
      personal_complications_natal, personal_complications_postnatal,
      development_history,
      final_assessment_history
    } = sanitizedData;

    // Prepare ADL data for saving

    try {
    const result = await client.query(
      `INSERT INTO adl_files (
        patient_id, child_patient_id, adl_no, created_by, clinical_proforma_id, file_status, 
        file_created_date, total_visits, history_present_illness,
        history_treatment_drugs, history_treatment_response, informants, 
        complaints_patient, complaints_informant, onset_duration, precipitating_factor, course,
        past_history_medical,
        past_history_psychiatric, family_history_father_age, 
        family_history_father_education, family_history_father_occupation,
        family_history_father_personality, family_history_father_deceased, 
        family_history_father_death_age, family_history_father_death_date, 
        family_history_father_death_cause, family_history_mother_age, 
        family_history_mother_education, family_history_mother_occupation,
        family_history_mother_personality, family_history_mother_deceased, 
        family_history_mother_death_age, family_history_mother_death_date, 
        family_history_mother_death_cause, family_history_siblings, family_history,
        diagnostic_formulation_history, premorbid_personality_history, 
        physical_appearance, physical_body_build, physical_pallor, physical_icterus, 
        physical_oedema, physical_lymphadenopathy, physical_pulse, physical_bp, 
        physical_height, physical_weight, physical_waist, physical_fundus,
        physical_cvs_examination, physical_chest_examination, physical_abdomen_examination,
        physical_cns_cranial, physical_cns_motor_sensory, 
        physical_cns_rigidity, physical_cns_involuntary, physical_cns_superficial_reflexes, 
        physical_cns_dtrs, physical_cns_plantar, physical_cns_cerebellar,
        mse_general_examination, mse_psychomotor_examination, mse_affect_examination,
        mse_thought_flow, mse_thought_form, 
        mse_thought_content, mse_thought_possession, mse_thought_perception, mse_cognitive_consciousness, mse_cognitive_orientation_time, 
        mse_cognitive_orientation_place, mse_cognitive_orientation_person, 
        mse_cognitive_memory_immediate, mse_cognitive_memory_recent,
        mse_cognitive_memory_remote, mse_cognitive_subtraction, mse_cognitive_digit_span, 
        mse_cognitive_counting, mse_cognitive_general_knowledge, mse_cognitive_calculation, 
        mse_cognitive_similarities, mse_cognitive_proverbs, mse_insight_examination, 
        education_history, 
        occupation_history, sexual_menarche_age, sexual_menarche_reaction, sexual_education, 
        sexual_masturbation, sexual_contact, sexual_premarital_extramarital, 
        sexual_marriage_arranged, sexual_marriage_details,
        sexual_children, religion_history, living_situation_history, 
        general_home_situation, personal_birth_date, 
        personal_birth_place, personal_delivery_type, personal_complications_prenatal, 
        personal_complications_natal, personal_complications_postnatal,
        development_history, 
        final_assessment_history
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48,
        $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64,
        $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80,
        $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96,
        $97, $98, $99, $100, $101, $102, $103, $104, $105, $106, $107
      ) RETURNING *`,
      [
        patient_id || null, child_patient_id || null, adl_no, created_by || null, clinical_proforma_id || null, file_status,
        file_created_date, total_visits,
        history_present_illness || null,
        history_treatment_drugs || null,
        history_treatment_response || null,
          jsonbArrayParam(informants),
          jsonbArrayParam(complaints_patient),
          jsonbArrayParam(complaints_informant),
        onset_duration || null,
        precipitating_factor || null,
        course || null,
        past_history_medical || null,
        past_history_psychiatric || null,
          family_history_father_age,
          family_history_father_education,
          family_history_father_occupation,
          family_history_father_personality,
          family_history_father_deceased,
          family_history_father_death_age,
          family_history_father_death_date,
          family_history_father_death_cause,
          family_history_mother_age,
          family_history_mother_education,
          family_history_mother_occupation,
          family_history_mother_personality,
          family_history_mother_deceased,
          family_history_mother_death_age,
          family_history_mother_death_date,
          family_history_mother_death_cause,
          jsonbArrayParam(family_history_siblings),
          family_history,
          diagnostic_formulation_history || null,
          premorbid_personality_history || null,
          physical_appearance,
          physical_body_build,
          physical_pallor,
          physical_icterus,
          physical_oedema,
          physical_lymphadenopathy,
          physical_pulse,
          physical_bp,
          physical_height,
          physical_weight,
          physical_waist,
          physical_fundus,
          physical_cvs_examination || null,
          physical_chest_examination || null,
          physical_abdomen_examination || null,
          physical_cns_cranial,
          physical_cns_motor_sensory,
          physical_cns_rigidity,
          physical_cns_involuntary,
          physical_cns_superficial_reflexes,
          physical_cns_dtrs,
          physical_cns_plantar,
          physical_cns_cerebellar,
          mse_general_examination || null,
          mse_psychomotor_examination || null,
          mse_affect_examination || null,
          mse_thought_flow,
          mse_thought_form,
          mse_thought_content,
          mse_thought_possession,
          mse_thought_perception,
          mse_cognitive_consciousness,
          mse_cognitive_orientation_time,
          mse_cognitive_orientation_place,
          mse_cognitive_orientation_person,
          mse_cognitive_memory_immediate,
          mse_cognitive_memory_recent,
          mse_cognitive_memory_remote,
          mse_cognitive_subtraction,
          mse_cognitive_digit_span,
          mse_cognitive_counting,
          mse_cognitive_general_knowledge,
          mse_cognitive_calculation,
          mse_cognitive_similarities,
          mse_cognitive_proverbs,
          mse_insight_examination || null,
          education_history,
          occupation_history || null,
          sexual_menarche_age,
          sexual_menarche_reaction,
          sexual_education,
          sexual_masturbation,
          sexual_contact,
          sexual_premarital_extramarital,
          sexual_marriage_arranged || null,
          sexual_marriage_details || null,
          jsonbArrayParam(sexual_children),
          religion_history || null,
          living_situation_history || null,
          general_home_situation,
          personal_birth_date,
          personal_birth_place,
          personal_delivery_type,
          personal_complications_prenatal,
          personal_complications_natal,
          personal_complications_postnatal,
          development_history,
          final_assessment_history || null
        ].map(pgParam)
      );

      return new ADLFile(result.rows[0]);
    } catch (error) {
      console.error('ADLFile.create error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });

      if (error.message && error.message.includes('more expressions than target columns')) {
        throw new Error(`Database schema mismatch: The adl_files table is missing required columns. Please run the migration script: Backend/database/add_complex_case_columns_to_adl_files.sql. Original error: ${error.message}`);
      }

      if (error.message && error.message.includes('does not exist')) {
        throw new Error(`Database schema mismatch: Some columns are missing from the adl_files table. Please run the migration script: Backend/database/add_complex_case_columns_to_adl_files.sql. Original error: ${error.message}`);
      }

      throw error;
    }
  }

  static async create(adlData) {
    return ADLFile.createWithTransaction(db, adlData);
  }

  // Find ADL file by ID
  static async findById(id) {
    try {
      const hasChildPatientCol = await getAdlFilesHasChildPatientIdColumn();
      const childJoin = hasChildPatientCol
        ? 'LEFT JOIN child_patient_registrations cpr ON af.child_patient_id = cpr.id'
        : '';
      const patientNameSql = hasChildPatientCol
        ? 'COALESCE(p.name, cpr.child_name) as patient_name'
        : 'p.name as patient_name';
      const crNoSql = hasChildPatientCol
        ? 'COALESCE(p.cr_no, cpr.cr_number) as cr_no'
        : 'p.cr_no as cr_no';

      const result = await db.query(
        `SELECT af.*, 
                ${patientNameSql}, 
                ${crNoSql}, 
                COALESCE(p.psy_no, NULL) as psy_no, 
                u1.name as created_by_name, u1.role as created_by_role,
                u2.name as last_accessed_by_name
         FROM adl_files af
         LEFT JOIN registered_patient p ON af.patient_id = p.id
         ${childJoin}
         LEFT JOIN users u1 ON af.created_by = u1.id
         LEFT JOIN users u2 ON af.last_accessed_by = u2.id
         WHERE af.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new ADLFile(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find ADL file by ADL number
  static async findByADLNo(adl_no) {
    try {
      const result = await db.query(
        `SELECT af.*, p.name as patient_name, p.cr_no, p.psy_no, 
                u1.name as created_by_name, u1.role as created_by_role,
                u2.name as last_accessed_by_name
         FROM adl_files af
         LEFT JOIN registered_patient p ON af.patient_id = p.id
         LEFT JOIN users u1 ON af.created_by = u1.id
         LEFT JOIN users u2 ON af.last_accessed_by = u2.id
         WHERE af.adl_no = $1`,
        [adl_no]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new ADLFile(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find ADL file by patient ID (integer) - for adult patients
  static async findByPatientId(patient_id) {
    try {
      // Validate that patient_id is a valid integer
      const patientIdNum = parseInt(patient_id, 10);
      if (isNaN(patientIdNum) || patientIdNum <= 0) {
        console.error('[ADLFile.findByPatientId] Invalid patient_id:', patient_id);
        return [];
      }

      // Note: do not alias cp.id as clinical_proforma_id — af.* already includes
      // adl_files.clinical_proforma_id; a duplicate name can overwrite it with NULL when the JOIN misses.
      const query = `
        SELECT af.*, 
               p.name as patient_name, p.cr_no, p.psy_no, 
               u1.name as created_by_name, u1.role as created_by_role,
               u2.name as last_accessed_by_name,
               cp.assigned_doctor, cp.visit_date as proforma_visit_date,
               u3.name as assigned_doctor_name, u3.role as assigned_doctor_role
        FROM adl_files af
        LEFT JOIN registered_patient p ON af.patient_id = p.id
        LEFT JOIN users u1 ON af.created_by = u1.id
        LEFT JOIN users u2 ON af.last_accessed_by = u2.id
        LEFT JOIN clinical_proforma cp ON af.clinical_proforma_id = cp.id
        LEFT JOIN users u3 ON cp.assigned_doctor = u3.id
        WHERE af.patient_id = $1
        ORDER BY af.file_created_date DESC
      `;

      const result = await db.query(query, [patientIdNum]);

      console.log(`[ADLFile.findByPatientId] Found ${result.rows.length} ADL files for patient_id: ${patient_id}`);

      return result.rows.map(row => new ADLFile(row));
    } catch (error) {
      console.error('[ADLFile.findByPatientId] Error:', error);
      throw error;
    }
  }

  // Find ADL file by child patient ID (integer) - for child patients
  static async findByChildPatientId(child_patient_id) {
    try {
      // Validate that child_patient_id is a valid integer
      const childPatientIdNum = parseInt(child_patient_id, 10);
      if (isNaN(childPatientIdNum) || childPatientIdNum <= 0) {
        console.error('[ADLFile.findByChildPatientId] Invalid child_patient_id:', child_patient_id);
        return [];
      }

      if (!(await getAdlFilesHasChildPatientIdColumn())) {
        console.warn(
          '[ADLFile.findByChildPatientId] Column adl_files.child_patient_id is missing; run Backend/database/migrations/add_child_patient_id_to_adl_files.sql'
        );
        return [];
      }

      const query = `
        SELECT af.*, 
               cpr.child_name as patient_name, cpr.cr_number as cr_no, NULL as psy_no, 
               u1.name as created_by_name, u1.role as created_by_role,
               u2.name as last_accessed_by_name,
               NULL as assigned_doctor, NULL as proforma_visit_date,
               NULL as assigned_doctor_name, NULL as assigned_doctor_role,
               NULL as clinical_proforma_id
        FROM adl_files af
        LEFT JOIN child_patient_registrations cpr ON af.child_patient_id = cpr.id
        LEFT JOIN users u1 ON af.created_by = u1.id
        LEFT JOIN users u2 ON af.last_accessed_by = u2.id
        WHERE af.child_patient_id = $1
        ORDER BY af.file_created_date DESC
      `;

      const result = await db.query(query, [childPatientIdNum]);

      console.log(`[ADLFile.findByChildPatientId] Found ${result.rows.length} ADL files for child_patient_id: ${child_patient_id}`);

      return result.rows.map(row => new ADLFile(row));
    } catch (error) {
      console.error('[ADLFile.findByChildPatientId] Error:', error);
      throw error;
    }
  }

  // Find ADL file by clinical proforma ID
  static async findByClinicalProformaId(clinical_proforma_id) {
    try {
      const result = await db.query(
        `SELECT af.*, p.name as patient_name, p.cr_no, p.psy_no, 
                u1.name as created_by_name, u1.role as created_by_role,
                u2.name as last_accessed_by_name
         FROM adl_files af
         LEFT JOIN registered_patient p ON af.patient_id = p.id
         LEFT JOIN users u1 ON af.created_by = u1.id
         LEFT JOIN users u2 ON af.last_accessed_by = u2.id
         WHERE af.clinical_proforma_id = $1`,
        [clinical_proforma_id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new ADLFile(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Get all ADL files with pagination and filters
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT af.*, 
                p.name as patient_name, p.cr_no, p.psy_no,
                u1.name as created_by_name, u1.role as created_by_role,
                u2.name as last_accessed_by_name,
                cp.assigned_doctor, cp.visit_date as proforma_visit_date,
                u3.name as assigned_doctor_name, u3.role as assigned_doctor_role,
                cp.doctor_decision
        FROM adl_files af
        LEFT JOIN registered_patient p ON af.patient_id = p.id
        LEFT JOIN users u1 ON af.created_by = u1.id
        LEFT JOIN users u2 ON af.last_accessed_by = u2.id
        LEFT JOIN clinical_proforma cp ON af.clinical_proforma_id = cp.id
        LEFT JOIN users u3 ON cp.assigned_doctor = u3.id
        WHERE 1=1
      `;
      let countQuery = 'SELECT COUNT(*) FROM adl_files af WHERE 1=1';
      const params = [];
      let paramCount = 0;

      // By default, only show ADL files associated with complex cases
      if (filters.include_all !== true) {
        query += ` AND af.clinical_proforma_id IS NOT NULL AND cp.doctor_decision = 'complex_case'`;
        countQuery = `
          SELECT COUNT(*) FROM adl_files af
          LEFT JOIN clinical_proforma cp ON af.clinical_proforma_id = cp.id
          WHERE 1=1 AND af.clinical_proforma_id IS NOT NULL AND cp.doctor_decision = 'complex_case'
        `;
      }

      let finalCountParams = [];
      let countParamCounter = 0;

      if (filters.file_status) {
        paramCount++;
        query += ` AND af.file_status = $${paramCount}`;
        params.push(filters.file_status);

        countParamCounter++;
        countQuery += ` AND af.file_status = $${countParamCounter}`;
        finalCountParams.push(filters.file_status);
      }

      if (filters.is_active !== undefined) {
        paramCount++;
        query += ` AND af.is_active = $${paramCount}`;
        params.push(filters.is_active);

        countParamCounter++;
        countQuery += ` AND af.is_active = $${countParamCounter}`;
        finalCountParams.push(filters.is_active);
      }

      if (filters.created_by) {
        paramCount++;
        query += ` AND af.created_by = $${paramCount}`;
        params.push(filters.created_by);

        countParamCounter++;
        countQuery += ` AND af.created_by = $${countParamCounter}`;
        finalCountParams.push(filters.created_by);
      }

      if (filters.last_accessed_by) {
        paramCount++;
        query += ` AND af.last_accessed_by = $${paramCount}`;
        params.push(filters.last_accessed_by);

        countParamCounter++;
        countQuery += ` AND af.last_accessed_by = $${countParamCounter}`;
        finalCountParams.push(filters.last_accessed_by);
      }

      if (filters.date_from) {
        paramCount++;
        query += ` AND af.file_created_date >= $${paramCount}`;
        params.push(filters.date_from);

        countParamCounter++;
        countQuery += ` AND af.file_created_date >= $${countParamCounter}`;
        finalCountParams.push(filters.date_from);
      }

      if (filters.date_to) {
        paramCount++;
        query += ` AND af.file_created_date <= $${paramCount}`;
        params.push(filters.date_to);

        countParamCounter++;
        countQuery += ` AND af.file_created_date <= $${countParamCounter}`;
        finalCountParams.push(filters.date_to);
      }

      query += ` ORDER BY af.file_created_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const [filesResult, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, finalCountParams)
      ]);

      const files = filesResult.rows.map(row => new ADLFile(row));
      const total = parseInt(countResult.rows[0].count);

      return {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Update ADL file (including all complex case fields)
  async update(updateDataInput) {
    try {
      const updateData = sanitizeAdlRequestBody(updateDataInput);
      const allowedFields = [
        'file_status', 'physical_file_location', 'last_accessed_date',
        'last_accessed_by', 'total_visits', 'is_active', 'notes', 'clinical_proforma_id',
        'history_present_illness', 'history_treatment_drugs',
        'history_treatment_response', 'informants', 'complaints_patient', 'complaints_informant',
        'onset_duration', 'precipitating_factor', 'course',
        'past_history_medical', 'past_history_psychiatric', 'family_history_father_age',
        'family_history_father_education', 'family_history_father_occupation',
        'family_history_father_personality', 'family_history_father_deceased',
        'family_history_father_death_age', 'family_history_father_death_date',
        'family_history_father_death_cause', 'family_history_mother_age',
        'family_history_mother_education', 'family_history_mother_occupation',
        'family_history_mother_personality', 'family_history_mother_deceased',
        'family_history_mother_death_age', 'family_history_mother_death_date',
        'family_history_mother_death_cause', 'family_history_siblings', 'family_history',
        'diagnostic_formulation_history', 'premorbid_personality_history',
        'physical_appearance', 'physical_body_build', 'physical_pallor', 'physical_icterus',
        'physical_oedema', 'physical_lymphadenopathy', 'physical_pulse', 'physical_bp',
        'physical_height', 'physical_weight', 'physical_waist', 'physical_fundus',
        'physical_cvs_examination', 'physical_chest_examination', 'physical_abdomen_examination',
        'physical_cns_cranial', 'physical_cns_motor_sensory',
        'physical_cns_rigidity', 'physical_cns_involuntary', 'physical_cns_superficial_reflexes',
        'physical_cns_dtrs', 'physical_cns_plantar', 'physical_cns_cerebellar',
        'mse_general_examination', 'mse_psychomotor_examination', 'mse_affect_examination',
        'mse_thought_flow', 'mse_thought_form',
        'mse_thought_content', 'mse_thought_possession', 'mse_thought_perception',
        'mse_cognitive_consciousness', 'mse_cognitive_orientation_time',
        'mse_cognitive_orientation_place', 'mse_cognitive_orientation_person',
        'mse_cognitive_memory_immediate', 'mse_cognitive_memory_recent',
        'mse_cognitive_memory_remote', 'mse_cognitive_subtraction', 'mse_cognitive_digit_span',
        'mse_cognitive_counting', 'mse_cognitive_general_knowledge', 'mse_cognitive_calculation',
        'mse_cognitive_similarities', 'mse_cognitive_proverbs', 'mse_insight_examination',
        'education_history',
        'occupation_history', 'sexual_menarche_age', 'sexual_menarche_reaction', 'sexual_education',
        'sexual_masturbation', 'sexual_contact', 'sexual_premarital_extramarital',
        'sexual_marriage_arranged', 'sexual_marriage_details',
        'sexual_children', 'religion_history', 'living_situation_history',
        'general_home_situation', 'personal_birth_date',
        'personal_birth_place', 'personal_delivery_type', 'personal_complications_prenatal',
        'personal_complications_natal', 'personal_complications_postnatal',
        'development_history',
        'final_assessment_history'
      ];

      const updates = [];
      const values = [];
      let paramCount = 0;

      const jsonbFields = ['informants', 'complaints_patient', 'complaints_informant',
        'family_history_siblings',
        'sexual_children'];

      // Date fields that need sanitization (empty strings should become null)
      const dateFields = [
        'family_history_father_death_date', 'family_history_mother_death_date',
        'personal_birth_date', 'last_accessed_date'
      ];

      // Integer fields that need sanitization (empty strings should become null)
      const integerFields = [
        'family_history_father_age',
        'family_history_father_death_age',
        'family_history_mother_age',
        'family_history_mother_death_age',
      ];

      // Helper function to sanitize date fields
      const sanitizeDateField = (value) => {
        if (value === null || value === undefined || value === '') {
          return null;
        }
        // If it's already a Date object, convert to ISO string and extract date part
        if (value instanceof Date) {
          return value.toISOString().split('T')[0];
        }
        // If it's a string, coerce DD/MM/YYYY then validate YYYY-MM-DD
        if (typeof value === 'string') {
          const coerced = tryDdMmYyyyToYyyyMmDd(value.trim());
          const dateRegex = /^\d{4}-\d{2}-\d{2}/;
          if (dateRegex.test(coerced)) {
            return coerced.split('T')[0];
          }
          return null;
        }
        return value;
      };

      // Helper function to sanitize integer fields
      const sanitizeIntegerField = (value) => {
        if (value === '' || value === null || value === undefined) {
          return null;
        }
        // Try to parse as integer, if invalid, return null
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          return null;
        }
        return parsed;
      };

      // Helper function to safely stringify JSON arrays for database insertion
      const safeJsonStringify = (value) => {
        try {
          const normalized = normalizeJsonArray(value);
          const jsonString = JSON.stringify(normalized);
          // Validate the JSON string is valid by parsing it back
          JSON.parse(jsonString);
          return jsonString;
        } catch (e) {
          console.warn(`[safeJsonStringify] Failed to stringify value, using empty array:`, e.message);
          return '[]';
        }
      };

      // Normalize JSONB array fields up-front to avoid invalid JSON strings
      const normalizedUpdateData = {
        ...updateData,
        informants: normalizeJsonArray(updateData.informants),
        complaints_patient: normalizeJsonArray(updateData.complaints_patient),
        complaints_informant: normalizeJsonArray(updateData.complaints_informant),
        family_history_siblings: normalizeJsonArray(updateData.family_history_siblings),
        sexual_children: normalizeJsonArray(updateData.sexual_children),
      };

      for (const [key, value] of Object.entries(normalizedUpdateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          paramCount++;
          if (jsonbFields.includes(key)) {
            const jsonText = jsonbArrayParam(value);
            updates.push(`${key} = $${paramCount}::jsonb`);
            values.push(jsonText);
          } else if (key === 'family_history') {
            updates.push(`${key} = $${paramCount}`);
            values.push(normalizeFamilyHistoryDb(value));
          } else if (dateFields.includes(key)) {
            // Sanitize date fields - convert empty strings to null
            const sanitizedDate = sanitizeDateField(value);
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizedDate);
          } else if (integerFields.includes(key)) {
            // Sanitize integer fields - convert empty strings to null
            const sanitizedInteger = sanitizeIntegerField(value);
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizedInteger);
          } else {
            // For non-JSONB, non-date, non-integer fields, allow null and empty strings
            let finalValue = value === '' ? null : value;
            updates.push(`${key} = $${paramCount}`);
            values.push(finalValue);
          }
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      paramCount++;
      values.push(this.id);

      // Build the final query string and verify all parameter placeholders have $ prefix
      const updateQuery = `UPDATE adl_files SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      // Safety check: verify no bare numbers appear after = signs (which would indicate missing $ prefix)
      // Match patterns like "column = 5" (without $) but allow "column = $5" or "CURRENT_TIMESTAMP"
      const setClause = updateQuery.match(/SET\s+(.+?)\s+WHERE/is)?.[1] || '';
      const bareNumberAfterEquals = /=\s*(\d+)(?:\s|,|$)/g;
      const matches = [];
      let match;
      while ((match = bareNumberAfterEquals.exec(setClause)) !== null) {
        // Check if it's not CURRENT_TIMESTAMP or a parameter with $
        if (!setClause.substring(Math.max(0, match.index - 20), match.index).includes('CURRENT_TIMESTAMP') &&
          !setClause.substring(Math.max(0, match.index - 5), match.index).includes('$')) {
          matches.push(match[1]);
        }
      }

      if (matches.length > 0) {
        console.error('[ADLFile.update] CRITICAL: Found bare numbers after = signs (missing $ prefix):', matches);
        console.error('[ADLFile.update] Query:', updateQuery);
        console.error('[ADLFile.update] Updates array:', updates.slice(0, 10));
        throw new Error(`Invalid UPDATE query: Found bare number(s) "${matches.join(', ')}" without $ prefix after = sign. Parameter placeholders must start with $.`);
      }

      console.log(`[ADLFile.update] Executing UPDATE with ${updates.length} fields, params: ${values.length}`);
      console.log(`[ADLFile.update] Query preview: ${updateQuery.substring(0, 200)}...`);

      try {
        const result = await db.query(updateQuery, values.map(pgParam));

        if (result.rows.length > 0) {
          Object.assign(this, result.rows[0]);
        }

        return this;
      } catch (dbError) {
        // Enhanced error logging for debugging
        console.error('[ADLFile.update] Database query error:', dbError);
        console.error('[ADLFile.update] Query text:', updateQuery);
        console.error('[ADLFile.update] Updates count:', updates.length);
        console.error('[ADLFile.update] Values count:', values.length);
        console.error('[ADLFile.update] Sample updates:', updates.slice(0, 5));
        console.error('[ADLFile.update] Sample values:', values.slice(0, 5));

        // Check for the specific "public.5" table error
        if (dbError.message && dbError.message.includes('table') && dbError.message.includes('public')) {
          const tableMatch = dbError.message.match(/table\s+['"]?([^'"]+)['"]?/i);
          if (tableMatch && /^\d+$/.test(tableMatch[1])) {
            console.error(`[ADLFile.update] CRITICAL: Parameter number "${tableMatch[1]}" was interpreted as table name!`);
            console.error(`[ADLFile.update] This indicates a parameter placeholder is missing $ prefix in the query.`);
            console.error(`[ADLFile.update] Full query:`, updateQuery);
            throw new Error(`UPDATE query error: Parameter placeholder missing $ prefix. Number "${tableMatch[1]}" was interpreted as a table name. Please check that all parameters use $ prefix (e.g., $1, $2, etc.). Original error: ${dbError.message}`);
          }
        }

        throw dbError;
      }
    } catch (error) {
      console.error('[ADLFile.update] Outer error:', error);
      throw error;
    }
  }

  // Retrieve file (update status to retrieved)
  async retrieveFile(accessedBy) {
    try {
      await this.update({
        file_status: 'retrieved',
        last_accessed_date: new Date(),
        last_accessed_by: accessedBy
      });


      return this;
    } catch (error) {
      throw error;
    }
  }

  // Return file to storage
  async returnFile(returnedBy) {
    try {
      await this.update({
        file_status: 'stored',
        last_accessed_date: new Date(),
        last_accessed_by: returnedBy
      });


      return this;
    } catch (error) {
      throw error;
    }
  }

  // Archive file
  async archiveFile(archivedBy) {
    try {
      await this.update({
        file_status: 'archived',
        is_active: false,
        last_accessed_date: new Date(),
        last_accessed_by: archivedBy
      });


      return this;
    } catch (error) {
      throw error;
    }
  }

  // Log file movement

  // Get files that need to be retrieved
  static async getFilesToRetrieve() {
    try {
      const result = await db.query(
        `SELECT af.*, p.name as patient_name, p.cr_no, p.psy_no, 
                u1.name as created_by_name, u1.role as created_by_role
         FROM adl_files af
         LEFT JOIN registered_patient p ON af.patient_id = p.id
         LEFT JOIN users u1 ON af.created_by = u1.id
         WHERE af.file_status = 'stored' AND af.is_active = true
         ORDER BY af.file_created_date ASC`
      );

      return result.rows.map(row => new ADLFile(row));
    } catch (error) {
      throw error;
    }
  }

  // Get active files (currently retrieved)
  static async getActiveFiles() {
    try {
      const result = await db.query(
        `SELECT af.*, p.name as patient_name, p.cr_no, p.psy_no, 
                u1.name as created_by_name, u1.role as created_by_role,
                u2.name as last_accessed_by_name
         FROM adl_files af
         LEFT JOIN registered_patient p ON af.patient_id = p.id
         LEFT JOIN users u1 ON af.created_by = u1.id
         LEFT JOIN users u2 ON af.last_accessed_by = u2.id
         WHERE af.file_status = 'retrieved' AND af.is_active = true
         ORDER BY af.last_accessed_date ASC`
      );

      return result.rows.map(row => new ADLFile(row));
    } catch (error) {
      throw error;
    }
  }

  // Get ADL file statistics
  static async getStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_files,
          COUNT(CASE WHEN file_status = 'created' THEN 1 END) as created_files,
          COUNT(CASE WHEN file_status = 'stored' THEN 1 END) as stored_files,
          COUNT(CASE WHEN file_status = 'retrieved' THEN 1 END) as retrieved_files,
          COUNT(CASE WHEN file_status = 'archived' THEN 1 END) as archived_files,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_files,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_files,
          AVG(total_visits) as avg_visits_per_file
        FROM adl_files
      `);

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get files by status
  static async getFilesByStatus() {
    try {
      const result = await db.query(`
        SELECT 
          file_status,
          COUNT(*) as count
        FROM adl_files 
        WHERE file_status IS NOT NULL
        GROUP BY file_status
        ORDER BY count DESC
      `);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Delete ADL file (soft delete by archiving)
  async delete() {
    try {
      await this.update({
        file_status: 'archived',
        is_active: false,
        notes: this.notes ? `${this.notes}\n[DELETED]` : '[DELETED]'
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      patient_id: this.patient_id,
      child_patient_id: this.child_patient_id,
      adl_no: this.adl_no,
      created_by: this.created_by,
      clinical_proforma_id: this.clinical_proforma_id,
      file_status: this.file_status,
      physical_file_location: this.physical_file_location,
      file_created_date: this.file_created_date,
      last_accessed_date: this.last_accessed_date,
      last_accessed_by: this.last_accessed_by,
      total_visits: this.total_visits,
      is_active: this.is_active,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
      patient_name: this.patient_name,
      cr_no: this.cr_no,
      psy_no: this.psy_no,
      created_by_name: this.created_by_name,
      created_by_role: this.created_by_role,
      last_accessed_by_name: this.last_accessed_by_name,
      assigned_doctor: this.assigned_doctor,
      assigned_doctor_name: this.assigned_doctor_name,
      assigned_doctor_role: this.assigned_doctor_role,
      proforma_visit_date: this.proforma_visit_date,
      history_present_illness: this.history_present_illness,
      history_treatment_drugs: this.history_treatment_drugs,
      history_treatment_response: this.history_treatment_response,
      informants: this.informants,
      complaints_patient: this.complaints_patient,
      complaints_informant: this.complaints_informant,
      past_history_medical: this.past_history_medical,
      past_history_psychiatric: this.past_history_psychiatric,
      family_history_father_age: this.family_history_father_age,
      family_history_father_education: this.family_history_father_education,
      family_history_father_occupation: this.family_history_father_occupation,
      family_history_father_personality: this.family_history_father_personality,
      family_history_father_deceased: this.family_history_father_deceased,
      family_history_father_death_age: this.family_history_father_death_age,
      family_history_father_death_date: this.family_history_father_death_date,
      family_history_father_death_cause: this.family_history_father_death_cause,
      family_history_mother_age: this.family_history_mother_age,
      family_history_mother_education: this.family_history_mother_education,
      family_history_mother_occupation: this.family_history_mother_occupation,
      family_history_mother_personality: this.family_history_mother_personality,
      family_history_mother_deceased: this.family_history_mother_deceased,
      family_history_mother_death_age: this.family_history_mother_death_age,
      family_history_mother_death_date: this.family_history_mother_death_date,
      family_history_mother_death_cause: this.family_history_mother_death_cause,
      family_history_siblings: this.family_history_siblings,
      family_history: this.family_history,
      diagnostic_formulation_history: this.diagnostic_formulation_history,
      premorbid_personality_history: this.premorbid_personality_history,
      physical_appearance: this.physical_appearance,
      physical_body_build: this.physical_body_build,
      physical_pallor: this.physical_pallor,
      physical_icterus: this.physical_icterus,
      physical_oedema: this.physical_oedema,
      physical_lymphadenopathy: this.physical_lymphadenopathy,
      physical_pulse: this.physical_pulse,
      physical_bp: this.physical_bp,
      physical_height: this.physical_height,
      physical_weight: this.physical_weight,
      physical_waist: this.physical_waist,
      physical_fundus: this.physical_fundus,
      physical_cvs_examination: this.physical_cvs_examination,
      physical_chest_examination: this.physical_chest_examination,
      physical_abdomen_examination: this.physical_abdomen_examination,
      physical_cns_cranial: this.physical_cns_cranial,
      physical_cns_motor_sensory: this.physical_cns_motor_sensory,
      physical_cns_rigidity: this.physical_cns_rigidity,
      physical_cns_involuntary: this.physical_cns_involuntary,
      physical_cns_superficial_reflexes: this.physical_cns_superficial_reflexes,
      physical_cns_dtrs: this.physical_cns_dtrs,
      physical_cns_plantar: this.physical_cns_plantar,
      physical_cns_cerebellar: this.physical_cns_cerebellar,
      mse_general_examination: this.mse_general_examination,
      mse_psychomotor_examination: this.mse_psychomotor_examination,
      mse_affect_examination: this.mse_affect_examination,
      mse_thought_flow: this.mse_thought_flow,
      mse_thought_form: this.mse_thought_form,
      mse_thought_content: this.mse_thought_content,
      mse_thought_possession: this.mse_thought_possession,
      mse_thought_perception: this.mse_thought_perception,
      mse_cognitive_consciousness: this.mse_cognitive_consciousness,
      mse_cognitive_orientation_time: this.mse_cognitive_orientation_time,
      mse_cognitive_orientation_place: this.mse_cognitive_orientation_place,
      mse_cognitive_orientation_person: this.mse_cognitive_orientation_person,
      mse_cognitive_memory_immediate: this.mse_cognitive_memory_immediate,
      mse_cognitive_memory_recent: this.mse_cognitive_memory_recent,
      mse_cognitive_memory_remote: this.mse_cognitive_memory_remote,
      mse_cognitive_subtraction: this.mse_cognitive_subtraction,
      mse_cognitive_digit_span: this.mse_cognitive_digit_span,
      mse_cognitive_counting: this.mse_cognitive_counting,
      mse_cognitive_general_knowledge: this.mse_cognitive_general_knowledge,
      mse_cognitive_calculation: this.mse_cognitive_calculation,
      mse_cognitive_similarities: this.mse_cognitive_similarities,
      mse_cognitive_proverbs: this.mse_cognitive_proverbs,
      mse_insight_examination: this.mse_insight_examination,
      education_history: this.education_history,
      occupation_history: this.occupation_history,
      sexual_menarche_age: this.sexual_menarche_age,
      sexual_menarche_reaction: this.sexual_menarche_reaction,
      sexual_education: this.sexual_education,
      sexual_masturbation: this.sexual_masturbation,
      sexual_contact: this.sexual_contact,
      sexual_premarital_extramarital: this.sexual_premarital_extramarital,
      sexual_marriage_arranged: this.sexual_marriage_arranged,
      sexual_marriage_details: this.sexual_marriage_details,
      sexual_children: this.sexual_children,
      religion_history: this.religion_history,
      living_situation_history: this.living_situation_history,
      general_home_situation: this.general_home_situation,
      personal_birth_date: this.personal_birth_date,
      personal_birth_place: this.personal_birth_place,
      personal_delivery_type: this.personal_delivery_type,
      personal_complications_prenatal: this.personal_complications_prenatal,
      personal_complications_natal: this.personal_complications_natal,
      personal_complications_postnatal: this.personal_complications_postnatal,
      development_history: this.development_history,
      final_assessment_history: this.final_assessment_history,
    };
  }
}

module.exports = ADLFile;