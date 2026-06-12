-- Migration: Child & Adolescent Psychiatry (CAP) — Detailed Work-up Record (Pages 1–4+ sections)
-- Description: CAP detailed work-up — demographics/referral/informants/complaints (early pages),
--              History of Present Illness (8 guided narrative blocks + continued),
--              relevant negative history, functioning/impairment,
--              Treatment History chart (first-contact questions + up to 4 agency contacts),
--              past psychiatric / medical / family history, life chart,
--              personal & developmental history — ante-natal, natal, neonatal/post-natal,
--              developmental milestones, IAP immunization grid (JSON), habits and play,
--              educational history, sexual and menstrual history,
--              temperamental characteristics (infancy vs later stages per dimension),
--              strengths/assets, family structure, patterns of parental functioning (mother/father),
--              parent–child interaction, family functioning, social–environmental conditions,
--              physical examination (general + systemic), mental state examination (affect, thought, possession, perception, HMF, insight),
--              investigations/assessments (JSON table), diagnostic formulation and plan,
--              consultant discussion, final diagnoses, management planned, interventions grid, advice, signatures.
-- Date: 2026-05-04
--
-- JSONB shapes (enforced in application layer; defaults are empty arrays):
--
-- informants: [
--   {
--     "name": string,
--     "relationship_with_patient": string,
--     "age": string,
--     "sex": string,
--     "education": string,
--     "occupation": string,
--     "duration_stay_with_patient": string
--   }, ...
-- ]
--
-- chief_complaints_course: [
--   {
--     "complaint": string,
--     "duration": string,
--     "onset": "acute" | "sub_acute" | "insidious" | "present_since_birth" | null,
--     "precipitating_factor_present": "present" | "absent" | null,
--     "precipitating_factor_elaborate": string,
--     "course": "continuous" | "progressive" | "continuous_intermittent_exacerbations" |
--               "episodic" | "static" | "improving" | null
--   }, ...
-- ]
--
-- treatment_history_chart: up to 4 rows (first through fourth contact). Application may enforce length ≤ 4.
-- [
--   {
--     "contact_order": 1 | 2 | 3 | 4,
--     "agency": string,
--     "months_ago": number | null,
--     "treatment_given": string,
--     "response": string,
--     "side_effects": string,
--     "perceptions_experiences": string
--   }, ...
-- ]
--
-- immunization_iap_grid: IAP recommended schedule (e.g. 2016) — complex grid. Store as JSON object or array
-- of cells, e.g. [{ "vaccine": "BCG", "dose": "Birth", "date_given": "...", "status": "given" }, ...]
-- or a map keyed by vaccine_dose -> date; shape is defined by the application.
--
-- investigations_assessments: INVESTIGATIONS/ASSESSMENTS table — psychological vs physical rows; each row has
-- test_name_ref (name/battery; PGI ref no.) and results; optional "comments" may be added per row (continuation table).
-- Example:
-- {
--   "psychological": {
--     "iq": { "test_name_ref": "", "results": "" },
--     "conflict_assessment": { "test_name_ref": "", "results": "" },
--     "projective_tests": { "test_name_ref": "", "results": "" },
--     "sld": { "test_name_ref": "", "results": "" },
--     "play_observation": { "test_name_ref": "", "results": "" },
--     "neuropsychological": { "test_name_ref": "", "results": "" },
--     "other": { "test_name_ref": "", "results": "" }
--   },
--   "physical": {
--     "hearing": { "test_name_ref": "", "results": "" },
--     "vision": { "test_name_ref": "", "results": "" },
--     "urine_screen_mr": { "test_name_ref": "", "results": "" },
--     "tms_gcms": { "test_name_ref": "", "results": "" },
--     "serum_homocysteine": { "test_name_ref": "", "results": "" },
--     "urine_homocysteine": { "test_name_ref": "", "results": "" },
--     "serum_lactate": { "test_name_ref": "", "results": "" },
--     "thyroid_profile": { "test_name_ref": "", "results": "" },
--     "vitamin_d": { "test_name_ref": "", "results": "" },
--     "neuroimaging": { "test_name_ref": "", "results": "" },
--     "eeg": { "test_name_ref": "", "results": "" },
--     "genetic": { "test_name_ref": "", "results": "" },
--     "other": { "test_name_ref": "", "results": "" }
--   }
-- }
--
-- management_plan_interventions: MANAGEMENT PLANNED detail grid (consultation, liaison, drug, psychotherapy, etc.).
-- Each key maps to free text "Provide details":
-- {
--   "consultation_referral_other_departments": "",
--   "liaison_school": "",
--   "drug_rationale_name_dose": "",
--   "psychotherapy_rationale_type": "",
--   "parental_counseling": "",
--   "parental_training": "",
--   "disability_certification": "",
--   "education_rehabilitation_plan": "",
--   "other": ""
-- }

CREATE TABLE IF NOT EXISTS child_cap_detailed_workup (
    id SERIAL PRIMARY KEY,

    child_patient_id INTEGER NOT NULL
        REFERENCES child_patient_registrations (id) ON DELETE CASCADE,

    -- --- Administrative & demographics (header of form; snapshot at work-up) ---
    workup_date DATE,
    cap_no VARCHAR(100),
    patient_name TEXT,
    age TEXT,
    date_of_birth DATE,
    gender VARCHAR(30),
    education TEXT,
    school_type VARCHAR(20)
        CHECK (
            school_type IS NULL
            OR school_type IN ('Government', 'Private', 'Special')
        ),

    -- --- Referral ---
    referred_by TEXT,
    reason_referral_present_consultation TEXT,

    -- --- Informants (repeatable rows on paper form) ---
    informants JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- --- Information assessment ---
    information_reliability_adequacy TEXT,

    -- --- Chief complaints with onset, precipitating factor, course (aligned by complaint order) ---
    chief_complaints_course JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- --- History of Present Illness (from multiple informants; extensive narrative per prompt) ---
    hpi_developmental_history_symptoms TEXT,
    hpi_symptoms_impairment_developmental_age TEXT,
    hpi_behavioral_symptom_factors TEXT,
    hpi_phenomenology_symptoms TEXT,
    hpi_adolescent_biological_enquiry TEXT,
    hpi_sensory_impairments TEXT,
    hpi_comorbid_physical_illness TEXT,
    hpi_treatment_history TEXT,

    -- --- HPI continuation & later-page narrative blocks ---
    hpi_continued TEXT,
    relevant_negative_history TEXT,
    functioning_overall_assessment TEXT,
    impairment_severity VARCHAR(30),

    -- --- Treatment History (Treatment Chart — type of help, perceptions, duration, side-effects, discontinuation) ---
    treatment_who_initiated_first_contact TEXT,
    treatment_first_contact_due_to VARCHAR(80),
    treatment_first_contact_due_to_other TEXT,
    treatment_history_chart JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- --- Past Psychiatric History ---
    past_psychiatric_history TEXT,

    -- --- Medical History (including treatment and current status; plus prompted enquiries) ---
    medical_history_details TEXT,
    medical_enquiry_epilepsy TEXT,
    medical_enquiry_syncope TEXT,
    medical_enquiry_exercise_intolerance TEXT,
    medical_enquiry_cardiac_ailment TEXT,

    -- --- Family History (psychiatric, neurological, medical; pedigree; obstetric risk factors) ---
    family_history_details TEXT,
    family_history_epilepsy TEXT,
    family_history_sudden_cardiac_death TEXT,
    family_pedigree_description TEXT,
    family_consanguinity TEXT,
    family_previous_abortions_stillbirths TEXT,

    -- --- Life Chart (timeline; relation of physical illness/treatment to psychiatric symptoms) ---
    life_chart_details TEXT,
    life_chart_psychiatric_past_present TEXT,
    life_chart_physical_comorbidities_treatment TEXT,
    life_chart_relation_physical_psychiatric TEXT,

    -- --- Personal & Developmental History: Ante-natal (tick/elaborate; mother’s pregnancy) ---
    ante_natal_pregnancy_planned TEXT,
    ante_natal_pregnancy_wanted TEXT,
    ante_natal_pregnancy_unwanted_reason TEXT,
    ante_natal_mother_age_conception INTEGER,
    ante_natal_father_age_conception INTEGER,
    ante_natal_conception_method TEXT,
    ante_natal_preconception_folate TEXT,
    ante_natal_preconception_folate_months TEXT,
    ante_natal_nutritional_status_mother TEXT,
    ante_natal_medical_illness_treatment TEXT,
    ante_natal_other_medical_surgery TEXT,
    ante_natal_hyperemesis TEXT,
    ante_natal_fever_first_trimester TEXT,
    ante_natal_xray_exposure TEXT,
    ante_natal_drug_intake_non_supplement TEXT,
    ante_natal_psychotropic_use TEXT,
    ante_natal_alcohol_tobacco TEXT,
    ante_natal_antenatal_visits TEXT,
    ante_natal_immunization TEXT,
    ante_natal_usg TEXT,
    ante_natal_special_procedures TEXT,
    ante_natal_attempted_abortion TEXT,
    ante_natal_rh_incompatibility TEXT,
    ante_natal_single_or_twin TEXT,
    ante_natal_threatened_abortion_bleeding_pv TEXT,
    ante_natal_preeclampsia_eclampsia TEXT,
    ante_natal_foetal_movements TEXT,
    ante_natal_other_significant_history TEXT,

    -- --- Personal & Developmental History: Natal (delivery + labour checklist) ---
    natal_delivery_location TEXT,
    natal_delivery_term TEXT,
    natal_gestational_age_weeks NUMERIC(5, 2),
    natal_delivery_method TEXT,
    natal_delivery_method_reason TEXT,
    natal_abnormal_presentation TEXT,
    natal_large_head TEXT,
    natal_low_placenta TEXT,
    natal_prolapsed_cord TEXT,
    natal_cord_around_neck TEXT,
    natal_foetal_distress TEXT,
    natal_prolonged_labour TEXT,
    natal_prom TEXT,
    natal_non_progress_labour TEXT,
    natal_meconium_stained TEXT,
    natal_eclampsia TEXT,
    natal_excessive_bleeding_pph TEXT,
    natal_infections TEXT,
    natal_other_significant_history TEXT,

    -- --- Neonatal and post-natal history ---
    neonatal_birth_weight_kg NUMERIC(6, 3),
    neonatal_birth_weight_category TEXT,
    neonatal_lga TEXT,
    neonatal_birth_cry TEXT,
    neonatal_colour TEXT,
    neonatal_respiratory_distress TEXT,
    neonatal_activity TEXT,
    neonatal_suckling TEXT,
    neonatal_feeding_method TEXT,
    neonatal_feeding_schedule TEXT,
    neonatal_feeding_problem TEXT,
    neonatal_urine_stools TEXT,
    neonatal_congenital_anomalies_stigmata TEXT,
    neonatal_seizures TEXT,
    neonatal_jaundice TEXT,
    neonatal_infection TEXT,
    neonatal_hospital_incubator_nicu TEXT,
    neonatal_icu_stay_details TEXT,
    neonatal_other_significant_history TEXT,

    -- --- Development history: age at milestone (tick/elaborate; ref. ranges on form) ---
    dev_social_smile_age TEXT,
    dev_neck_holding_age TEXT,
    dev_recognizing_mother_age TEXT,
    dev_rolling_over_age TEXT,
    dev_sitting_without_support_age TEXT,
    dev_first_meaningful_word_age TEXT,
    dev_standing_with_support_age TEXT,
    dev_walking_age TEXT,
    dev_teething_age TEXT,
    dev_ten_meaningful_words_age TEXT,
    dev_two_word_phrases_age TEXT,
    dev_fluent_speech_sentence_age TEXT,
    dev_bowel_control_age TEXT,
    dev_bladder_control_age TEXT,

    -- --- Immunization (IAP schedule grid — dates/ticks per vaccine dose) ---
    immunization_iap_grid JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- --- HABITS: Feeding ---
    habits_feeding_type TEXT,
    habits_exclusive_breastfeeding_months INTEGER,
    habits_reasons_not_exclusive_breastfeeding TEXT,
    habits_weaning_age_months INTEGER,
    habits_weaning_difficulties TEXT,
    habits_food_fads_preferences TEXT,

    -- --- HABITS: Sleep ---
    habits_sleep_details TEXT,
    habits_sleep_bedtime_behavioral_problems TEXT,
    habits_sleep_abnormal_movements_behaviours TEXT,

    -- --- HABITS: Neurotic traits (tick as applicable) ---
    habits_neurotic_nail_biting BOOLEAN,
    habits_neurotic_thumb_sucking BOOLEAN,
    habits_neurotic_morbid_fears BOOLEAN,
    habits_neurotic_obstinacy BOOLEAN,
    habits_neurotic_temper_tantrums BOOLEAN,
    habits_neurotic_enuresis_encopresis BOOLEAN,

    -- --- PLAY ---
    play_preference TEXT,
    play_friends_quantity TEXT,
    play_friends_age_relation TEXT,
    play_indifferent_to_playmates BOOLEAN,
    play_inappropriate_intrusion_impulsivity BOOLEAN,
    play_understands_rules_based_games BOOLEAN,
    play_shows_cooperation_in_play BOOLEAN,
    play_is_bully BOOLEAN,
    play_bully_details TEXT,
    play_is_bullied BOOLEAN,
    play_bullied_details TEXT,
    play_peculiarities TEXT,
    play_indulges_functional_play BOOLEAN,
    play_indulges_symbolic_pretend_play BOOLEAN,

    -- --- HABITS / PLAY: other significant history ---
    habits_play_other_significant_history TEXT,

    -- --- Educational history (items a–m) ---
    edu_schooling_type TEXT,
    edu_school_nature TEXT,
    edu_literacy_before_formal_schooling TEXT,
    edu_age_started_schooling TEXT,
    edu_studied_up_to_class TEXT,
    edu_current_school_address TEXT,
    edu_attendance TEXT,
    edu_scholastic_performance TEXT,
    edu_peer_group_adjustment TEXT,
    edu_problems_with_teachers TEXT,
    edu_classroom_behaviour TEXT,
    edu_school_change_frequency_reasons TEXT,
    edu_dropout_reasons TEXT,
    edu_any_other_information TEXT,

    -- --- Sexual and menstrual history (age- and sex-appropriate) ---
    sexual_menstrual_age_appropriate_context TEXT,
    sexual_menstrual_menarche_regularity_lmp TEXT,
    sexual_menstrual_reaction_menarche TEXT,
    sexual_menstrual_orientation TEXT,
    sexual_menstrual_masturbation_guilt TEXT,
    sexual_menstrual_intercourse_protection TEXT,
    sexual_menstrual_knowledge_perceptions TEXT,

    -- --- Temperamental characteristics (brief description per dimension: infancy / later stages) ---
    temperament_activity_infancy TEXT,
    temperament_activity_later TEXT,
    temperament_rhythmicity_infancy TEXT,
    temperament_rhythmicity_later TEXT,
    temperament_approach_withdrawal_infancy TEXT,
    temperament_approach_withdrawal_later TEXT,
    temperament_adaptability_infancy TEXT,
    temperament_adaptability_later TEXT,
    temperament_mood_infancy TEXT,
    temperament_mood_later TEXT,
    temperament_intensity_reaction_infancy TEXT,
    temperament_intensity_reaction_later TEXT,
    temperament_threshold_responsiveness_infancy TEXT,
    temperament_threshold_responsiveness_later TEXT,
    temperament_attention_span_infancy TEXT,
    temperament_attention_span_later TEXT,
    temperament_persistence_infancy TEXT,
    temperament_persistence_later TEXT,
    temperament_distractibility_infancy TEXT,
    temperament_distractibility_later TEXT,

    -- --- Strengths and assets of the child ---
    child_strengths_psychosocial_assets TEXT,
    child_strengths_interests_hobbies TEXT,

    -- --- Family structure ---
    family_primary_caregivers TEXT,
    family_primary_breadwinner TEXT,
    family_structure_type TEXT,
    family_main_decision_makers TEXT,

    -- --- Patterns of parental functioning (Mother / Father per spectrum) ---
    ppf_mother_permissiveness_rigidity TEXT,
    ppf_father_permissiveness_rigidity TEXT,
    ppf_mother_consistency_inconsistency TEXT,
    ppf_father_consistency_inconsistency TEXT,
    ppf_mother_discipline_liberal_supervision TEXT,
    ppf_father_discipline_liberal_supervision TEXT,
    ppf_mother_approval_disapproval_interest TEXT,
    ppf_father_approval_disapproval_interest TEXT,
    ppf_mother_protectiveness_overprotection TEXT,
    ppf_father_protectiveness_overprotection TEXT,
    ppf_mother_toleration_deviation TEXT,
    ppf_father_toleration_deviation TEXT,

    -- --- Parent–child interaction ---
    pci_interaction_patterns_communication_warmth_abuse_indulgence TEXT,
    pci_attachment_bonding_child_parents TEXT,
    pci_family_understanding_illness_expectations TEXT,

    -- --- Family functioning ---
    family_functioning_discord_communication TEXT,
    family_functioning_role_significant_others TEXT,
    family_functioning_stressful_events_child_impact TEXT,

    -- --- Social–environmental conditions ---
    social_environmental_dwelling_crowding_finance_neighborhood TEXT,
    social_environmental_resources_milieu_support TEXT,

    -- --- Physical examination: general ---
    gpe_built TEXT,
    gpe_height_length_cm NUMERIC(6, 2),
    gpe_height_growth_chart_position TEXT,
    gpe_weight_kg NUMERIC(7, 3),
    gpe_weight_growth_chart_position TEXT,
    gpe_bmi NUMERIC(6, 2),
    gpe_bmi_growth_chart_position TEXT,
    gpe_waist_circumference_cm NUMERIC(6, 2),
    gpe_hip_circumference_cm NUMERIC(6, 2),
    gpe_head_circumference_cm NUMERIC(6, 2),
    gpe_head_circumference_growth_chart_position TEXT,
    gpe_vitals_hr TEXT,
    gpe_vitals_rr TEXT,
    gpe_vitals_bp TEXT,
    gpe_general_signs TEXT,
    gpe_facial_dysmorphism TEXT,
    gpe_skin_neurocutaneous_stigmata TEXT,

    -- --- Physical examination: systemic ---
    sys_exam_respiratory TEXT,
    sys_exam_gastrointestinal TEXT,
    sys_exam_cardiovascular TEXT,
    sys_exam_nervous_system TEXT,

    -- --- Mental state examination (pediatric) ---
    mse_interview_approach_notes TEXT,
    mse_general_appearance_attitude_behaviour TEXT,
    mse_relationship_capacity TEXT,
    mse_spontaneous_motility TEXT,
    mse_speech_and_language TEXT,
    mse_affect TEXT,
    mse_thought_flow TEXT,
    mse_thought_form TEXT,
    mse_thought_content TEXT,
    mse_possession TEXT,
    mse_perception TEXT,
    mse_hmf_orientation TEXT,
    mse_hmf_attention_distractibility TEXT,
    mse_hmf_memory TEXT,
    mse_hmf_intelligence_fund_of_knowledge TEXT,
    mse_insight_motivation TEXT,

    -- --- Investigations / assessments (psychological & physical rows; see header JSON shape) ---
    investigations_assessments JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- --- Diagnosis and plan ---
    diagnostic_formulation TEXT,
    provisional_diagnosis TEXT,
    icd10_diagnosis TEXT,
    dsm5_diagnosis TEXT,
    residents_plan_of_management TEXT,

    -- --- Consultant review and final diagnosis ---
    consultant_sr_discussion TEXT,
    final_diagnosis TEXT,
    final_icd10_diagnosis TEXT,
    final_dsm5_diagnosis TEXT,

    -- --- Management planned (follow-up table — provide details) ---
    mgmt_planned_followup_setting_frequency TEXT,
    mgmt_planned_further_exploration TEXT,
    mgmt_planned_rating_scales TEXT,

    -- --- Management interventions grid (see header JSON shape) ---
    management_plan_interventions JSONB NOT NULL DEFAULT '{}'::jsonb,

    management_advice TEXT,
    signature_consultant_sr_name TEXT,
    signature_resident_name TEXT,

    -- --- Metadata ---
    filled_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT child_cap_detailed_workup_impairment_severity_check CHECK (
        impairment_severity IS NULL
        OR impairment_severity IN (
            'Mild',
            'Moderate',
            'Severe',
            'None',
            'Not impaired'
        )
    ),
    CONSTRAINT child_cap_detailed_workup_treatment_first_contact_due_to_check CHECK (
        treatment_first_contact_due_to IS NULL
        OR treatment_first_contact_due_to IN (
            'Parental perception',
            'Teacher referral',
            'Referral from any physician',
            'Referral from a pediatrician',
            'Advice of a relative',
            'Any other'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_child_cap_detailed_workup_child_patient_id
    ON child_cap_detailed_workup (child_patient_id);

CREATE INDEX IF NOT EXISTS idx_child_cap_detailed_workup_workup_date
    ON child_cap_detailed_workup (workup_date DESC);

CREATE INDEX IF NOT EXISTS idx_child_cap_detailed_workup_cap_no
    ON child_cap_detailed_workup (cap_no)
    WHERE cap_no IS NOT NULL;

COMMENT ON TABLE child_cap_detailed_workup IS
    'CAP Detailed Work-up Record (paper form): full detailed work-up through consultant sign-off. Demographics are visit snapshots.';

COMMENT ON COLUMN child_cap_detailed_workup.cap_no IS
    'CAP number as on form (may correspond to CGC number in registration; stored separately for exact paper capture).';

COMMENT ON COLUMN child_cap_detailed_workup.informants IS
    'JSON array of informant rows: name, relationship_with_patient, age, sex, education, occupation, duration_stay_with_patient.';

COMMENT ON COLUMN child_cap_detailed_workup.chief_complaints_course IS
    'JSON array of complaints in chronological order; each item includes complaint, duration, onset, precipitating factor (present/absent + elaborate), course.';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_developmental_history_symptoms IS
    'HPI: developmental history of symptoms (conception through development if present since birth).';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_symptoms_impairment_developmental_age IS
    'HPI: symptoms/impairment vs developmental age; include relevant negative history.';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_behavioral_symptom_factors IS
    'HPI: precipitating, perpetuating, maintaining/relieving factors.';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_phenomenology_symptoms IS
    'HPI: phenomenology — mood, anxiety, psychotic symptoms.';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_adolescent_biological_enquiry IS
    'HPI: suicidality, substance use (adolescents), bio-functions (sleep, appetite, etc.).';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_sensory_impairments IS
    'HPI: hearing and visual impairment.';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_comorbid_physical_illness IS
    'HPI: co-morbid physical illness and relation to psychiatric presentation.';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_treatment_history IS
    'HPI: prior pharmacological and non-pharmacological treatment; response and side effects.';

COMMENT ON COLUMN child_cap_detailed_workup.hpi_continued IS
    'Narrative under “HISTORY OF PRESENT ILLNESS (continued)” after structured HPI blocks.';

COMMENT ON COLUMN child_cap_detailed_workup.relevant_negative_history IS
    'Dedicated “Relevant Negative History” section (may complement narrative in HPI).';

COMMENT ON COLUMN child_cap_detailed_workup.functioning_overall_assessment IS
    'Overall functioning: relationships, household, school/work, self-care, independence, leisure.';

COMMENT ON COLUMN child_cap_detailed_workup.impairment_severity IS
    'If impaired: Mild / Moderate / Severe; None / Not impaired when appropriate.';

COMMENT ON COLUMN child_cap_detailed_workup.treatment_who_initiated_first_contact IS
    'Treatment chart: who initiated the first treatment contact.';

COMMENT ON COLUMN child_cap_detailed_workup.treatment_first_contact_due_to IS
    'Why first treatment contact occurred (tick-one options on form); use treatment_first_contact_due_to_other when "Any other".';

COMMENT ON COLUMN child_cap_detailed_workup.treatment_first_contact_due_to_other IS
    'Elaboration when first contact reason is "Any other".';

COMMENT ON COLUMN child_cap_detailed_workup.treatment_history_chart IS
    'JSON array (≤4): agency, months_ago, treatment_given, response, side_effects, perceptions_experiences per contact_order 1–4.';

COMMENT ON COLUMN child_cap_detailed_workup.past_psychiatric_history IS
    'Section: PAST PSYCHIATRIC HISTORY.';

COMMENT ON COLUMN child_cap_detailed_workup.medical_history_details IS
    'Medical history including treatment and current status (general narrative).';

COMMENT ON COLUMN child_cap_detailed_workup.medical_enquiry_epilepsy IS
    'Specific enquiry: epilepsy.';

COMMENT ON COLUMN child_cap_detailed_workup.medical_enquiry_syncope IS
    'Specific enquiry: history of syncope.';

COMMENT ON COLUMN child_cap_detailed_workup.medical_enquiry_exercise_intolerance IS
    'Specific enquiry: exercise intolerance.';

COMMENT ON COLUMN child_cap_detailed_workup.medical_enquiry_cardiac_ailment IS
    'Specific enquiry: cardiac ailment (e.g. if considering stimulant medication).';

COMMENT ON COLUMN child_cap_detailed_workup.family_history_details IS
    'Family history: psychiatric, neurological, and medical illnesses (general).';

COMMENT ON COLUMN child_cap_detailed_workup.family_history_epilepsy IS
    'Family history: epilepsy (specific prompt).';

COMMENT ON COLUMN child_cap_detailed_workup.family_history_sudden_cardiac_death IS
    'Family history: sudden cardiac deaths (specific prompt).';

COMMENT ON COLUMN child_cap_detailed_workup.family_pedigree_description IS
    '3-generation pedigree — narrative or reference if diagram stored elsewhere.';

COMMENT ON COLUMN child_cap_detailed_workup.family_consanguinity IS
    'Consanguinity and related notes.';

COMMENT ON COLUMN child_cap_detailed_workup.family_previous_abortions_stillbirths IS
    'Previous abortions, stillbirths, etc.';

COMMENT ON COLUMN child_cap_detailed_workup.life_chart_details IS
    'Life chart: overall diagram/description (past + present context).';

COMMENT ON COLUMN child_cap_detailed_workup.life_chart_psychiatric_past_present IS
    'Life chart: past and present psychiatric history along timeline.';

COMMENT ON COLUMN child_cap_detailed_workup.life_chart_physical_comorbidities_treatment IS
    'Life chart: physical co-morbidities and treatment.';

COMMENT ON COLUMN child_cap_detailed_workup.life_chart_relation_physical_psychiatric IS
    'Life chart: relation between physical illness/treatment and psychiatric symptoms.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_pregnancy_planned IS
    'Ante-natal: pregnancy planned vs unplanned (tick/elaborate as on form).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_pregnancy_wanted IS
    'Ante-natal: pregnancy wanted vs unwanted.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_pregnancy_unwanted_reason IS
    'Ante-natal: reason if pregnancy unwanted.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_mother_age_conception IS
    'Ante-natal: mother age at conception (years).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_father_age_conception IS
    'Ante-natal: father age at conception (years).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_conception_method IS
    'Ante-natal: natural, ovulation induction, IVF, etc.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_preconception_folate IS
    'Ante-natal: pre-conception folate use (yes/no or elaborate).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_preconception_folate_months IS
    'Ante-natal: duration of pre-conception folate if applicable.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_nutritional_status_mother IS
    'Mother during pregnancy: nutritional status.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_medical_illness_treatment IS
    'Mother during pregnancy: medical illness and treatment (e.g. DM, HTN, jaundice, STD).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_other_medical_surgery IS
    'Mother during pregnancy: other medical conditions or surgery.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_hyperemesis IS
    'Mother during pregnancy: history of hyper-emesis.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_fever_first_trimester IS
    'Mother during pregnancy: fever 1st trimester (exanthematous vs non-exanthematous).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_xray_exposure IS
    'Mother during pregnancy: X-ray exposure.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_drug_intake_non_supplement IS
    'Mother during pregnancy: drugs other than folate/iron/calcium.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_psychotropic_use IS
    'Mother during pregnancy: psychotropic use (details).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_alcohol_tobacco IS
    'Mother during pregnancy: alcohol or tobacco.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_antenatal_visits IS
    'Mother during pregnancy: ante-natal visits (regular or not).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_immunization IS
    'Mother during pregnancy: immunization (TT and others).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_usg IS
    'Mother during pregnancy: USG done or not; abnormalities.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_special_procedures IS
    'Mother during pregnancy: special procedures (e.g. amniocentesis).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_attempted_abortion IS
    'Mother during pregnancy: attempted abortion and reason.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_rh_incompatibility IS
    'Mother during pregnancy: Rh incompatibility.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_single_or_twin IS
    'Mother during pregnancy: single vs twin pregnancy.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_threatened_abortion_bleeding_pv IS
    'Mother during pregnancy: threatened abortion / bleeding PV.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_preeclampsia_eclampsia IS
    'Mother during pregnancy: pre-eclampsia / eclampsia.';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_foetal_movements IS
    'Mother during pregnancy: foetal movements (normal / excessive / sluggish).';

COMMENT ON COLUMN child_cap_detailed_workup.ante_natal_other_significant_history IS
    'Ante-natal: any other significant history (footer of section).';

COMMENT ON COLUMN child_cap_detailed_workup.natal_delivery_location IS
    'Natal: home (trained dai / no trained dai) or hospital.';

COMMENT ON COLUMN child_cap_detailed_workup.natal_delivery_term IS
    'Natal: full term / pre-term / post-term.';

COMMENT ON COLUMN child_cap_detailed_workup.natal_gestational_age_weeks IS
    'Natal: gestational age at birth (weeks).';

COMMENT ON COLUMN child_cap_detailed_workup.natal_delivery_method IS
    'Natal: vaginal / instrumental / caesarean.';

COMMENT ON COLUMN child_cap_detailed_workup.natal_delivery_method_reason IS
    'Natal: reason if instrumental or caesarean.';

COMMENT ON COLUMN child_cap_detailed_workup.natal_other_significant_history IS
    'Natal: any other significant history (footer).';

COMMENT ON COLUMN child_cap_detailed_workup.neonatal_birth_weight_kg IS
    'Neonatal: birth weight (kg).';

COMMENT ON COLUMN child_cap_detailed_workup.neonatal_birth_weight_category IS
    'Neonatal: normal / low / very low / high birth weight.';

COMMENT ON COLUMN child_cap_detailed_workup.neonatal_lga IS
    'Neonatal: large for gestational age (yes/no or note).';

COMMENT ON COLUMN child_cap_detailed_workup.neonatal_hospital_incubator_nicu IS
    'Neonatal: incubator / NICU or similar.';

COMMENT ON COLUMN child_cap_detailed_workup.neonatal_icu_stay_details IS
    'Neonatal: details of ICU/NICU stay.';

COMMENT ON COLUMN child_cap_detailed_workup.neonatal_other_significant_history IS
    'Neonatal/post-natal: any other significant history (footer).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_social_smile_age IS
    'Development: social smile (ref. ~6–8 wk).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_neck_holding_age IS
    'Development: neck holding (ref. ~3–5 mo).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_recognizing_mother_age IS
    'Development: recognizing mother (ref. ~2–4 mo).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_rolling_over_age IS
    'Development: rolling over (ref. ~5–7 mo).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_sitting_without_support_age IS
    'Development: sitting without support (ref. ~8–10 mo).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_first_meaningful_word_age IS
    'Development: first meaningful word (ref. ~7–12 mo).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_standing_with_support_age IS
    'Development: standing with support (ref. ~10–12 mo).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_walking_age IS
    'Development: walking (ref. ~12–14 mo).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_teething_age IS
    'Development: teething (ref. form).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_ten_meaningful_words_age IS
    'Development: ten meaningful words (ref. ~1½ yr).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_two_word_phrases_age IS
    'Development: two-word phrases (ref. ~16–30 mo).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_fluent_speech_sentence_age IS
    'Development: fluent speech / sentences (ref. ~3–4 yr).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_bowel_control_age IS
    'Development: bowel control (ref. ~2–4 yr).';

COMMENT ON COLUMN child_cap_detailed_workup.dev_bladder_control_age IS
    'Development: bladder control (ref. ~3–5 yr).';

COMMENT ON COLUMN child_cap_detailed_workup.immunization_iap_grid IS
    'IAP immunization schedule capture (grid): vaccine/dose/timepoint → date given or status; JSON shape by app.';

COMMENT ON COLUMN child_cap_detailed_workup.habits_feeding_type IS
    'Habits feeding: breast / expressed milk / bottle / katori-spoon / mixed.';

COMMENT ON COLUMN child_cap_detailed_workup.habits_exclusive_breastfeeding_months IS
    'Months of exclusive breastfeeding if applicable.';

COMMENT ON COLUMN child_cap_detailed_workup.habits_reasons_not_exclusive_breastfeeding IS
    'Reasons not exclusively breastfed (mother or infant).';

COMMENT ON COLUMN child_cap_detailed_workup.habits_weaning_age_months IS
    'Age at weaning (months).';

COMMENT ON COLUMN child_cap_detailed_workup.habits_neurotic_nail_biting IS
    'Neurotic trait tick: nail biting.';

COMMENT ON COLUMN child_cap_detailed_workup.habits_neurotic_thumb_sucking IS
    'Neurotic trait tick: thumb sucking.';

COMMENT ON COLUMN child_cap_detailed_workup.habits_neurotic_morbid_fears IS
    'Neurotic trait tick: morbid fears (persons, animals, darkness, etc.).';

COMMENT ON COLUMN child_cap_detailed_workup.play_preference IS
    'Play: individual/solitary vs group vs in group but plays alone.';

COMMENT ON COLUMN child_cap_detailed_workup.play_friends_quantity IS
    'Play: few vs many friends.';

COMMENT ON COLUMN child_cap_detailed_workup.play_friends_age_relation IS
    'Play: friends older / younger / same age.';

COMMENT ON COLUMN child_cap_detailed_workup.habits_play_other_significant_history IS
    'Habits & play: any other significant history.';

COMMENT ON COLUMN child_cap_detailed_workup.edu_schooling_type IS
    'Education (a): home / day-boarding / hostel.';

COMMENT ON COLUMN child_cap_detailed_workup.edu_school_nature IS
    'Education (b): normal / special / integrated / others.';

COMMENT ON COLUMN child_cap_detailed_workup.edu_literacy_before_formal_schooling IS
    'Education (c): literacy exposure before formal schooling; details if yes.';

COMMENT ON COLUMN child_cap_detailed_workup.edu_age_started_schooling IS
    'Education (d): age when schooling started.';

COMMENT ON COLUMN child_cap_detailed_workup.edu_studied_up_to_class IS
    'Education (d): class studied up to.';

COMMENT ON COLUMN child_cap_detailed_workup.sexual_menstrual_age_appropriate_context IS
    'Sexual/menstrual: age- and sex-appropriate framing (form instruction).';

COMMENT ON COLUMN child_cap_detailed_workup.sexual_menstrual_menarche_regularity_lmp IS
    'Menarche age, cycle regularity and duration, LMP.';

COMMENT ON COLUMN child_cap_detailed_workup.sexual_menstrual_intercourse_protection IS
    'Sexual intercourse if present; protected / unprotected.';

COMMENT ON COLUMN child_cap_detailed_workup.temperament_activity_infancy IS
    'Temperament: Activity — infancy (paired columns *_infancy / *_later for each of 10 dimensions).';

COMMENT ON COLUMN child_cap_detailed_workup.child_strengths_psychosocial_assets IS
    'Strengths/assets: physical, psychological, cognitive, creative attributes.';

COMMENT ON COLUMN child_cap_detailed_workup.child_strengths_interests_hobbies IS
    'Strengths: child-reported interests and hobbies.';

COMMENT ON COLUMN child_cap_detailed_workup.family_primary_caregivers IS
    'Family structure: primary caregiver(s).';

COMMENT ON COLUMN child_cap_detailed_workup.ppf_mother_permissiveness_rigidity IS
    'Parental functioning: permissiveness/rigidity — Mother (paired Mother/Father columns per spectrum).';

COMMENT ON COLUMN child_cap_detailed_workup.pci_interaction_patterns_communication_warmth_abuse_indulgence IS
    'Parent–child interaction: communication, criticism, warmth, hostility, abuse, over-protectiveness, over-indulgence.';

COMMENT ON COLUMN child_cap_detailed_workup.pci_attachment_bonding_child_parents IS
    'Parent–child: attachment-bonding; child’s attitude towards parents.';

COMMENT ON COLUMN child_cap_detailed_workup.pci_family_understanding_illness_expectations IS
    'Parents/family understanding of child’s illness; expectations of the child.';

COMMENT ON COLUMN child_cap_detailed_workup.family_functioning_discord_communication IS
    'Family functioning: discord, lack of communication, problems as a whole.';

COMMENT ON COLUMN child_cap_detailed_workup.family_functioning_role_significant_others IS
    'Family functioning: role of significant others beyond parents.';

COMMENT ON COLUMN child_cap_detailed_workup.family_functioning_stressful_events_child_impact IS
    'Stressful living conditions / life events (birth, death, illness, etc.); effect on child.';

COMMENT ON COLUMN child_cap_detailed_workup.social_environmental_dwelling_crowding_finance_neighborhood IS
    'Social–environmental (1): dwelling, crowding, finances/stress, neighborhood, adversarial influences on child.';

COMMENT ON COLUMN child_cap_detailed_workup.social_environmental_resources_milieu_support IS
    'Social–environmental (2): socio-environmental resources, social/religious participation, extended family & community support.';

COMMENT ON COLUMN child_cap_detailed_workup.gpe_built IS
    'General PE: built / physique.';

COMMENT ON COLUMN child_cap_detailed_workup.gpe_height_length_cm IS
    'General PE: height or length (cm).';

COMMENT ON COLUMN child_cap_detailed_workup.gpe_weight_kg IS
    'General PE: weight (kg).';

COMMENT ON COLUMN child_cap_detailed_workup.gpe_general_signs IS
    'General PE: pallor, icterus, clubbing, cyanosis, lymphadenopathy, edema, etc.';

COMMENT ON COLUMN child_cap_detailed_workup.sys_exam_respiratory IS
    'Systemic PE: respiratory system.';

COMMENT ON COLUMN child_cap_detailed_workup.sys_exam_nervous_system IS
    'Systemic PE: nervous system.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_interview_approach_notes IS
    'MSE: approach — unstructured vs direct elicitation; name used; toys/materials; rapport before sensitive topics.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_general_appearance_attitude_behaviour IS
    'MSE: general appearance, attitude, behaviour.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_relationship_capacity IS
    'MSE: relationship capacity (anxiety, fear, depression, shyness; separation; examiner interaction).';

COMMENT ON COLUMN child_cap_detailed_workup.mse_spontaneous_motility IS
    'MSE: spontaneous motility (activity, exploration, mannerisms, stereotypies, involuntary movements).';

COMMENT ON COLUMN child_cap_detailed_workup.mse_speech_and_language IS
    'MSE: speech and language (spontaneous/meaningful speech, tone, relevance, echolalia, etc.).';

COMMENT ON COLUMN child_cap_detailed_workup.mse_affect IS
    'MSE: affect — subjective tone, objective range, reactivity, lability, appropriateness to content.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_thought_flow IS
    'MSE: thought — flow.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_thought_form IS
    'MSE: thought — form.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_thought_content IS
    'MSE: thought — content (e.g. depressive cognitions, worry, delusions; attitude to family/school/playmates; 3-wish test in younger children).';

COMMENT ON COLUMN child_cap_detailed_workup.mse_possession IS
    'MSE: possession-related inquiry/findings.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_perception IS
    'MSE: perception.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_hmf_orientation IS
    'MSE: higher mental functions — orientation (time, place, person; age-appropriate).';

COMMENT ON COLUMN child_cap_detailed_workup.mse_hmf_attention_distractibility IS
    'MSE: HMF — attention span, topic/activity focus, distractibility.';

COMMENT ON COLUMN child_cap_detailed_workup.mse_hmf_memory IS
    'MSE: HMF — memory (immediate, short- and long-term; e.g. 3-item recall).';

COMMENT ON COLUMN child_cap_detailed_workup.mse_hmf_intelligence_fund_of_knowledge IS
    'MSE: HMF — overall intelligence, fund of knowledge (age-appropriate tasks).';

COMMENT ON COLUMN child_cap_detailed_workup.mse_insight_motivation IS
    'MSE: insight and motivation.';

COMMENT ON COLUMN child_cap_detailed_workup.investigations_assessments IS
    'Investigations/assessments: psychological & physical rows; test_name_ref, results, optional per-row comments (JSON; see migration header).';

COMMENT ON COLUMN child_cap_detailed_workup.diagnostic_formulation IS
    'Diagnostic formulation.';

COMMENT ON COLUMN child_cap_detailed_workup.provisional_diagnosis IS
    'Provisional diagnosis.';

COMMENT ON COLUMN child_cap_detailed_workup.icd10_diagnosis IS
    'ICD-10 diagnosis.';

COMMENT ON COLUMN child_cap_detailed_workup.dsm5_diagnosis IS
    'DSM-5 diagnosis.';

COMMENT ON COLUMN child_cap_detailed_workup.residents_plan_of_management IS
    'Resident plan of management.';

COMMENT ON COLUMN child_cap_detailed_workup.consultant_sr_discussion IS
    'Discussion with consultant / senior resident.';

COMMENT ON COLUMN child_cap_detailed_workup.final_diagnosis IS
    'Final diagnosis (narrative; distinct from provisional where both used).';

COMMENT ON COLUMN child_cap_detailed_workup.final_icd10_diagnosis IS
    'Final ICD-10 coding (post–consultant review if applicable).';

COMMENT ON COLUMN child_cap_detailed_workup.final_dsm5_diagnosis IS
    'Final DSM-5 coding.';

COMMENT ON COLUMN child_cap_detailed_workup.mgmt_planned_followup_setting_frequency IS
    'Management planned: setting and frequency of follow-up.';

COMMENT ON COLUMN child_cap_detailed_workup.mgmt_planned_further_exploration IS
    'Management planned: further exploration (areas in detail).';

COMMENT ON COLUMN child_cap_detailed_workup.mgmt_planned_rating_scales IS
    'Management planned: rating scales.';

COMMENT ON COLUMN child_cap_detailed_workup.management_plan_interventions IS
    'Management detail grid: referral, liaison, drug, psychotherapy, parental work, etc. (JSON; see migration header).';

COMMENT ON COLUMN child_cap_detailed_workup.management_advice IS
    'ADVICE (free text).';

COMMENT ON COLUMN child_cap_detailed_workup.signature_consultant_sr_name IS
    'Consultant / SR name in block letters (as on form).';

COMMENT ON COLUMN child_cap_detailed_workup.signature_resident_name IS
    'Resident name in block letters.';

-- ---------------------------------------------------------------------------
-- Upgrade path: if this table was created from an earlier revision of this
-- migration, add new columns without failing on fresh installs.
-- ---------------------------------------------------------------------------
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_developmental_history_symptoms TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_symptoms_impairment_developmental_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_behavioral_symptom_factors TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_phenomenology_symptoms TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_adolescent_biological_enquiry TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_sensory_impairments TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_comorbid_physical_illness TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_treatment_history TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS hpi_continued TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS relevant_negative_history TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS functioning_overall_assessment TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS impairment_severity VARCHAR(30);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS treatment_who_initiated_first_contact TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS treatment_first_contact_due_to VARCHAR(80);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS treatment_first_contact_due_to_other TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS treatment_history_chart JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS past_psychiatric_history TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS medical_history_details TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS medical_enquiry_epilepsy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS medical_enquiry_syncope TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS medical_enquiry_exercise_intolerance TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS medical_enquiry_cardiac_ailment TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_history_details TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_history_epilepsy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_history_sudden_cardiac_death TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_pedigree_description TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_consanguinity TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_previous_abortions_stillbirths TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS life_chart_details TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS life_chart_psychiatric_past_present TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS life_chart_physical_comorbidities_treatment TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS life_chart_relation_physical_psychiatric TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_pregnancy_planned TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_pregnancy_wanted TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_pregnancy_unwanted_reason TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_mother_age_conception INTEGER;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_father_age_conception INTEGER;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_conception_method TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_preconception_folate TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_preconception_folate_months TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_nutritional_status_mother TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_medical_illness_treatment TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_other_medical_surgery TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_hyperemesis TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_fever_first_trimester TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_xray_exposure TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_drug_intake_non_supplement TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_psychotropic_use TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_alcohol_tobacco TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_antenatal_visits TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_immunization TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_usg TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_special_procedures TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_attempted_abortion TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_rh_incompatibility TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_single_or_twin TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_threatened_abortion_bleeding_pv TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_preeclampsia_eclampsia TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_foetal_movements TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ante_natal_other_significant_history TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_delivery_location TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_delivery_term TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_gestational_age_weeks NUMERIC(5, 2);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_delivery_method TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_delivery_method_reason TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_abnormal_presentation TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_large_head TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_low_placenta TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_prolapsed_cord TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_cord_around_neck TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_foetal_distress TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_prolonged_labour TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_prom TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_non_progress_labour TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_meconium_stained TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_eclampsia TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_excessive_bleeding_pph TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_infections TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS natal_other_significant_history TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_birth_weight_kg NUMERIC(6, 3);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_birth_weight_category TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_lga TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_birth_cry TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_colour TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_respiratory_distress TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_activity TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_suckling TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_feeding_method TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_feeding_schedule TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_feeding_problem TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_urine_stools TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_congenital_anomalies_stigmata TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_seizures TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_jaundice TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_infection TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_hospital_incubator_nicu TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_icu_stay_details TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS neonatal_other_significant_history TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_social_smile_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_neck_holding_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_recognizing_mother_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_rolling_over_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_sitting_without_support_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_first_meaningful_word_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_standing_with_support_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_walking_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_teething_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_ten_meaningful_words_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_two_word_phrases_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_fluent_speech_sentence_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_bowel_control_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dev_bladder_control_age TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS immunization_iap_grid JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_feeding_type TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_exclusive_breastfeeding_months INTEGER;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_reasons_not_exclusive_breastfeeding TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_weaning_age_months INTEGER;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_weaning_difficulties TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_food_fads_preferences TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_sleep_details TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_sleep_bedtime_behavioral_problems TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_sleep_abnormal_movements_behaviours TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_neurotic_nail_biting BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_neurotic_thumb_sucking BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_neurotic_morbid_fears BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_neurotic_obstinacy BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_neurotic_temper_tantrums BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_neurotic_enuresis_encopresis BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_preference TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_friends_quantity TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_friends_age_relation TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_indifferent_to_playmates BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_inappropriate_intrusion_impulsivity BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_understands_rules_based_games BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_shows_cooperation_in_play BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_is_bully BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_bully_details TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_is_bullied BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_bullied_details TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_peculiarities TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_indulges_functional_play BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS play_indulges_symbolic_pretend_play BOOLEAN;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS habits_play_other_significant_history TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_schooling_type TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_school_nature TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_literacy_before_formal_schooling TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_age_started_schooling TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_studied_up_to_class TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_current_school_address TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_attendance TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_scholastic_performance TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_peer_group_adjustment TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_problems_with_teachers TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_classroom_behaviour TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_school_change_frequency_reasons TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_dropout_reasons TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS edu_any_other_information TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sexual_menstrual_age_appropriate_context TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sexual_menstrual_menarche_regularity_lmp TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sexual_menstrual_reaction_menarche TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sexual_menstrual_orientation TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sexual_menstrual_masturbation_guilt TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sexual_menstrual_intercourse_protection TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sexual_menstrual_knowledge_perceptions TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_activity_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_activity_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_rhythmicity_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_rhythmicity_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_approach_withdrawal_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_approach_withdrawal_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_adaptability_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_adaptability_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_mood_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_mood_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_intensity_reaction_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_intensity_reaction_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_threshold_responsiveness_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_threshold_responsiveness_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_attention_span_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_attention_span_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_persistence_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_persistence_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_distractibility_infancy TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS temperament_distractibility_later TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS child_strengths_psychosocial_assets TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS child_strengths_interests_hobbies TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_primary_caregivers TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_primary_breadwinner TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_structure_type TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_main_decision_makers TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_mother_permissiveness_rigidity TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_father_permissiveness_rigidity TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_mother_consistency_inconsistency TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_father_consistency_inconsistency TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_mother_discipline_liberal_supervision TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_father_discipline_liberal_supervision TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_mother_approval_disapproval_interest TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_father_approval_disapproval_interest TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_mother_protectiveness_overprotection TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_father_protectiveness_overprotection TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_mother_toleration_deviation TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS ppf_father_toleration_deviation TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS pci_interaction_patterns_communication_warmth_abuse_indulgence TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS pci_attachment_bonding_child_parents TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS pci_family_understanding_illness_expectations TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_functioning_discord_communication TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_functioning_role_significant_others TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS family_functioning_stressful_events_child_impact TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS social_environmental_dwelling_crowding_finance_neighborhood TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS social_environmental_resources_milieu_support TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_built TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_height_length_cm NUMERIC(6, 2);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_height_growth_chart_position TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_weight_kg NUMERIC(7, 3);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_weight_growth_chart_position TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_bmi NUMERIC(6, 2);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_bmi_growth_chart_position TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_waist_circumference_cm NUMERIC(6, 2);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_hip_circumference_cm NUMERIC(6, 2);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_head_circumference_cm NUMERIC(6, 2);
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_head_circumference_growth_chart_position TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_vitals_hr TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_vitals_rr TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_vitals_bp TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_general_signs TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_facial_dysmorphism TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS gpe_skin_neurocutaneous_stigmata TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sys_exam_respiratory TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sys_exam_gastrointestinal TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sys_exam_cardiovascular TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS sys_exam_nervous_system TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_interview_approach_notes TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_general_appearance_attitude_behaviour TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_relationship_capacity TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_spontaneous_motility TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_speech_and_language TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_affect TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_thought_flow TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_thought_form TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_thought_content TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_possession TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_perception TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_hmf_orientation TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_hmf_attention_distractibility TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_hmf_memory TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_hmf_intelligence_fund_of_knowledge TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mse_insight_motivation TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS investigations_assessments JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS diagnostic_formulation TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS provisional_diagnosis TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS icd10_diagnosis TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS dsm5_diagnosis TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS residents_plan_of_management TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS consultant_sr_discussion TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS final_diagnosis TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS final_icd10_diagnosis TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS final_dsm5_diagnosis TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mgmt_planned_followup_setting_frequency TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mgmt_planned_further_exploration TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS mgmt_planned_rating_scales TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS management_plan_interventions JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS management_advice TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS signature_consultant_sr_name TEXT;
ALTER TABLE child_cap_detailed_workup ADD COLUMN IF NOT EXISTS signature_resident_name TEXT;

-- Upgrade: drop old school_type constraint (allowed 'Regular'/'Special') and replace with correct values.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'child_cap_detailed_workup_school_type_check'
          AND conrelid = 'child_cap_detailed_workup'::regclass
    ) THEN
        ALTER TABLE child_cap_detailed_workup
            DROP CONSTRAINT child_cap_detailed_workup_school_type_check;
    END IF;
    ALTER TABLE child_cap_detailed_workup
        ADD CONSTRAINT child_cap_detailed_workup_school_type_check
        CHECK (school_type IS NULL OR school_type IN ('Government', 'Private', 'Special'));
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'child_cap_detailed_workup_impairment_severity_check'
    ) THEN
        ALTER TABLE child_cap_detailed_workup
            ADD CONSTRAINT child_cap_detailed_workup_impairment_severity_check
            CHECK (
                impairment_severity IS NULL
                OR impairment_severity IN (
                    'Mild',
                    'Moderate',
                    'Severe',
                    'None',
                    'Not impaired'
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'child_cap_detailed_workup_treatment_first_contact_due_to_check'
    ) THEN
        ALTER TABLE child_cap_detailed_workup
            ADD CONSTRAINT child_cap_detailed_workup_treatment_first_contact_due_to_check
            CHECK (
                treatment_first_contact_due_to IS NULL
                OR treatment_first_contact_due_to IN (
                    'Parental perception',
                    'Teacher referral',
                    'Referral from any physician',
                    'Referral from a pediatrician',
                    'Advice of a relative',
                    'Any other'
                )
            );
    END IF;
END $$;
