const db = require('../config/database');

/**
 * Model for child_cap_detailed_workup table.
 * Handles the Child & Adolescent Psychiatry CAP Detailed Work-up Record.
 */
class ChildCapWorkup {
  constructor(data) {
    this.id = data.id;
    this.child_patient_id = data.child_patient_id;
    this.workup_date = data.workup_date;
    this.cap_no = data.cap_no;
    this.patient_name = data.patient_name;
    this.age = data.age;
    this.date_of_birth = data.date_of_birth;
    this.gender = data.gender;
    this.education = data.education;
    this.school_type = data.school_type;
    this.referred_by = data.referred_by;
    this.reason_referral_present_consultation = data.reason_referral_present_consultation;
    this.informants = this._parseJsonb(data.informants, []);
    this.information_reliability_adequacy = data.information_reliability_adequacy;
    this.chief_complaints_course = this._parseJsonb(data.chief_complaints_course, []);

    // HPI
    this.hpi_developmental_history_symptoms = data.hpi_developmental_history_symptoms;
    this.hpi_symptoms_impairment_developmental_age = data.hpi_symptoms_impairment_developmental_age;
    this.hpi_behavioral_symptom_factors = data.hpi_behavioral_symptom_factors;
    this.hpi_phenomenology_symptoms = data.hpi_phenomenology_symptoms;
    this.hpi_adolescent_biological_enquiry = data.hpi_adolescent_biological_enquiry;
    this.hpi_sensory_impairments = data.hpi_sensory_impairments;
    this.hpi_comorbid_physical_illness = data.hpi_comorbid_physical_illness;
    this.hpi_treatment_history = data.hpi_treatment_history;
    this.hpi_continued = data.hpi_continued;
    this.relevant_negative_history = data.relevant_negative_history;
    this.functioning_overall_assessment = data.functioning_overall_assessment;
    this.impairment_severity = data.impairment_severity;

    // Treatment History
    this.treatment_who_initiated_first_contact = data.treatment_who_initiated_first_contact;
    this.treatment_first_contact_due_to = data.treatment_first_contact_due_to;
    this.treatment_first_contact_due_to_other = data.treatment_first_contact_due_to_other;
    this.treatment_history_chart = this._parseJsonb(data.treatment_history_chart, []);

    // Past Psychiatric / Medical / Family / Life Chart
    this.past_psychiatric_history = data.past_psychiatric_history;
    this.medical_history_details = data.medical_history_details;
    this.medical_enquiry_epilepsy = data.medical_enquiry_epilepsy;
    this.medical_enquiry_syncope = data.medical_enquiry_syncope;
    this.medical_enquiry_exercise_intolerance = data.medical_enquiry_exercise_intolerance;
    this.medical_enquiry_cardiac_ailment = data.medical_enquiry_cardiac_ailment;
    this.family_history_details = data.family_history_details;
    this.family_history_epilepsy = data.family_history_epilepsy;
    this.family_history_sudden_cardiac_death = data.family_history_sudden_cardiac_death;
    this.family_pedigree_description = data.family_pedigree_description;
    this.family_consanguinity = data.family_consanguinity;
    this.family_previous_abortions_stillbirths = data.family_previous_abortions_stillbirths;
    this.life_chart_details = data.life_chart_details;
    this.life_chart_psychiatric_past_present = data.life_chart_psychiatric_past_present;
    this.life_chart_physical_comorbidities_treatment = data.life_chart_physical_comorbidities_treatment;
    this.life_chart_relation_physical_psychiatric = data.life_chart_relation_physical_psychiatric;

    // Ante-natal
    this.ante_natal_pregnancy_planned = data.ante_natal_pregnancy_planned;
    this.ante_natal_pregnancy_wanted = data.ante_natal_pregnancy_wanted;
    this.ante_natal_pregnancy_unwanted_reason = data.ante_natal_pregnancy_unwanted_reason;
    this.ante_natal_conception_method = data.ante_natal_conception_method;
    this.ante_natal_preconception_folate = data.ante_natal_preconception_folate;
    this.ante_natal_preconception_folate_months = data.ante_natal_preconception_folate_months;
    this.ante_natal_nutritional_status_mother = data.ante_natal_nutritional_status_mother;
    this.ante_natal_medical_illness_treatment = data.ante_natal_medical_illness_treatment;
    this.ante_natal_other_medical_surgery = data.ante_natal_other_medical_surgery;
    this.ante_natal_hyperemesis = data.ante_natal_hyperemesis;
    this.ante_natal_fever_first_trimester = data.ante_natal_fever_first_trimester;
    this.ante_natal_xray_exposure = data.ante_natal_xray_exposure;
    this.ante_natal_drug_intake_non_supplement = data.ante_natal_drug_intake_non_supplement;
    this.ante_natal_psychotropic_use = data.ante_natal_psychotropic_use;
    this.ante_natal_alcohol_tobacco = data.ante_natal_alcohol_tobacco;
    this.ante_natal_antenatal_visits = data.ante_natal_antenatal_visits;
    this.ante_natal_immunization = data.ante_natal_immunization;
    this.ante_natal_usg = data.ante_natal_usg;
    this.ante_natal_special_procedures = data.ante_natal_special_procedures;
    this.ante_natal_attempted_abortion = data.ante_natal_attempted_abortion;
    this.ante_natal_rh_incompatibility = data.ante_natal_rh_incompatibility;
    this.ante_natal_single_or_twin = data.ante_natal_single_or_twin;
    this.ante_natal_threatened_abortion_bleeding_pv = data.ante_natal_threatened_abortion_bleeding_pv;
    this.ante_natal_preeclampsia_eclampsia = data.ante_natal_preeclampsia_eclampsia;
    this.ante_natal_foetal_movements = data.ante_natal_foetal_movements;
    this.ante_natal_other_significant_history = data.ante_natal_other_significant_history;
    this.ante_natal_mother_age_conception = data.ante_natal_mother_age_conception;
    this.ante_natal_father_age_conception = data.ante_natal_father_age_conception;

    // Natal
    this.natal_gestational_age_weeks = data.natal_gestational_age_weeks;
    this.natal_delivery_location = data.natal_delivery_location;
    this.natal_delivery_term = data.natal_delivery_term;
    this.natal_delivery_method = data.natal_delivery_method;
    this.natal_delivery_method_reason = data.natal_delivery_method_reason;
    this.natal_abnormal_presentation = data.natal_abnormal_presentation;
    this.natal_large_head = data.natal_large_head;
    this.natal_low_placenta = data.natal_low_placenta;
    this.natal_prolapsed_cord = data.natal_prolapsed_cord;
    this.natal_cord_around_neck = data.natal_cord_around_neck;
    this.natal_foetal_distress = data.natal_foetal_distress;
    this.natal_prolonged_labour = data.natal_prolonged_labour;
    this.natal_prom = data.natal_prom;
    this.natal_non_progress_labour = data.natal_non_progress_labour;
    this.natal_meconium_stained = data.natal_meconium_stained;
    this.natal_eclampsia = data.natal_eclampsia;
    this.natal_excessive_bleeding_pph = data.natal_excessive_bleeding_pph;
    this.natal_infections = data.natal_infections;
    this.natal_other_significant_history = data.natal_other_significant_history;

    // Neonatal
    this.neonatal_birth_weight_kg = data.neonatal_birth_weight_kg;
    this.neonatal_birth_weight_category = data.neonatal_birth_weight_category;
    this.neonatal_lga = data.neonatal_lga;
    this.neonatal_birth_cry = data.neonatal_birth_cry;
    this.neonatal_colour = data.neonatal_colour;
    this.neonatal_respiratory_distress = data.neonatal_respiratory_distress;
    this.neonatal_activity = data.neonatal_activity;
    this.neonatal_suckling = data.neonatal_suckling;
    this.neonatal_feeding_method = data.neonatal_feeding_method;
    this.neonatal_feeding_schedule = data.neonatal_feeding_schedule;
    this.neonatal_feeding_problem = data.neonatal_feeding_problem;
    this.neonatal_urine_stools = data.neonatal_urine_stools;
    this.neonatal_congenital_anomalies_stigmata = data.neonatal_congenital_anomalies_stigmata;
    this.neonatal_seizures = data.neonatal_seizures;
    this.neonatal_jaundice = data.neonatal_jaundice;
    this.neonatal_infection = data.neonatal_infection;
    this.neonatal_hospital_incubator_nicu = data.neonatal_hospital_incubator_nicu;
    this.neonatal_icu_stay_details = data.neonatal_icu_stay_details;
    this.neonatal_other_significant_history = data.neonatal_other_significant_history;

    // Development Milestones
    this.dev_social_smile_age = data.dev_social_smile_age;
    this.dev_neck_holding_age = data.dev_neck_holding_age;
    this.dev_recognizing_mother_age = data.dev_recognizing_mother_age;
    this.dev_rolling_over_age = data.dev_rolling_over_age;
    this.dev_sitting_without_support_age = data.dev_sitting_without_support_age;
    this.dev_first_meaningful_word_age = data.dev_first_meaningful_word_age;
    this.dev_standing_with_support_age = data.dev_standing_with_support_age;
    this.dev_walking_age = data.dev_walking_age;
    this.dev_teething_age = data.dev_teething_age;
    this.dev_ten_meaningful_words_age = data.dev_ten_meaningful_words_age;
    this.dev_two_word_phrases_age = data.dev_two_word_phrases_age;
    this.dev_fluent_speech_sentence_age = data.dev_fluent_speech_sentence_age;
    this.dev_bowel_control_age = data.dev_bowel_control_age;
    this.dev_bladder_control_age = data.dev_bladder_control_age;

    // Immunization
    this.immunization_iap_grid = this._parseJsonb(data.immunization_iap_grid, {});

    // Habits
    this.habits_exclusive_breastfeeding_months = data.habits_exclusive_breastfeeding_months;
    this.habits_feeding_type = data.habits_feeding_type;
    this.habits_reasons_not_exclusive_breastfeeding = data.habits_reasons_not_exclusive_breastfeeding;
    this.habits_weaning_age_months = data.habits_weaning_age_months;
    this.habits_food_fads_preferences = data.habits_food_fads_preferences;
    this.habits_sleep_details = data.habits_sleep_details;
    this.habits_sleep_bedtime_behavioral_problems = data.habits_sleep_bedtime_behavioral_problems;
    this.habits_sleep_abnormal_movements_behaviours = data.habits_sleep_abnormal_movements_behaviours;
    this.habits_neurotic_nail_biting = data.habits_neurotic_nail_biting;
    this.habits_neurotic_thumb_sucking = data.habits_neurotic_thumb_sucking;
    this.habits_neurotic_morbid_fears = data.habits_neurotic_morbid_fears;
    this.habits_neurotic_obstinacy = data.habits_neurotic_obstinacy;
    this.habits_neurotic_temper_tantrums = data.habits_neurotic_temper_tantrums;
    this.habits_neurotic_enuresis_encopresis = data.habits_neurotic_enuresis_encopresis;

    // Play
    this.play_preference = data.play_preference;
    this.play_friends_quantity = data.play_friends_quantity;
    this.play_friends_age_relation = data.play_friends_age_relation;
    this.play_indifferent_to_playmates = data.play_indifferent_to_playmates;
    this.play_inappropriate_intrusion_impulsivity = data.play_inappropriate_intrusion_impulsivity;
    this.play_understands_rules_based_games = data.play_understands_rules_based_games;
    this.play_shows_cooperation_in_play = data.play_shows_cooperation_in_play;
    this.play_is_bully = data.play_is_bully;
    this.play_is_bullied = data.play_is_bullied;
    this.play_bully_details = data.play_bully_details;
    this.play_bullied_details = data.play_bullied_details;
    this.play_indulges_functional_play = data.play_indulges_functional_play;
    this.play_indulges_symbolic_pretend_play = data.play_indulges_symbolic_pretend_play;
    this.play_peculiarities = data.play_peculiarities;
    this.habits_play_other_significant_history = data.habits_play_other_significant_history;

    // Educational History
    this.edu_schooling_type = data.edu_schooling_type;
    this.edu_school_nature = data.edu_school_nature;
    this.edu_literacy_before_formal_schooling = data.edu_literacy_before_formal_schooling;
    this.edu_age_started_schooling = data.edu_age_started_schooling;
    this.edu_studied_up_to_class = data.edu_studied_up_to_class;
    this.edu_current_school_address = data.edu_current_school_address;
    this.edu_attendance = data.edu_attendance;
    this.edu_scholastic_performance = data.edu_scholastic_performance;
    this.edu_peer_group_adjustment = data.edu_peer_group_adjustment;
    this.edu_problems_with_teachers = data.edu_problems_with_teachers;
    this.edu_classroom_behaviour = data.edu_classroom_behaviour;
    this.edu_school_change_frequency_reasons = data.edu_school_change_frequency_reasons;
    this.edu_dropout_reasons = data.edu_dropout_reasons;
    this.edu_any_other_information = data.edu_any_other_information;

    // Sexual / Menstrual History
    this.sexual_menstrual_age_appropriate_context = data.sexual_menstrual_age_appropriate_context;
    this.sexual_menstrual_menarche_regularity_lmp = data.sexual_menstrual_menarche_regularity_lmp;
    this.sexual_menstrual_reaction_menarche = data.sexual_menstrual_reaction_menarche;
    this.sexual_menstrual_orientation = data.sexual_menstrual_orientation;
    this.sexual_menstrual_masturbation_guilt = data.sexual_menstrual_masturbation_guilt;
    this.sexual_menstrual_intercourse_protection = data.sexual_menstrual_intercourse_protection;
    this.sexual_menstrual_knowledge_perceptions = data.sexual_menstrual_knowledge_perceptions;

    // Temperament
    this.temperament_activity_infancy = data.temperament_activity_infancy;
    this.temperament_activity_later = data.temperament_activity_later;
    this.temperament_rhythmicity_infancy = data.temperament_rhythmicity_infancy;
    this.temperament_rhythmicity_later = data.temperament_rhythmicity_later;
    this.temperament_approach_withdrawal_infancy = data.temperament_approach_withdrawal_infancy;
    this.temperament_approach_withdrawal_later = data.temperament_approach_withdrawal_later;
    this.temperament_adaptability_infancy = data.temperament_adaptability_infancy;
    this.temperament_adaptability_later = data.temperament_adaptability_later;
    this.temperament_mood_infancy = data.temperament_mood_infancy;
    this.temperament_mood_later = data.temperament_mood_later;
    this.temperament_intensity_reaction_infancy = data.temperament_intensity_reaction_infancy;
    this.temperament_intensity_reaction_later = data.temperament_intensity_reaction_later;
    this.temperament_threshold_responsiveness_infancy = data.temperament_threshold_responsiveness_infancy;
    this.temperament_threshold_responsiveness_later = data.temperament_threshold_responsiveness_later;
    this.temperament_attention_span_infancy = data.temperament_attention_span_infancy;
    this.temperament_attention_span_later = data.temperament_attention_span_later;
    this.temperament_persistence_infancy = data.temperament_persistence_infancy;
    this.temperament_persistence_later = data.temperament_persistence_later;
    this.temperament_distractibility_infancy = data.temperament_distractibility_infancy;
    this.temperament_distractibility_later = data.temperament_distractibility_later;

    // Strengths & Assets
    this.child_strengths_psychosocial_assets = data.child_strengths_psychosocial_assets;
    this.child_strengths_interests_hobbies = data.child_strengths_interests_hobbies;

    // Family Structure
    this.family_primary_caregivers = data.family_primary_caregivers;
    this.family_primary_breadwinner = data.family_primary_breadwinner;
    this.family_structure_type = data.family_structure_type;
    this.family_main_decision_makers = data.family_main_decision_makers;

    // Patterns of Parental Functioning
    this.ppf_mother_permissiveness_rigidity = data.ppf_mother_permissiveness_rigidity;
    this.ppf_father_permissiveness_rigidity = data.ppf_father_permissiveness_rigidity;
    this.ppf_mother_consistency_inconsistency = data.ppf_mother_consistency_inconsistency;
    this.ppf_father_consistency_inconsistency = data.ppf_father_consistency_inconsistency;
    this.ppf_mother_discipline_liberal_supervision = data.ppf_mother_discipline_liberal_supervision;
    this.ppf_father_discipline_liberal_supervision = data.ppf_father_discipline_liberal_supervision;
    this.ppf_mother_approval_disapproval_interest = data.ppf_mother_approval_disapproval_interest;
    this.ppf_father_approval_disapproval_interest = data.ppf_father_approval_disapproval_interest;
    this.ppf_mother_protectiveness_overprotection = data.ppf_mother_protectiveness_overprotection;
    this.ppf_father_protectiveness_overprotection = data.ppf_father_protectiveness_overprotection;
    this.ppf_mother_toleration_deviation = data.ppf_mother_toleration_deviation;
    this.ppf_father_toleration_deviation = data.ppf_father_toleration_deviation;

    // Parent-Child Interaction
    this.pci_interaction_patterns_communication_warmth_abuse_indulgence = data.pci_interaction_patterns_communication_warmth_abuse_indulgence;
    this.pci_attachment_bonding_child_parents = data.pci_attachment_bonding_child_parents;
    this.pci_family_understanding_illness_expectations = data.pci_family_understanding_illness_expectations;

    // Family Functioning
    this.family_functioning_discord_communication = data.family_functioning_discord_communication;
    this.family_functioning_role_significant_others = data.family_functioning_role_significant_others;
    this.family_functioning_stressful_events_child_impact = data.family_functioning_stressful_events_child_impact;

    // Social-Environmental
    this.social_environmental_dwelling_crowding_finance_neighborhood = data.social_environmental_dwelling_crowding_finance_neighborhood;
    this.social_environmental_resources_milieu_support = data.social_environmental_resources_milieu_support;

    // GPE
    this.gpe_built = data.gpe_built;
    this.gpe_height_length_cm = data.gpe_height_length_cm;
    this.gpe_height_growth_chart_position = data.gpe_height_growth_chart_position;
    this.gpe_weight_kg = data.gpe_weight_kg;
    this.gpe_weight_growth_chart_position = data.gpe_weight_growth_chart_position;
    this.gpe_bmi = data.gpe_bmi;
    this.gpe_bmi_growth_chart_position = data.gpe_bmi_growth_chart_position;
    this.gpe_waist_circumference_cm = data.gpe_waist_circumference_cm;
    this.gpe_hip_circumference_cm = data.gpe_hip_circumference_cm;
    this.gpe_head_circumference_cm = data.gpe_head_circumference_cm;
    this.gpe_head_circumference_growth_chart_position = data.gpe_head_circumference_growth_chart_position;
    this.gpe_vitals_hr = data.gpe_vitals_hr;
    this.gpe_vitals_rr = data.gpe_vitals_rr;
    this.gpe_vitals_bp = data.gpe_vitals_bp;
    this.gpe_general_signs = data.gpe_general_signs;
    this.gpe_facial_dysmorphism = data.gpe_facial_dysmorphism;
    this.gpe_skin_neurocutaneous_stigmata = data.gpe_skin_neurocutaneous_stigmata;

    // Systemic Exam
    this.sys_exam_respiratory = data.sys_exam_respiratory;
    this.sys_exam_gastrointestinal = data.sys_exam_gastrointestinal;
    this.sys_exam_cardiovascular = data.sys_exam_cardiovascular;
    this.sys_exam_nervous_system = data.sys_exam_nervous_system;

    // MSE
    this.mse_interview_approach_notes = data.mse_interview_approach_notes;
    this.mse_general_appearance_attitude_behaviour = data.mse_general_appearance_attitude_behaviour;
    this.mse_relationship_capacity = data.mse_relationship_capacity;
    this.mse_spontaneous_motility = data.mse_spontaneous_motility;
    this.mse_speech_and_language = data.mse_speech_and_language;
    this.mse_affect = data.mse_affect;
    this.mse_thought_flow = data.mse_thought_flow;
    this.mse_thought_form = data.mse_thought_form;
    this.mse_thought_content = data.mse_thought_content;
    this.mse_possession = data.mse_possession;
    this.mse_perception = data.mse_perception;
    this.mse_hmf_orientation = data.mse_hmf_orientation;
    this.mse_hmf_attention_distractibility = data.mse_hmf_attention_distractibility;
    this.mse_hmf_memory = data.mse_hmf_memory;
    this.mse_hmf_intelligence_fund_of_knowledge = data.mse_hmf_intelligence_fund_of_knowledge;
    this.mse_insight_motivation = data.mse_insight_motivation;

    // Investigations & Assessments
    this.investigations_assessments = this._parseJsonb(data.investigations_assessments, {});

    // Diagnosis & Plan
    this.diagnostic_formulation = data.diagnostic_formulation;
    this.provisional_diagnosis = data.provisional_diagnosis;
    this.icd10_diagnosis = data.icd10_diagnosis;
    this.dsm5_diagnosis = data.dsm5_diagnosis;
    this.residents_plan_of_management = data.residents_plan_of_management;

    // Consultant Review
    this.consultant_sr_discussion = data.consultant_sr_discussion;
    this.final_diagnosis = data.final_diagnosis;
    this.final_icd10_diagnosis = data.final_icd10_diagnosis;
    this.final_dsm5_diagnosis = data.final_dsm5_diagnosis;
    this.mgmt_planned_followup_setting_frequency = data.mgmt_planned_followup_setting_frequency;
    this.mgmt_planned_further_exploration = data.mgmt_planned_further_exploration;
    this.mgmt_planned_rating_scales = data.mgmt_planned_rating_scales;
    this.management_plan_interventions = this._parseJsonb(data.management_plan_interventions, {});
    this.management_advice = data.management_advice;
    this.signature_consultant_sr_name = data.signature_consultant_sr_name;
    this.signature_resident_name = data.signature_resident_name;

    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  _parseJsonb(value, fallback) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return fallback; }
    }
    return value;
  }

  toJSON() {
    return { ...this };
  }

  // ─── Allowed values for constrained enum fields ────────────────────────────

  static ALLOWED = {
    school_type: ['Government', 'Private', 'Special'],
    impairment_severity: ['Mild', 'Moderate', 'Severe', 'None', 'Not impaired'],
    treatment_first_contact_due_to: [
      'Parental perception',
      'Teacher referral',
      'Referral from any physician',
      'Referral from a pediatrician',
      'Advice of a relative',
      'Any other',
    ],
  };

  /**
   * Validate enum fields. Returns an array of error strings (empty = valid).
   */
  static validate(data) {
    const errors = [];
    for (const [field, allowed] of Object.entries(ChildCapWorkup.ALLOWED)) {
      const v = data[field];
      if (v !== undefined && v !== null && v !== '' && !allowed.includes(v)) {
        errors.push(
          `"${field}" must be one of: ${allowed.map(o => `"${o}"`).join(', ')}. Received: "${v}"`
        );
      }
    }
    return errors;
  }

  // ─── Static Query Helpers ───────────────────────────────────────────────────

  static async findByChildPatientId(childPatientId) {
    const result = await db.query(
      `SELECT * FROM child_cap_detailed_workup
       WHERE child_patient_id = $1
       ORDER BY created_at DESC`,
      [childPatientId]
    );
    return result.rows.map(r => new ChildCapWorkup(r));
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM child_cap_detailed_workup WHERE id = $1',
      [id]
    );
    return result.rows.length ? new ChildCapWorkup(result.rows[0]) : null;
  }

  static async create(data) {
    const jsonbFields = ['informants', 'chief_complaints_course', 'treatment_history_chart', 'immunization_iap_grid', 'investigations_assessments', 'management_plan_interventions'];

    const payload = { ...data };
    jsonbFields.forEach(f => {
      if (payload[f] !== undefined && payload[f] !== null) {
        payload[f] = typeof payload[f] === 'string' ? payload[f] : JSON.stringify(payload[f]);
      }
    });

    const columns = Object.keys(payload).filter(k => payload[k] !== undefined);
    const values = columns.map(k => payload[k] === '' ? null : payload[k]);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO child_cap_detailed_workup (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    const result = await db.query(query, values);
    return new ChildCapWorkup(result.rows[0]);
  }

  static async update(id, data) {
    const jsonbFields = ['informants', 'chief_complaints_course', 'treatment_history_chart', 'immunization_iap_grid', 'investigations_assessments', 'management_plan_interventions'];

    const payload = { ...data };
    delete payload.id;
    delete payload.child_patient_id;
    delete payload.created_at;

    jsonbFields.forEach(f => {
      if (payload[f] !== undefined && payload[f] !== null) {
        payload[f] = typeof payload[f] === 'string' ? payload[f] : JSON.stringify(payload[f]);
      }
    });

    const columns = Object.keys(payload).filter(k => payload[k] !== undefined);
    if (columns.length === 0) return ChildCapWorkup.findById(id);

    const setClauses = columns.map((col, i) => `${col} = $${i + 1}`);
    const values = columns.map(k => payload[k] === '' ? null : payload[k]);

    const query = `
      UPDATE child_cap_detailed_workup
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${columns.length + 1}
      RETURNING *
    `;
    const result = await db.query(query, [...values, id]);
    return result.rows.length ? new ChildCapWorkup(result.rows[0]) : null;
  }

  static async delete(id) {
    const result = await db.query(
      'DELETE FROM child_cap_detailed_workup WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }
}

module.exports = ChildCapWorkup;
