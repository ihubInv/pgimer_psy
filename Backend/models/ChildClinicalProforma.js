// models/ChildClinicalProforma.js
const db = require('../config/database');
const ChildPatientRegistration = require('./ChildPatientRegistration');

class ChildClinicalProforma {
  constructor(data = {}) {
    this.id = data.id || null;
    this.child_patient_id = data.child_patient_id || null;
    this.filled_by = data.filled_by || null;
    this.visit_date = data.visit_date || null;
    this.room_no = data.room_no || null;
    this.assigned_doctor = data.assigned_doctor || null;
    
    // ─────────────────────────────────────────────────
    // SECTION 1: BASIC INFORMATION
    // ─────────────────────────────────────────────────
    this.child_name = data.child_name || null;
    this.age = data.age || null;
    this.sex = data.sex || null;
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.informant_relationship = data.informant_relationship || null;
    this.reliability = data.reliability || null;
    this.family_type = data.family_type || null;
    this.socioeconomic_status = data.socioeconomic_status || null;

    // ─────────────────────────────────────────────────
    // SECTION 2: SCHOOL INFORMATION
    // ─────────────────────────────────────────────────
    this.school_name = data.school_name || null;
    this.school_class = data.school_class || null;
    this.school_type = data.school_type || null;
    this.academic_performance = data.academic_performance || null;
    this.school_refusal = data.school_refusal || null;
    this.bullying = data.bullying || null;

    // ─────────────────────────────────────────────────
    // SECTION 3: PRESENTING COMPLAINTS
    // ─────────────────────────────────────────────────
    this.presenting_complaints = data.presenting_complaints || null;

    // ─────────────────────────────────────────────────
    // SECTION 4: NEURODEVELOPMENTAL CONCERNS
    // ─────────────────────────────────────────────────
    this.neurodevelopmental_concerns = Array.isArray(data.neurodevelopmental_concerns) ? data.neurodevelopmental_concerns : [];
    this.neurodevelopmental_description = data.neurodevelopmental_description || null;

    // ─────────────────────────────────────────────────
    // SECTION 5: BEHAVIORAL CONCERNS
    // ─────────────────────────────────────────────────
    this.behavioral_concerns = Array.isArray(data.behavioral_concerns) ? data.behavioral_concerns : [];
    this.behavioral_description = data.behavioral_description || null;

    // ─────────────────────────────────────────────────
    // SECTION 6: EMOTIONAL & PSYCHOLOGICAL SYMPTOMS
    // ─────────────────────────────────────────────────
    this.emotional_psychological_symptoms = Array.isArray(data.emotional_psychological_symptoms) ? data.emotional_psychological_symptoms : [];
    this.emotional_psychological_description = data.emotional_psychological_description || null;

    // ─────────────────────────────────────────────────
    // SECTION 7: TRAUMA & PSYCHOSOCIAL STRESSORS
    // ─────────────────────────────────────────────────
    this.trauma_psychosocial_stressors = Array.isArray(data.trauma_psychosocial_stressors) ? data.trauma_psychosocial_stressors : [];
    this.trauma_description = data.trauma_description || null;

    // ─────────────────────────────────────────────────
    // SECTION 8: MEDICAL & FAMILY HISTORY
    // ─────────────────────────────────────────────────
    this.associated_medical_illness = data.associated_medical_illness || null;
    this.developmental_history = data.developmental_history || null;
    this.family_history = Array.isArray(data.family_history) ? data.family_history : [];
    this.family_history_details = data.family_history_details || null; // legacy

    // ─────────────────────────────────────────────────
    // SECTION 9: RISK ASSESSMENT
    // ─────────────────────────────────────────────────
    this.risk_assessment = Array.isArray(data.risk_assessment) ? data.risk_assessment : [];

    // ─────────────────────────────────────────────────
    // SECTION 10: MENTAL STATUS EXAMINATION
    // ─────────────────────────────────────────────────
    this.mse_appearance_behaviour = data.mse_appearance_behaviour || null;
    this.mse_rapport = data.mse_rapport || null;
    this.mse_speech = data.mse_speech || null;
    this.mse_mood_affect = data.mse_mood_affect || null;
    this.mse_thought = data.mse_thought || null;
    this.mse_perception = data.mse_perception || null;
    this.mse_cognition = data.mse_cognition || null;
    this.mse_insight_judgment = data.mse_insight_judgment || null;

    // ─────────────────────────────────────────────────
    // SECTION 11: DIAGNOSIS & FORMULATION
    // ─────────────────────────────────────────────────
    this.provisional_diagnosis = data.provisional_diagnosis || null;

    // ─────────────────────────────────────────────────
    // SECTION 12: INVESTIGATIONS REQUIRED
    // ─────────────────────────────────────────────────
    this.investigations_required = Array.isArray(data.investigations_required) ? data.investigations_required : [];

    // ─────────────────────────────────────────────────
    // SECTION 13: TREATMENT PLAN
    // ─────────────────────────────────────────────────
    this.pharmacological_treatment = data.pharmacological_treatment || null;
    this.psychological_treatment = Array.isArray(data.psychological_treatment) ? data.psychological_treatment : [];
    this.high_risk_management = data.high_risk_management || null;

    // ─────────────────────────────────────────────────
    // SECTION 14: FOLLOW-UP & DISPOSAL
    // ─────────────────────────────────────────────────
    this.follow_up_after = data.follow_up_after || null;
    this.referred_to = data.referred_to || null;

    // ─────────────────────────────────────────────────
    // LEGACY FIELDS (Sections A–J, kept for backward compatibility)
    // ─────────────────────────────────────────────────
    this.source_of_referral = Array.isArray(data.source_of_referral) ? data.source_of_referral : [];
    this.duration_of_illness = data.duration_of_illness || null;
    this.onset = data.onset || null;
    this.course = data.course || null;
    this.has_physical_illness = data.has_physical_illness || false;
    this.physical_illness_specification = data.physical_illness_specification || null;
    
    // Legacy complaints (Section F)
    this.complaints_obstinacy = data.complaints_obstinacy || false;
    this.complaints_disobedience = data.complaints_disobedience || false;
    this.complaints_aggressiveness = data.complaints_aggressiveness || false;
    this.complaints_temper_tantrums = data.complaints_temper_tantrums || false;
    this.complaints_hyperactivity = data.complaints_hyperactivity || false;
    this.complaints_stealing = data.complaints_stealing || false;
    this.complaints_delinquent_behaviour = data.complaints_delinquent_behaviour || false;
    this.complaints_low_intelligence = data.complaints_low_intelligence || false;
    this.complaints_scholastic_backwardness = data.complaints_scholastic_backwardness || false;
    this.complaints_poor_memory = data.complaints_poor_memory || false;
    this.complaints_speech_difficulty = data.complaints_speech_difficulty || false;
    this.complaints_hearing_difficulty = data.complaints_hearing_difficulty || false;
    this.complaints_epileptic = data.complaints_epileptic || false;
    this.complaints_non_epileptic = data.complaints_non_epileptic || false;
    this.complaints_both = data.complaints_both || false;
    this.complaints_unclear = data.complaints_unclear || false;
    this.complaints_abnormal_behaviour = data.complaints_abnormal_behaviour || false;
    this.complaints_irrelevant_talking = data.complaints_irrelevant_talking || false;
    this.complaints_withdrawnness = data.complaints_withdrawnness || false;
    this.complaints_shyness = data.complaints_shyness || false;
    this.complaints_excessive_clinging = data.complaints_excessive_clinging || false;
    this.complaints_anxiety = data.complaints_anxiety || false;
    this.complaints_depression = data.complaints_depression || false;
    this.complaints_feeding_problems = data.complaints_feeding_problems || false;
    this.complaints_neurosis = data.complaints_neurosis || false;
    this.complaints_thumb_sucking = data.complaints_thumb_sucking || false;
    this.complaints_nail_biting = data.complaints_nail_biting || false;
    this.complaints_abnormal_movements = data.complaints_abnormal_movements || false;
    this.complaints_somatic_complaints = data.complaints_somatic_complaints || false;
    this.complaints_odd_behaviour = data.complaints_odd_behaviour || false;
    this.complaints_inadequate_personal_care = data.complaints_inadequate_personal_care || false;
    
    // Legacy examination (Section G)
    this.significant_physical_findings = data.significant_physical_findings || null;
    this.physical_development = data.physical_development || null;
    
    // Legacy investigation (Section H)
    this.investigation_detailed_medical_workup = data.investigation_detailed_medical_workup || false;
    this.investigation_social_family_assessment = data.investigation_social_family_assessment || false;
    this.investigation_school_related_evaluation = data.investigation_school_related_evaluation || false;
    this.investigation_play_observation = data.investigation_play_observation || false;
    this.investigation_neurology_consultation = data.investigation_neurology_consultation || false;
    this.investigation_paediatrics_consultation = data.investigation_paediatrics_consultation || false;
    this.investigation_ent_consultation = data.investigation_ent_consultation || false;
    this.investigation_iq_testing = data.investigation_iq_testing || false;
    this.investigation_psychological_tests = data.investigation_psychological_tests || false;
    this.remarks_provisional_diagnosis = data.remarks_provisional_diagnosis || null;
    
    // Legacy therapy (Section I)
    this.therapy_drugs = data.therapy_drugs || false;
    this.therapy_antiepileptics = data.therapy_antiepileptics || false;
    this.therapy_parental_counselling = data.therapy_parental_counselling || false;
    this.therapy_play_therapy = data.therapy_play_therapy || false;
    this.therapy_individual_psychotherapy = data.therapy_individual_psychotherapy || false;
    this.therapy_behavioral_therapy = data.therapy_behavioral_therapy || false;
    this.therapy_psychological_testing = data.therapy_psychological_testing || false;
    this.therapy_nil_evaluation_only = data.therapy_nil_evaluation_only || false;
    
    // Legacy disposal (Section J)
    this.disposal_status = data.disposal_status || null;
    this.disposal_reason = data.disposal_reason || null;
    this.disposal_date = data.disposal_date || null;
    this.disposal_time = data.disposal_time || null;
    this.disposal_distance = data.disposal_distance || null;
    this.disposal_remarks = data.disposal_remarks || null;
    
    // Status & Audit
    this.status = data.status || 'draft';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    
    // Joined fields from related tables
    this.child_patient_name = data.child_patient_name || null;
    this.cr_number = data.cr_number || null;
    this.cgc_number = data.cgc_number || null;
    this.doctor_name = data.doctor_name || null;
    this.doctor_role = data.doctor_role || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────
  static async create(proformaData) {
    try {
      const {
        child_patient_id,
        filled_by,
        visit_date,
        room_no,
        assigned_doctor,
        // Section 1
        child_name, age, sex, date,
        informant_relationship, reliability, family_type, socioeconomic_status,
        // Section 2
        school_name, school_class, school_type, academic_performance, school_refusal, bullying,
        // Section 3
        presenting_complaints,
        // Section 4
        neurodevelopmental_concerns, neurodevelopmental_description,
        // Section 5
        behavioral_concerns, behavioral_description,
        // Section 6
        emotional_psychological_symptoms, emotional_psychological_description,
        // Section 7
        trauma_psychosocial_stressors, trauma_description,
        // Section 8
        associated_medical_illness, developmental_history, family_history, family_history_details,
        // Section 9
        risk_assessment,
        // Section 10
        mse_appearance_behaviour, mse_rapport, mse_speech, mse_mood_affect,
        mse_thought, mse_perception, mse_cognition, mse_insight_judgment,
        // Section 11
        provisional_diagnosis,
        // Section 12
        investigations_required,
        // Section 13
        pharmacological_treatment, psychological_treatment, high_risk_management,
        // Section 14
        follow_up_after, referred_to,
        // Legacy fields
        source_of_referral, duration_of_illness, onset, course,
        has_physical_illness, physical_illness_specification,
        complaints_obstinacy, complaints_disobedience, complaints_aggressiveness,
        complaints_temper_tantrums, complaints_hyperactivity, complaints_stealing,
        complaints_delinquent_behaviour, complaints_low_intelligence,
        complaints_scholastic_backwardness, complaints_poor_memory,
        complaints_speech_difficulty, complaints_hearing_difficulty,
        complaints_epileptic, complaints_non_epileptic, complaints_both, complaints_unclear,
        complaints_abnormal_behaviour, complaints_irrelevant_talking,
        complaints_withdrawnness, complaints_shyness, complaints_excessive_clinging,
        complaints_anxiety, complaints_depression,
        complaints_feeding_problems, complaints_neurosis, complaints_thumb_sucking,
        complaints_nail_biting, complaints_abnormal_movements,
        complaints_somatic_complaints, complaints_odd_behaviour,
        complaints_inadequate_personal_care,
        significant_physical_findings, physical_development,
        investigation_detailed_medical_workup, investigation_social_family_assessment,
        investigation_school_related_evaluation, investigation_play_observation,
        investigation_neurology_consultation, investigation_paediatrics_consultation,
        investigation_ent_consultation, investigation_iq_testing,
        investigation_psychological_tests, remarks_provisional_diagnosis,
        therapy_drugs, therapy_antiepileptics, therapy_parental_counselling,
        therapy_play_therapy, therapy_individual_psychotherapy,
        therapy_behavioral_therapy, therapy_psychological_testing, therapy_nil_evaluation_only,
        disposal_status, disposal_reason, disposal_date, disposal_time,
        disposal_distance, disposal_remarks,
        status
      } = proformaData;

      // Check if child patient exists
      const childPatientCheck = await db.query(
        'SELECT id, child_name, sex, age_group FROM child_patient_registrations WHERE id = $1',
        [child_patient_id]
      );

      if (childPatientCheck.rows.length === 0) {
        throw new Error('Child patient not found');
      }

      const childPatient = childPatientCheck.rows[0];

      // Auto-fill from child patient registration if not provided
      const finalChildName = child_name || childPatient.child_name;
      const finalSex = sex || childPatient.sex;
      
      // Helper: sanitize text (empty string → null)
      const sanitizeText = (v) => {
        if (v === undefined || v === null || v === '') return null;
        return String(v).trim() || null;
      };
      
      // Helper: sanitize boolean
      const sanitizeBoolean = (v) => {
        if (v === undefined || v === null || v === '') return false;
        if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
        return Boolean(v);
      };

      // Helper: sanitize date (empty string → null)
      const sanitizeDate = (v) => {
        if (!v || v === '' || (typeof v === 'string' && v.trim() === '')) return null;
        return v;
      };

      // Helper: sanitize time (empty string → null)
      const sanitizeTime = (v) => {
        if (!v || v === '' || (typeof v === 'string' && v.trim() === '')) return null;
        return v;
      };

      // Helper: ensure array (null / string → array)
      const toArray = (v) => {
        if (Array.isArray(v)) return v.length > 0 ? v : null;
        if (v) return [v];
          return null;
      };

      const query = `
        INSERT INTO child_clinical_proforma (
          child_patient_id, filled_by, visit_date, room_no, assigned_doctor,
          child_name, age, sex, date,
          informant_relationship, reliability, family_type, socioeconomic_status,
          school_name, school_class, school_type, academic_performance, school_refusal, bullying,
          presenting_complaints,
          neurodevelopmental_concerns, neurodevelopmental_description,
          behavioral_concerns, behavioral_description,
          emotional_psychological_symptoms, emotional_psychological_description,
          trauma_psychosocial_stressors, trauma_description,
          associated_medical_illness, developmental_history, family_history, family_history_details,
          risk_assessment,
          mse_appearance_behaviour, mse_rapport, mse_speech, mse_mood_affect,
          mse_thought, mse_perception, mse_cognition, mse_insight_judgment,
          provisional_diagnosis,
          investigations_required,
          pharmacological_treatment, psychological_treatment, high_risk_management,
          follow_up_after, referred_to,
          source_of_referral,
          duration_of_illness, onset, course,
          has_physical_illness, physical_illness_specification,
          complaints_obstinacy, complaints_disobedience, complaints_aggressiveness,
          complaints_temper_tantrums, complaints_hyperactivity, complaints_stealing,
          complaints_delinquent_behaviour, complaints_low_intelligence,
          complaints_scholastic_backwardness, complaints_poor_memory,
          complaints_speech_difficulty, complaints_hearing_difficulty,
          complaints_epileptic, complaints_non_epileptic, complaints_both, complaints_unclear,
          complaints_abnormal_behaviour, complaints_irrelevant_talking,
          complaints_withdrawnness, complaints_shyness, complaints_excessive_clinging,
          complaints_anxiety, complaints_depression,
          complaints_feeding_problems, complaints_neurosis, complaints_thumb_sucking,
          complaints_nail_biting, complaints_abnormal_movements,
          complaints_somatic_complaints, complaints_odd_behaviour,
          complaints_inadequate_personal_care,
          significant_physical_findings, physical_development,
          investigation_detailed_medical_workup, investigation_social_family_assessment,
          investigation_school_related_evaluation, investigation_play_observation,
          investigation_neurology_consultation, investigation_paediatrics_consultation,
          investigation_ent_consultation, investigation_iq_testing,
          investigation_psychological_tests, remarks_provisional_diagnosis,
          therapy_drugs, therapy_antiepileptics, therapy_parental_counselling,
          therapy_play_therapy, therapy_individual_psychotherapy,
          therapy_behavioral_therapy, therapy_psychological_testing, therapy_nil_evaluation_only,
          disposal_status, disposal_reason, disposal_date, disposal_time,
          disposal_distance, disposal_remarks,
          status
        ) VALUES (
          $1,   $2,   $3,   $4,   $5,
          $6,   $7,   $8,   $9,
          $10,  $11,  $12,  $13,
          $14,  $15,  $16,  $17,  $18,  $19,
          $20,
          $21,  $22,
          $23,  $24,
          $25,  $26,
          $27,  $28,
          $29,  $30,  $31,  $32,
          $33,
          $34,  $35,  $36,  $37,
          $38,  $39,  $40,  $41,
          $42,
          $43,
          $44,  $45,  $46,
          $47,  $48,
          $49,
          $50,  $51,  $52,
          $53,  $54,
          $55,  $56,  $57,  $58,  $59,  $60,
          $61,  $62,  $63,  $64,  $65,  $66,
          $67,  $68,  $69,  $70,  $71,
          $72,  $73,
          $74,  $75,  $76,  $77,  $78,
          $79,  $80,  $81,
          $82,  $83,  $84,  $85,
          $86,  $87,  $88,  $89,  $90,  $91,
          $92,  $93,
          $94,  $95,  $96,  $97,  $98,
          $99,  $100, $101, $102,
          $103, $104, $105, $106,
          $107, $108, $109, $110,
          $111, $112
        ) RETURNING *
      `;

      const result = await db.query(query, [
        /* $1  */ child_patient_id,
        /* $2  */ filled_by,
        /* $3  */ sanitizeDate(visit_date) || new Date().toISOString().split('T')[0],
        /* $4  */ sanitizeText(room_no),
        /* $5  */ assigned_doctor,

        /* $6  */ sanitizeText(finalChildName),
        /* $7  */ age ? parseInt(age) : null,
        /* $8  */ sanitizeText(finalSex),
        /* $9  */ sanitizeDate(date) || new Date().toISOString().split('T')[0],

        /* $10 */ sanitizeText(informant_relationship),
        /* $11 */ sanitizeText(reliability),
        /* $12 */ sanitizeText(family_type),
        /* $13 */ sanitizeText(socioeconomic_status),

        /* $14 */ sanitizeText(school_name),
        /* $15 */ sanitizeText(school_class),
        /* $16 */ sanitizeText(school_type),
        /* $17 */ sanitizeText(academic_performance),
        /* $18 */ sanitizeText(school_refusal),
        /* $19 */ sanitizeText(bullying),

        /* $20 */ sanitizeText(presenting_complaints),

        /* $21 */ toArray(neurodevelopmental_concerns),
        /* $22 */ sanitizeText(neurodevelopmental_description),

        /* $23 */ toArray(behavioral_concerns),
        /* $24 */ sanitizeText(behavioral_description),

        /* $25 */ toArray(emotional_psychological_symptoms),
        /* $26 */ sanitizeText(emotional_psychological_description),

        /* $27 */ toArray(trauma_psychosocial_stressors),
        /* $28 */ sanitizeText(trauma_description),

        /* $29 */ sanitizeText(associated_medical_illness),
        /* $30 */ sanitizeText(developmental_history),
        /* $31 */ toArray(family_history),
        /* $32 */ sanitizeText(family_history_details),

        /* $33 */ toArray(risk_assessment),

        /* $34 */ sanitizeText(mse_appearance_behaviour),
        /* $35 */ sanitizeText(mse_rapport),
        /* $36 */ sanitizeText(mse_speech),
        /* $37 */ sanitizeText(mse_mood_affect),
        /* $38 */ sanitizeText(mse_thought),
        /* $39 */ sanitizeText(mse_perception),
        /* $40 */ sanitizeText(mse_cognition),
        /* $41 */ sanitizeText(mse_insight_judgment),

        /* $42 */ sanitizeText(provisional_diagnosis),

        /* $43 */ toArray(investigations_required),

        /* $44 */ sanitizeText(pharmacological_treatment),
        /* $45 */ toArray(psychological_treatment),
        /* $46 */ sanitizeText(high_risk_management),

        /* $47 */ sanitizeText(follow_up_after),
        /* $48 */ sanitizeText(referred_to),

        /* $49 */ toArray(source_of_referral),

        /* $50 */ sanitizeText(duration_of_illness),
        /* $51 */ sanitizeText(onset),
        /* $52 */ sanitizeText(course),

        /* $53 */ sanitizeBoolean(has_physical_illness),
        /* $54 */ sanitizeText(physical_illness_specification),

        /* $55 */ sanitizeBoolean(complaints_obstinacy),
        /* $56 */ sanitizeBoolean(complaints_disobedience),
        /* $57 */ sanitizeBoolean(complaints_aggressiveness),
        /* $58 */ sanitizeBoolean(complaints_temper_tantrums),
        /* $59 */ sanitizeBoolean(complaints_hyperactivity),
        /* $60 */ sanitizeBoolean(complaints_stealing),

        /* $61 */ sanitizeBoolean(complaints_delinquent_behaviour),
        /* $62 */ sanitizeBoolean(complaints_low_intelligence),
        /* $63 */ sanitizeBoolean(complaints_scholastic_backwardness),
        /* $64 */ sanitizeBoolean(complaints_poor_memory),
        /* $65 */ sanitizeBoolean(complaints_speech_difficulty),
        /* $66 */ sanitizeBoolean(complaints_hearing_difficulty),

        /* $67 */ sanitizeBoolean(complaints_epileptic),
        /* $68 */ sanitizeBoolean(complaints_non_epileptic),
        /* $69 */ sanitizeBoolean(complaints_both),
        /* $70 */ sanitizeBoolean(complaints_unclear),
        /* $71 */ sanitizeBoolean(complaints_abnormal_behaviour),

        /* $72 */ sanitizeBoolean(complaints_irrelevant_talking),
        /* $73 */ sanitizeBoolean(complaints_withdrawnness),

        /* $74 */ sanitizeBoolean(complaints_shyness),
        /* $75 */ sanitizeBoolean(complaints_excessive_clinging),
        /* $76 */ sanitizeBoolean(complaints_anxiety),
        /* $77 */ sanitizeBoolean(complaints_depression),
        /* $78 */ sanitizeBoolean(complaints_feeding_problems),

        /* $79 */ sanitizeBoolean(complaints_neurosis),
        /* $80 */ sanitizeBoolean(complaints_thumb_sucking),
        /* $81 */ sanitizeBoolean(complaints_nail_biting),

        /* $82 */ sanitizeBoolean(complaints_abnormal_movements),
        /* $83 */ sanitizeBoolean(complaints_somatic_complaints),
        /* $84 */ sanitizeBoolean(complaints_odd_behaviour),
        /* $85 */ sanitizeBoolean(complaints_inadequate_personal_care),

        /* $86 */ sanitizeText(significant_physical_findings),
        /* $87 */ sanitizeText(physical_development),

        /* $88 */ sanitizeBoolean(investigation_detailed_medical_workup),
        /* $89 */ sanitizeBoolean(investigation_social_family_assessment),
        /* $90 */ sanitizeBoolean(investigation_school_related_evaluation),
        /* $91 */ sanitizeBoolean(investigation_play_observation),
        /* $92 */ sanitizeBoolean(investigation_neurology_consultation),
        /* $93 */ sanitizeBoolean(investigation_paediatrics_consultation),

        /* $94  */ sanitizeBoolean(investigation_ent_consultation),
        /* $95  */ sanitizeBoolean(investigation_iq_testing),
        /* $96  */ sanitizeBoolean(investigation_psychological_tests),
        /* $97  */ sanitizeText(remarks_provisional_diagnosis),

        /* $98  */ sanitizeBoolean(therapy_drugs),
        /* $99  */ sanitizeBoolean(therapy_antiepileptics),
        /* $100 */ sanitizeBoolean(therapy_parental_counselling),
        /* $101 */ sanitizeBoolean(therapy_play_therapy),

        /* $102 */ sanitizeBoolean(therapy_individual_psychotherapy),
        /* $103 */ sanitizeBoolean(therapy_behavioral_therapy),
        /* $104 */ sanitizeBoolean(therapy_psychological_testing),
        /* $105 */ sanitizeBoolean(therapy_nil_evaluation_only),

        /* $106 */ sanitizeText(disposal_status),
        /* $107 */ sanitizeText(disposal_reason),
        /* $108 */ sanitizeDate(disposal_date),
        /* $109 */ sanitizeTime(disposal_time),
        /* $110 */ sanitizeText(disposal_distance),
        /* $111 */ sanitizeText(disposal_remarks),
        /* $112 */ sanitizeText(status) || 'draft',
      ]);

      return new ChildClinicalProforma(result.rows[0]);
    } catch (error) {
      console.error('[ChildClinicalProforma.create] Error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND BY ID
  // ─────────────────────────────────────────────────────────────────────────
  static async findById(id) {
    try {
      const proformaId = parseInt(id, 10);
      if (isNaN(proformaId) || proformaId <= 0) {
        console.error(`[ChildClinicalProforma.findById] ❌ Invalid integer ID: ${id}`);
        return null;
      }

      const query = `
        SELECT ccp.*, 
               cpr.child_name as child_patient_name, cpr.cr_number, cpr.cgc_number,
               u.name as doctor_name, u.role as doctor_role
        FROM child_clinical_proforma ccp
        LEFT JOIN child_patient_registrations cpr ON ccp.child_patient_id = cpr.id
        LEFT JOIN users u ON ccp.filled_by = u.id
        WHERE ccp.id = $1
      `;

      const result = await db.query(query, [proformaId]);

      if (result.rows.length === 0) {
        return null;
      }

      return new ChildClinicalProforma(result.rows[0]);
    } catch (error) {
      console.error('[ChildClinicalProforma.findById] Error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND BY CHILD PATIENT ID
  // ─────────────────────────────────────────────────────────────────────────
  static async findByChildPatientId(child_patient_id) {
    try {
      const childPatientIdNum = parseInt(child_patient_id, 10);
      if (isNaN(childPatientIdNum) || childPatientIdNum <= 0) {
        console.error(`[ChildClinicalProforma.findByChildPatientId] ❌ Invalid integer child_patient_id: ${child_patient_id}`);
        return [];
      }

      const query = `
        SELECT ccp.*, 
               cpr.child_name as child_patient_name, cpr.cr_number, cpr.cgc_number,
               u.name as doctor_name, u.role as doctor_role
        FROM child_clinical_proforma ccp
        LEFT JOIN child_patient_registrations cpr ON ccp.child_patient_id = cpr.id
        LEFT JOIN users u ON ccp.filled_by = u.id
        WHERE ccp.child_patient_id = $1
        ORDER BY ccp.visit_date DESC, ccp.created_at DESC
      `;

      const result = await db.query(query, [childPatientIdNum]);

      return result.rows.map(row => new ChildClinicalProforma(row));
    } catch (error) {
      console.error('[ChildClinicalProforma.findByChildPatientId] Error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND ALL (paginated)
  // ─────────────────────────────────────────────────────────────────────────
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const safeLimit = Math.min(limit, 1000);
      const whereConditions = [];
      const params = [];
      let paramIndex = 1;

      if (filters.child_patient_id) {
        whereConditions.push(`ccp.child_patient_id = $${paramIndex++}`);
        params.push(filters.child_patient_id);
      }
      if (filters.filled_by) {
        whereConditions.push(`ccp.filled_by = $${paramIndex++}`);
        params.push(filters.filled_by);
      }
      if (filters.visit_date) {
        whereConditions.push(`DATE(ccp.visit_date) = $${paramIndex++}::date`);
        params.push(filters.visit_date);
      }
      if (filters.status) {
        whereConditions.push(`ccp.status = $${paramIndex++}`);
        params.push(filters.status);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const query = `
        SELECT ccp.*, 
               cpr.child_name as child_patient_name, cpr.cr_number, cpr.cgc_number,
               u.name as doctor_name, u.role as doctor_role
        FROM child_clinical_proforma ccp
        LEFT JOIN child_patient_registrations cpr ON ccp.child_patient_id = cpr.id
        LEFT JOIN users u ON ccp.filled_by = u.id
        ${whereClause}
        ORDER BY ccp.visit_date DESC, ccp.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const countQuery = `
        SELECT COUNT(*) as cnt FROM child_clinical_proforma ccp
        ${whereClause}
      `;

      const [result, countResult] = await Promise.all([
        db.query(query, [...params, safeLimit, offset]),
        db.query(countQuery, params)
      ]);

      const proformas = result.rows.map(row => new ChildClinicalProforma(row));
      const total = parseInt(countResult.rows[0].cnt, 10);

      return {
        proformas,
        pagination: {
          page,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit)
        }
      };
    } catch (error) {
      console.error('[ChildClinicalProforma.findAll] Error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────
  async update(updateData) {
    try {
      const allowedFields = [
        'visit_date', 'room_no', 'assigned_doctor',
        // Section 1
        'child_name', 'age', 'sex', 'date',
        'informant_relationship', 'reliability', 'family_type', 'socioeconomic_status',
        // Section 2
        'school_name', 'school_class', 'school_type', 'academic_performance',
        'school_refusal', 'bullying',
        // Section 3
        'presenting_complaints',
        // Section 4
        'neurodevelopmental_concerns', 'neurodevelopmental_description',
        // Section 5
        'behavioral_concerns', 'behavioral_description',
        // Section 6
        'emotional_psychological_symptoms', 'emotional_psychological_description',
        // Section 7
        'trauma_psychosocial_stressors', 'trauma_description',
        // Section 8
        'associated_medical_illness', 'developmental_history',
        'family_history', 'family_history_details',
        // Section 9
        'risk_assessment',
        // Section 10
        'mse_appearance_behaviour', 'mse_rapport', 'mse_speech', 'mse_mood_affect',
        'mse_thought', 'mse_perception', 'mse_cognition', 'mse_insight_judgment',
        // Section 11
        'provisional_diagnosis',
        // Section 12
        'investigations_required',
        // Section 13
        'pharmacological_treatment', 'psychological_treatment', 'high_risk_management',
        // Section 14
        'follow_up_after', 'referred_to',
        // Legacy
        'source_of_referral', 'duration_of_illness', 'onset', 'course',
        'has_physical_illness', 'physical_illness_specification',
        'complaints_obstinacy', 'complaints_disobedience', 'complaints_aggressiveness',
        'complaints_temper_tantrums', 'complaints_hyperactivity', 'complaints_stealing',
        'complaints_delinquent_behaviour', 'complaints_low_intelligence',
        'complaints_scholastic_backwardness', 'complaints_poor_memory',
        'complaints_speech_difficulty', 'complaints_hearing_difficulty',
        'complaints_epileptic', 'complaints_non_epileptic', 'complaints_both', 'complaints_unclear',
        'complaints_abnormal_behaviour', 'complaints_irrelevant_talking',
        'complaints_withdrawnness', 'complaints_shyness', 'complaints_excessive_clinging',
        'complaints_anxiety', 'complaints_depression',
        'complaints_feeding_problems', 'complaints_neurosis', 'complaints_thumb_sucking',
        'complaints_nail_biting', 'complaints_abnormal_movements',
        'complaints_somatic_complaints', 'complaints_odd_behaviour',
        'complaints_inadequate_personal_care',
        'significant_physical_findings', 'physical_development',
        'investigation_detailed_medical_workup', 'investigation_social_family_assessment',
        'investigation_school_related_evaluation', 'investigation_play_observation',
        'investigation_neurology_consultation', 'investigation_paediatrics_consultation',
        'investigation_ent_consultation', 'investigation_iq_testing',
        'investigation_psychological_tests', 'remarks_provisional_diagnosis',
        'therapy_drugs', 'therapy_antiepileptics', 'therapy_parental_counselling',
        'therapy_play_therapy', 'therapy_individual_psychotherapy',
        'therapy_behavioral_therapy', 'therapy_psychological_testing', 'therapy_nil_evaluation_only',
        'disposal_status', 'disposal_reason', 'disposal_date', 'disposal_time',
        'disposal_distance', 'disposal_remarks',
        'status'
      ];

      // Array fields (TEXT[])
      const arrayFields = [
        'source_of_referral', 'family_history',
        'neurodevelopmental_concerns', 'behavioral_concerns',
        'emotional_psychological_symptoms', 'trauma_psychosocial_stressors',
        'risk_assessment', 'investigations_required', 'psychological_treatment',
      ];

      // Date fields
      const dateFields = ['date', 'visit_date', 'disposal_date'];

      // Time fields
      const timeFields = ['disposal_time'];

      // Boolean fields
      const booleanFields = [
        'has_physical_illness',
        'complaints_obstinacy', 'complaints_disobedience', 'complaints_aggressiveness',
        'complaints_temper_tantrums', 'complaints_hyperactivity', 'complaints_stealing',
        'complaints_delinquent_behaviour', 'complaints_low_intelligence',
        'complaints_scholastic_backwardness', 'complaints_poor_memory',
        'complaints_speech_difficulty', 'complaints_hearing_difficulty',
        'complaints_epileptic', 'complaints_non_epileptic', 'complaints_both', 'complaints_unclear',
        'complaints_abnormal_behaviour', 'complaints_irrelevant_talking',
        'complaints_withdrawnness', 'complaints_shyness', 'complaints_excessive_clinging',
        'complaints_anxiety', 'complaints_depression',
        'complaints_feeding_problems', 'complaints_neurosis', 'complaints_thumb_sucking',
        'complaints_nail_biting', 'complaints_abnormal_movements',
        'complaints_somatic_complaints', 'complaints_odd_behaviour',
        'complaints_inadequate_personal_care',
        'investigation_detailed_medical_workup', 'investigation_social_family_assessment',
        'investigation_school_related_evaluation', 'investigation_play_observation',
        'investigation_neurology_consultation', 'investigation_paediatrics_consultation',
        'investigation_ent_consultation', 'investigation_iq_testing',
        'investigation_psychological_tests',
        'therapy_drugs', 'therapy_antiepileptics', 'therapy_parental_counselling',
        'therapy_play_therapy', 'therapy_individual_psychotherapy',
        'therapy_behavioral_therapy', 'therapy_psychological_testing', 'therapy_nil_evaluation_only'
      ];

      const sanitizeText = (v) => {
        if (v === undefined || v === null || v === '') return null;
        return String(v).trim() || null;
      };

      const sanitizeBoolean = (v) => {
        if (v === undefined || v === null || v === '') return false;
        if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
        return Boolean(v);
      };

      const updates = [];
      const values = [];
      let paramCount = 0;

      // Remove fields that should never be updated
      delete updateData.child_patient_id;
      delete updateData.id;
      delete updateData.filled_by;
      delete updateData.created_at;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          paramCount++;
          
          if (arrayFields.includes(key)) {
            const arrayValue = Array.isArray(value) 
              ? (value.length > 0 ? value : null)
              : (value ? [value] : null);
            updates.push(`${key} = $${paramCount}::text[]`);
            values.push(arrayValue);
          } else if (dateFields.includes(key)) {
            const sanitizedDate = (value === '' || (typeof value === 'string' && value.trim() === '')) ? null : value;
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizedDate);
          } else if (timeFields.includes(key)) {
            const sanitizedTime = (value === '' || (typeof value === 'string' && value.trim() === '')) ? null : value;
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizedTime);
          } else if (key === 'age') {
            const ageValue = (value === '' || value === null || value === undefined) ? null : parseInt(value);
            updates.push(`${key} = $${paramCount}`);
            values.push(isNaN(ageValue) ? null : ageValue);
          } else if (booleanFields.includes(key)) {
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizeBoolean(value));
          } else {
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizeText(value));
          }
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      paramCount++;
      values.push(this.id);
      updates.push('updated_at = CURRENT_TIMESTAMP');

      const result = await db.query(
        `UPDATE child_clinical_proforma SET ${updates.join(', ')} 
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }

      return this;
    } catch (error) {
      console.error('[ChildClinicalProforma.update] Error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────────
  async delete() {
    try {
      await db.query('DELETE FROM child_clinical_proforma WHERE id = $1', [this.id]);
      return true;
    } catch (error) {
      console.error('[ChildClinicalProforma.delete] Error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TO JSON
  // ─────────────────────────────────────────────────────────────────────────
  toJSON() {
    return {
      id: this.id,
      child_patient_id: this.child_patient_id,
      filled_by: this.filled_by,
      visit_date: this.visit_date,
      room_no: this.room_no,
      assigned_doctor: this.assigned_doctor,

      // Section 1
      child_name: this.child_name,
      age: this.age,
      sex: this.sex,
      date: this.date,
      informant_relationship: this.informant_relationship,
      reliability: this.reliability,
      family_type: this.family_type,
      socioeconomic_status: this.socioeconomic_status,

      // Section 2
      school_name: this.school_name,
      school_class: this.school_class,
      school_type: this.school_type,
      academic_performance: this.academic_performance,
      school_refusal: this.school_refusal,
      bullying: this.bullying,

      // Section 3
      presenting_complaints: this.presenting_complaints,

      // Section 4
      neurodevelopmental_concerns: this.neurodevelopmental_concerns,
      neurodevelopmental_description: this.neurodevelopmental_description,

      // Section 5
      behavioral_concerns: this.behavioral_concerns,
      behavioral_description: this.behavioral_description,

      // Section 6
      emotional_psychological_symptoms: this.emotional_psychological_symptoms,
      emotional_psychological_description: this.emotional_psychological_description,

      // Section 7
      trauma_psychosocial_stressors: this.trauma_psychosocial_stressors,
      trauma_description: this.trauma_description,

      // Section 8
      associated_medical_illness: this.associated_medical_illness,
      developmental_history: this.developmental_history,
      family_history: this.family_history,
      family_history_details: this.family_history_details,

      // Section 9
      risk_assessment: this.risk_assessment,

      // Section 10
      mse_appearance_behaviour: this.mse_appearance_behaviour,
      mse_rapport: this.mse_rapport,
      mse_speech: this.mse_speech,
      mse_mood_affect: this.mse_mood_affect,
      mse_thought: this.mse_thought,
      mse_perception: this.mse_perception,
      mse_cognition: this.mse_cognition,
      mse_insight_judgment: this.mse_insight_judgment,

      // Section 11
      provisional_diagnosis: this.provisional_diagnosis,

      // Section 12
      investigations_required: this.investigations_required,

      // Section 13
      pharmacological_treatment: this.pharmacological_treatment,
      psychological_treatment: this.psychological_treatment,
      high_risk_management: this.high_risk_management,

      // Section 14
      follow_up_after: this.follow_up_after,
      referred_to: this.referred_to,

      // Legacy fields
      source_of_referral: this.source_of_referral,
      duration_of_illness: this.duration_of_illness,
      onset: this.onset,
      course: this.course,
      has_physical_illness: this.has_physical_illness,
      physical_illness_specification: this.physical_illness_specification,
      complaints_obstinacy: this.complaints_obstinacy,
      complaints_disobedience: this.complaints_disobedience,
      complaints_aggressiveness: this.complaints_aggressiveness,
      complaints_temper_tantrums: this.complaints_temper_tantrums,
      complaints_hyperactivity: this.complaints_hyperactivity,
      complaints_stealing: this.complaints_stealing,
      complaints_delinquent_behaviour: this.complaints_delinquent_behaviour,
      complaints_low_intelligence: this.complaints_low_intelligence,
      complaints_scholastic_backwardness: this.complaints_scholastic_backwardness,
      complaints_poor_memory: this.complaints_poor_memory,
      complaints_speech_difficulty: this.complaints_speech_difficulty,
      complaints_hearing_difficulty: this.complaints_hearing_difficulty,
      complaints_epileptic: this.complaints_epileptic,
      complaints_non_epileptic: this.complaints_non_epileptic,
      complaints_both: this.complaints_both,
      complaints_unclear: this.complaints_unclear,
      complaints_abnormal_behaviour: this.complaints_abnormal_behaviour,
      complaints_irrelevant_talking: this.complaints_irrelevant_talking,
      complaints_withdrawnness: this.complaints_withdrawnness,
      complaints_shyness: this.complaints_shyness,
      complaints_excessive_clinging: this.complaints_excessive_clinging,
      complaints_anxiety: this.complaints_anxiety,
      complaints_depression: this.complaints_depression,
      complaints_feeding_problems: this.complaints_feeding_problems,
      complaints_neurosis: this.complaints_neurosis,
      complaints_thumb_sucking: this.complaints_thumb_sucking,
      complaints_nail_biting: this.complaints_nail_biting,
      complaints_abnormal_movements: this.complaints_abnormal_movements,
      complaints_somatic_complaints: this.complaints_somatic_complaints,
      complaints_odd_behaviour: this.complaints_odd_behaviour,
      complaints_inadequate_personal_care: this.complaints_inadequate_personal_care,
      significant_physical_findings: this.significant_physical_findings,
      physical_development: this.physical_development,
      investigation_detailed_medical_workup: this.investigation_detailed_medical_workup,
      investigation_social_family_assessment: this.investigation_social_family_assessment,
      investigation_school_related_evaluation: this.investigation_school_related_evaluation,
      investigation_play_observation: this.investigation_play_observation,
      investigation_neurology_consultation: this.investigation_neurology_consultation,
      investigation_paediatrics_consultation: this.investigation_paediatrics_consultation,
      investigation_ent_consultation: this.investigation_ent_consultation,
      investigation_iq_testing: this.investigation_iq_testing,
      investigation_psychological_tests: this.investigation_psychological_tests,
      remarks_provisional_diagnosis: this.remarks_provisional_diagnosis,
      therapy_drugs: this.therapy_drugs,
      therapy_antiepileptics: this.therapy_antiepileptics,
      therapy_parental_counselling: this.therapy_parental_counselling,
      therapy_play_therapy: this.therapy_play_therapy,
      therapy_individual_psychotherapy: this.therapy_individual_psychotherapy,
      therapy_behavioral_therapy: this.therapy_behavioral_therapy,
      therapy_psychological_testing: this.therapy_psychological_testing,
      therapy_nil_evaluation_only: this.therapy_nil_evaluation_only,
      disposal_status: this.disposal_status,
      disposal_reason: this.disposal_reason,
      disposal_date: this.disposal_date,
      disposal_time: this.disposal_time,
      disposal_distance: this.disposal_distance,
      disposal_remarks: this.disposal_remarks,

      // Audit
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,

      // Joined fields
      child_patient_name: this.child_patient_name,
      cr_number: this.cr_number,
      cgc_number: this.cgc_number,
      doctor_name: this.doctor_name,
      doctor_role: this.doctor_role
    };
  }
}

module.exports = ChildClinicalProforma;
