-- Migration: Make patient_id nullable in followup_visits table
-- Description: Allow follow-up visits for child patients where patient_id is NULL
-- Date: 2026-01-30

-- Drop the existing NOT NULL constraint on patient_id (if it exists)
-- First, check if the constraint exists and drop it
DO $$
BEGIN
    -- Check if patient_id has a NOT NULL constraint
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'followup_visits' 
        AND column_name = 'patient_id' 
        AND is_nullable = 'NO'
    ) THEN
        -- Make patient_id nullable
        ALTER TABLE followup_visits 
        ALTER COLUMN patient_id DROP NOT NULL;
        
        RAISE NOTICE 'Made patient_id nullable in followup_visits table';
    ELSE
        RAISE NOTICE 'patient_id is already nullable in followup_visits table';
    END IF;
END $$;

-- Ensure the check constraint exists to ensure either patient_id or child_patient_id is set
-- Drop the constraint if it exists, then recreate it
ALTER TABLE followup_visits 
DROP CONSTRAINT IF EXISTS check_patient_id_or_child_patient_id;

ALTER TABLE followup_visits 
ADD CONSTRAINT check_patient_id_or_child_patient_id 
CHECK (
  (patient_id IS NOT NULL AND child_patient_id IS NULL) OR 
  (patient_id IS NULL AND child_patient_id IS NOT NULL)
);
