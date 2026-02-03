-- Migration: Add mobile_no and age columns, update age_group and head_education constraints
-- Description: Enhance child patient registration with mobile number, age field, and updated education options
-- Date: 2026-01-30

-- Add mobile_no column (10 digits, numeric only)
ALTER TABLE child_patient_registrations 
ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(10);

-- Add age column (integer)
ALTER TABLE child_patient_registrations 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Update age_group constraint to include new age-based groups
-- Drop existing constraint
ALTER TABLE child_patient_registrations 
DROP CONSTRAINT IF EXISTS child_patient_registrations_age_group_check;

-- Add new constraint with original age groups (children up to 15 years)
ALTER TABLE child_patient_registrations 
ADD CONSTRAINT child_patient_registrations_age_group_check 
CHECK (
  age_group IS NULL OR 
  age_group IN (
    'Less than 1 year', 
    '1 – 5 years', 
    '5 – 10 years', 
    '10 – 15 years'
  )
);

-- Update head_education constraint to include new options
-- Drop existing constraint
ALTER TABLE child_patient_registrations 
DROP CONSTRAINT IF EXISTS child_patient_registrations_head_education_check;

-- Add new constraint with Post-Graduate and Ph.D options
ALTER TABLE child_patient_registrations 
ADD CONSTRAINT child_patient_registrations_head_education_check 
CHECK (
  head_education IS NULL OR 
  head_education IN (
    'Illiterate', 
    'Primary', 
    'Middle', 
    'Matric', 
    'Graduate', 
    'Post-Graduate',
    'Ph.D',
    'Others'
  )
);

-- Add index for mobile_no for better query performance
CREATE INDEX IF NOT EXISTS idx_child_patient_mobile_no ON child_patient_registrations(mobile_no);

-- Add comment
COMMENT ON COLUMN child_patient_registrations.mobile_no IS '10-digit mobile number (numeric only)';
COMMENT ON COLUMN child_patient_registrations.age IS 'Child age in years (used to auto-calculate age_group)';
