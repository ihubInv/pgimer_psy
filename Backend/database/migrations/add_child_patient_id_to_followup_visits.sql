-- Migration: Add child_patient_id to followup_visits table
-- Description: Support follow-up visits for child patients
-- Date: 2026-01-23

-- Add child_patient_id column to followup_visits table
ALTER TABLE followup_visits 
ADD COLUMN IF NOT EXISTS child_patient_id INTEGER REFERENCES child_patient_registrations(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_followup_visits_child_patient_id ON followup_visits(child_patient_id);

-- Add check constraint to ensure either patient_id or child_patient_id is set
ALTER TABLE followup_visits 
ADD CONSTRAINT check_patient_id_or_child_patient_id 
CHECK (
  (patient_id IS NOT NULL AND child_patient_id IS NULL) OR 
  (patient_id IS NULL AND child_patient_id IS NOT NULL)
);
