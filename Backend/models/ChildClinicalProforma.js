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
    
    // SECTION A: BASIC INFORMATION
    this.child_name = data.child_name || null;
    this.age = data.age || null;
    this.sex = data.sex || null;
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.source_of_referral = data.source_of_referral || (Array.isArray(data.source_of_referral) ? data.source_of_referral : []);
    
    // SECTION B: DURATION OF ILLNESS
    this.duration_of_illness = data.duration_of_illness || null;
    
    // SECTION C: ONSET
    this.onset = data.onset || null;
    
    // SECTION D: COURSE
    this.course = data.course || null;
    
    // SECTION E: ASSOCIATED PHYSICAL ILLNESS
    this.has_physical_illness = data.has_physical_illness || false;
    this.physical_illness_specification = data.physical_illness_specification || null;
    
    // SECTION F: COMPLAINTS
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
    
    // SECTION G: EXAMINATION
    this.significant_physical_findings = data.significant_physical_findings || null;
    this.physical_development = data.physical_development || null;
    this.family_history = data.family_history || (Array.isArray(data.family_history) ? data.family_history : []);
    this.family_history_details = data.family_history_details || null;
    
    // SECTION H: DIAGNOSIS & INVESTIGATION
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
    
    // SECTION I: THERAPY SUGGESTED
    this.therapy_drugs = data.therapy_drugs || false;
    this.therapy_antiepileptics = data.therapy_antiepileptics || false;
    this.therapy_parental_counselling = data.therapy_parental_counselling || false;
    this.therapy_play_therapy = data.therapy_play_therapy || false;
    this.therapy_individual_psychotherapy = data.therapy_individual_psychotherapy || false;
    this.therapy_behavioral_therapy = data.therapy_behavioral_therapy || false;
    this.therapy_psychological_testing = data.therapy_psychological_testing || false;
    this.therapy_nil_evaluation_only = data.therapy_nil_evaluation_only || false;
    
    // SECTION J: DISPOSAL
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

  // Create a new child clinical proforma
  static async create(proformaData) {
    try {
      const {
        child_patient_id,
        filled_by,
        visit_date,
        room_no,
        assigned_doctor,
        child_name,
        age,
        sex,
        date,
        source_of_referral,
        duration_of_illness,
        onset,
        course,
        has_physical_illness,
        physical_illness_specification,
        // Complaints
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
        // Examination
        significant_physical_findings,
        physical_development,
        family_history,
        family_history_details,
        // Investigation
        investigation_detailed_medical_workup,
        investigation_social_family_assessment,
        investigation_school_related_evaluation,
        investigation_play_observation,
        investigation_neurology_consultation,
        investigation_paediatrics_consultation,
        investigation_ent_consultation,
        investigation_iq_testing,
        investigation_psychological_tests,
        remarks_provisional_diagnosis,
        // Therapy
        therapy_drugs, therapy_antiepileptics, therapy_parental_counselling,
        therapy_play_therapy, therapy_individual_psychotherapy,
        therapy_behavioral_therapy, therapy_psychological_testing,
        therapy_nil_evaluation_only,
        // Disposal
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
      
      // Convert source_of_referral and family_history arrays to PostgreSQL arrays
      const sourceOfReferralArray = Array.isArray(source_of_referral) 
        ? source_of_referral 
        : (source_of_referral ? [source_of_referral] : []);
      const familyHistoryArray = Array.isArray(family_history) 
        ? family_history 
        : (family_history ? [family_history] : []);

      // Helper function to sanitize date fields - convert empty strings to null
      const sanitizeDate = (dateValue) => {
        if (!dateValue || dateValue === '' || (typeof dateValue === 'string' && dateValue.trim() === '')) {
          return null;
        }
        return dateValue;
      };

      // Helper function to sanitize time fields - convert empty strings to null
      const sanitizeTime = (timeValue) => {
        if (!timeValue || timeValue === '' || (typeof timeValue === 'string' && timeValue.trim() === '')) {
          return null;
        }
        return timeValue;
      };

      const query = `
        INSERT INTO child_clinical_proforma (
          child_patient_id, filled_by, visit_date, room_no, assigned_doctor,
          child_name, age, sex, date, source_of_referral,
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
          significant_physical_findings, physical_development, family_history, family_history_details,
          investigation_detailed_medical_workup, investigation_social_family_assessment,
          investigation_school_related_evaluation, investigation_play_observation,
          investigation_neurology_consultation, investigation_paediatrics_consultation,
          investigation_ent_consultation, investigation_iq_testing,
          investigation_psychological_tests, remarks_provisional_diagnosis,
          therapy_drugs, therapy_antiepileptics, therapy_parental_counselling,
          therapy_play_therapy, therapy_individual_psychotherapy,
          therapy_behavioral_therapy, therapy_psychological_testing,
          therapy_nil_evaluation_only,
          disposal_status, disposal_reason, disposal_date, disposal_time,
          disposal_distance, disposal_remarks,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
          $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47,
          $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63,
          $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75
        ) RETURNING *
      `;

      // Helper function to sanitize text fields - convert empty strings to null, preserve actual values
      const sanitizeText = (textValue) => {
        if (textValue === undefined || textValue === null || textValue === '') {
          return null;
        }
        return String(textValue).trim() || null;
      };

      // Helper function to ensure boolean values are proper booleans
      const sanitizeBoolean = (boolValue) => {
        if (boolValue === undefined || boolValue === null || boolValue === '') {
          return false;
        }
        // Handle string representations
        if (typeof boolValue === 'string') {
          return boolValue.toLowerCase() === 'true' || boolValue === '1';
        }
        return Boolean(boolValue);
      };

      const result = await db.query(query, [
        child_patient_id, filled_by, sanitizeDate(visit_date) || new Date().toISOString().split('T')[0], 
        sanitizeText(room_no), assigned_doctor,
        sanitizeText(finalChildName), age ? parseInt(age) : null, sanitizeText(finalSex), sanitizeDate(date) || new Date().toISOString().split('T')[0],
        sourceOfReferralArray.length > 0 ? sourceOfReferralArray : null,
        sanitizeText(duration_of_illness), sanitizeText(onset), sanitizeText(course),
        sanitizeBoolean(has_physical_illness), sanitizeText(physical_illness_specification),
        sanitizeBoolean(complaints_obstinacy), sanitizeBoolean(complaints_disobedience),
        sanitizeBoolean(complaints_aggressiveness), sanitizeBoolean(complaints_temper_tantrums),
        sanitizeBoolean(complaints_hyperactivity), sanitizeBoolean(complaints_stealing),
        sanitizeBoolean(complaints_delinquent_behaviour), sanitizeBoolean(complaints_low_intelligence),
        sanitizeBoolean(complaints_scholastic_backwardness), sanitizeBoolean(complaints_poor_memory),
        sanitizeBoolean(complaints_speech_difficulty), sanitizeBoolean(complaints_hearing_difficulty),
        sanitizeBoolean(complaints_epileptic), sanitizeBoolean(complaints_non_epileptic),
        sanitizeBoolean(complaints_both), sanitizeBoolean(complaints_unclear),
        sanitizeBoolean(complaints_abnormal_behaviour), sanitizeBoolean(complaints_irrelevant_talking),
        sanitizeBoolean(complaints_withdrawnness), sanitizeBoolean(complaints_shyness),
        sanitizeBoolean(complaints_excessive_clinging), sanitizeBoolean(complaints_anxiety),
        sanitizeBoolean(complaints_depression), sanitizeBoolean(complaints_feeding_problems),
        sanitizeBoolean(complaints_neurosis), sanitizeBoolean(complaints_thumb_sucking),
        sanitizeBoolean(complaints_nail_biting), sanitizeBoolean(complaints_abnormal_movements),
        sanitizeBoolean(complaints_somatic_complaints), sanitizeBoolean(complaints_odd_behaviour),
        sanitizeBoolean(complaints_inadequate_personal_care),
        sanitizeText(significant_physical_findings), sanitizeText(physical_development),
        familyHistoryArray.length > 0 ? familyHistoryArray : null,
        sanitizeText(family_history_details),
        sanitizeBoolean(investigation_detailed_medical_workup),
        sanitizeBoolean(investigation_social_family_assessment),
        sanitizeBoolean(investigation_school_related_evaluation),
        sanitizeBoolean(investigation_play_observation),
        sanitizeBoolean(investigation_neurology_consultation),
        sanitizeBoolean(investigation_paediatrics_consultation),
        sanitizeBoolean(investigation_ent_consultation),
        sanitizeBoolean(investigation_iq_testing),
        sanitizeBoolean(investigation_psychological_tests),
        sanitizeText(remarks_provisional_diagnosis),
        sanitizeBoolean(therapy_drugs), sanitizeBoolean(therapy_antiepileptics),
        sanitizeBoolean(therapy_parental_counselling), sanitizeBoolean(therapy_play_therapy),
        sanitizeBoolean(therapy_individual_psychotherapy), sanitizeBoolean(therapy_behavioral_therapy),
        sanitizeBoolean(therapy_psychological_testing), sanitizeBoolean(therapy_nil_evaluation_only),
        sanitizeText(disposal_status), sanitizeText(disposal_reason), sanitizeDate(disposal_date), sanitizeTime(disposal_time),
        sanitizeText(disposal_distance), sanitizeText(disposal_remarks),
        sanitizeText(status) || 'draft'
      ]);

      return new ChildClinicalProforma(result.rows[0]);
    } catch (error) {
      console.error('[ChildClinicalProforma.create] Error:', error);
      throw error;
    }
  }

  // Find child clinical proforma by ID
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

  // Find child clinical proforma by child patient ID
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

  // Get all child clinical proformas with pagination and filters
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

  // Update child clinical proforma
  async update(updateData) {
    try {
      const allowedFields = [
        'visit_date', 'room_no', 'assigned_doctor',
        'child_name', 'age', 'sex', 'date', 'source_of_referral',
        'duration_of_illness', 'onset', 'course',
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
        'significant_physical_findings', 'physical_development', 'family_history', 'family_history_details',
        'investigation_detailed_medical_workup', 'investigation_social_family_assessment',
        'investigation_school_related_evaluation', 'investigation_play_observation',
        'investigation_neurology_consultation', 'investigation_paediatrics_consultation',
        'investigation_ent_consultation', 'investigation_iq_testing',
        'investigation_psychological_tests', 'remarks_provisional_diagnosis',
        'therapy_drugs', 'therapy_antiepileptics', 'therapy_parental_counselling',
        'therapy_play_therapy', 'therapy_individual_psychotherapy',
        'therapy_behavioral_therapy', 'therapy_psychological_testing',
        'therapy_nil_evaluation_only',
        'disposal_status', 'disposal_reason', 'disposal_date', 'disposal_time',
        'disposal_distance', 'disposal_remarks',
        'status'
      ];

      const updates = [];
      const values = [];
      let paramCount = 0;

      // Remove fields that should never be updated
      delete updateData.child_patient_id;
      delete updateData.id;
      delete updateData.filled_by;
      delete updateData.created_at;

      // Define boolean fields
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
        'therapy_behavioral_therapy', 'therapy_psychological_testing',
        'therapy_nil_evaluation_only'
      ];

      // Helper function to sanitize text fields
      const sanitizeText = (textValue) => {
        if (textValue === undefined || textValue === null || textValue === '') {
          return null;
        }
        return String(textValue).trim() || null;
      };

      // Helper function to sanitize boolean fields
      const sanitizeBoolean = (boolValue) => {
        if (boolValue === undefined || boolValue === null || boolValue === '') {
          return false;
        }
        if (typeof boolValue === 'string') {
          return boolValue.toLowerCase() === 'true' || boolValue === '1';
        }
        return Boolean(boolValue);
      };

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          paramCount++;
          
          if (key === 'source_of_referral' || key === 'family_history') {
            // Handle array fields
            const arrayValue = Array.isArray(value) 
              ? (value.length > 0 ? value : null)
              : (value ? [value] : null);
            updates.push(`${key} = $${paramCount}::text[]`);
            values.push(arrayValue);
          } else if (key === 'date' || key === 'visit_date' || key === 'disposal_date') {
            // Handle date fields
            const sanitizedDate = value === '' || (typeof value === 'string' && value.trim() === '') ? null : value;
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizedDate);
          } else if (key === 'disposal_time') {
            // Handle time fields
            const sanitizedTime = value === '' || (typeof value === 'string' && value.trim() === '') ? null : value;
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizedTime);
          } else if (key === 'age') {
            // Handle age as integer
            const ageValue = value === '' || value === null || value === undefined ? null : parseInt(value);
            updates.push(`${key} = $${paramCount}`);
            values.push(isNaN(ageValue) ? null : ageValue);
          } else if (booleanFields.includes(key)) {
            // Handle boolean fields - ensure they are proper booleans
            updates.push(`${key} = $${paramCount}`);
            values.push(sanitizeBoolean(value));
          } else {
            // Handle text fields - ensure they are strings, not booleans
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

  // Delete child clinical proforma
  async delete() {
    try {
      await db.query('DELETE FROM child_clinical_proforma WHERE id = $1', [this.id]);
      return true;
    } catch (error) {
      console.error('[ChildClinicalProforma.delete] Error:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      child_patient_id: this.child_patient_id,
      filled_by: this.filled_by,
      visit_date: this.visit_date,
      room_no: this.room_no,
      assigned_doctor: this.assigned_doctor,
      child_name: this.child_name,
      age: this.age,
      sex: this.sex,
      date: this.date,
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
      family_history: this.family_history,
      family_history_details: this.family_history_details,
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
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      child_patient_name: this.child_patient_name,
      cr_number: this.cr_number,
      cgc_number: this.cgc_number,
      doctor_name: this.doctor_name,
      doctor_role: this.doctor_role
    };
  }
}

module.exports = ChildClinicalProforma;
