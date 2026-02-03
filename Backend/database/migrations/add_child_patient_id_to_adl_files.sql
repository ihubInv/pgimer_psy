-- Add child_patient_id column to adl_files table
-- This allows ADL files to be linked to child patients (similar to adult patients)

ALTER TABLE adl_files 
ADD COLUMN IF NOT EXISTS child_patient_id INTEGER REFERENCES child_patient_registrations(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_adl_files_child_patient_id ON adl_files(child_patient_id);

-- Add constraint to ensure either patient_id or child_patient_id is set (but not both)
ALTER TABLE adl_files 
ADD CONSTRAINT check_patient_id_or_child_patient_id 
CHECK (
  (patient_id IS NOT NULL AND child_patient_id IS NULL) OR 
  (patient_id IS NULL AND child_patient_id IS NOT NULL)
);
