-- Migration: Create child_clinical_proforma table
-- Description: Stores Child Clinical Proforma data for Child Guidance Clinic (CGC)
-- Date: 2026-01-27

-- Create child_clinical_proforma table
CREATE TABLE IF NOT EXISTS child_clinical_proforma (
    id SERIAL PRIMARY KEY,
    
    -- Link to child patient registration
    child_patient_id INTEGER NOT NULL REFERENCES child_patient_registrations(id) ON DELETE CASCADE,
    
    -- Metadata
    filled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    room_no VARCHAR(50),
    assigned_doctor INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- SECTION A: BASIC INFORMATION
    child_name TEXT, -- Auto from registration (read-only)
    age INTEGER, -- Auto / editable
    sex VARCHAR(10) CHECK (sex IN ('Male', 'Female', 'Other')), -- Auto
    date DATE DEFAULT CURRENT_DATE,
    source_of_referral TEXT[], -- Multi-select: Self, Relatives/Friends, School, Other Dept (Paed, Neurology)
    
    -- SECTION B: DURATION OF ILLNESS (Single Select - Radio Buttons)
    duration_of_illness VARCHAR(50) CHECK (duration_of_illness IN (
        'Less than a week',
        '1–4 weeks',
        '2–4 weeks',
        '3–6 months',
        '6–12 months',
        '1–4 years',
        'Since birth',
        'Not known'
    )),
    
    -- SECTION C: ONSET (Single Select)
    onset VARCHAR(50) CHECK (onset IN (
        'Sudden',
        'Insidious (≈ 1 week)',
        'Sub-acute (1–4 weeks)',
        'Gradual (> 4 weeks)'
    )),
    
    -- SECTION D: COURSE (Single Select)
    course VARCHAR(50) CHECK (course IN (
        'Worsening',
        'Steady',
        'Fluctuating',
        'Improving',
        'Periodic',
        'Not known'
    )),
    
    -- SECTION E: ASSOCIATED PHYSICAL ILLNESS
    has_physical_illness BOOLEAN DEFAULT false,
    physical_illness_specification TEXT, -- Mandatory if Yes
    
    -- SECTION F: COMPLAINTS (Checkbox-based – Multiple selection allowed)
    -- 1️⃣ Behavioral Issues
    complaints_obstinacy BOOLEAN DEFAULT false,
    complaints_disobedience BOOLEAN DEFAULT false,
    complaints_aggressiveness BOOLEAN DEFAULT false,
    complaints_temper_tantrums BOOLEAN DEFAULT false,
    complaints_hyperactivity BOOLEAN DEFAULT false,
    complaints_stealing BOOLEAN DEFAULT false,
    complaints_delinquent_behaviour BOOLEAN DEFAULT false,
    complaints_low_intelligence BOOLEAN DEFAULT false,
    complaints_scholastic_backwardness BOOLEAN DEFAULT false,
    complaints_poor_memory BOOLEAN DEFAULT false,
    complaints_speech_difficulty BOOLEAN DEFAULT false,
    complaints_hearing_difficulty BOOLEAN DEFAULT false,
    complaints_epileptic BOOLEAN DEFAULT false,
    complaints_non_epileptic BOOLEAN DEFAULT false,
    complaints_both BOOLEAN DEFAULT false,
    complaints_unclear BOOLEAN DEFAULT false,
    
    -- 2️⃣ Psychological Symptoms
    complaints_abnormal_behaviour BOOLEAN DEFAULT false,
    complaints_irrelevant_talking BOOLEAN DEFAULT false,
    complaints_withdrawnness BOOLEAN DEFAULT false,
    complaints_shyness BOOLEAN DEFAULT false,
    complaints_excessive_clinging BOOLEAN DEFAULT false,
    complaints_anxiety BOOLEAN DEFAULT false,
    complaints_depression BOOLEAN DEFAULT false,
    
    -- 3️⃣ Specific Problems
    complaints_feeding_problems BOOLEAN DEFAULT false,
    complaints_neurosis BOOLEAN DEFAULT false,
    complaints_thumb_sucking BOOLEAN DEFAULT false,
    complaints_nail_biting BOOLEAN DEFAULT false,
    complaints_abnormal_movements BOOLEAN DEFAULT false,
    complaints_somatic_complaints BOOLEAN DEFAULT false,
    complaints_odd_behaviour BOOLEAN DEFAULT false,
    complaints_inadequate_personal_care BOOLEAN DEFAULT false,
    
    -- SECTION G: EXAMINATION
    significant_physical_findings TEXT,
    physical_development VARCHAR(50) CHECK (physical_development IN ('Average', 'Less than average')),
    family_history TEXT[], -- Multi-select: Epilepsy, BPAD, Schizophrenia, Drug abuse, Others
    family_history_details TEXT, -- Conditional Textarea (if Others selected)
    
    -- SECTION H: DIAGNOSIS & INVESTIGATION
    investigation_detailed_medical_workup BOOLEAN DEFAULT false,
    investigation_social_family_assessment BOOLEAN DEFAULT false,
    investigation_school_related_evaluation BOOLEAN DEFAULT false,
    investigation_play_observation BOOLEAN DEFAULT false,
    investigation_neurology_consultation BOOLEAN DEFAULT false,
    investigation_paediatrics_consultation BOOLEAN DEFAULT false,
    investigation_ent_consultation BOOLEAN DEFAULT false,
    investigation_iq_testing BOOLEAN DEFAULT false,
    investigation_psychological_tests BOOLEAN DEFAULT false,
    remarks_provisional_diagnosis TEXT,
    
    -- SECTION I: THERAPY SUGGESTED (Multiple selection)
    therapy_drugs BOOLEAN DEFAULT false,
    therapy_antiepileptics BOOLEAN DEFAULT false,
    therapy_parental_counselling BOOLEAN DEFAULT false,
    therapy_play_therapy BOOLEAN DEFAULT false,
    therapy_individual_psychotherapy BOOLEAN DEFAULT false,
    therapy_behavioral_therapy BOOLEAN DEFAULT false,
    therapy_psychological_testing BOOLEAN DEFAULT false,
    therapy_nil_evaluation_only BOOLEAN DEFAULT false,
    
    -- SECTION J: DISPOSAL
    disposal_status VARCHAR(50) CHECK (disposal_status IN ('Given', 'Managed in Walk-in only')),
    disposal_reason TEXT, -- Mandatory if Walk-in only
    disposal_date DATE,
    disposal_time TIME,
    disposal_distance TEXT,
    disposal_remarks TEXT,
    
    -- Status & Audit
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_child_clinical_proforma_child_patient_id ON child_clinical_proforma(child_patient_id);
CREATE INDEX IF NOT EXISTS idx_child_clinical_proforma_filled_by ON child_clinical_proforma(filled_by);
CREATE INDEX IF NOT EXISTS idx_child_clinical_proforma_visit_date ON child_clinical_proforma(visit_date);
CREATE INDEX IF NOT EXISTS idx_child_clinical_proforma_assigned_doctor ON child_clinical_proforma(assigned_doctor);
CREATE INDEX IF NOT EXISTS idx_child_clinical_proforma_status ON child_clinical_proforma(status);

-- Add comments
COMMENT ON TABLE child_clinical_proforma IS 'Stores Child Clinical Proforma data for Child Guidance Clinic (CGC)';
COMMENT ON COLUMN child_clinical_proforma.child_patient_id IS 'Reference to child_patient_registrations table';
COMMENT ON COLUMN child_clinical_proforma.status IS 'draft: Can be edited, submitted: Final version';
