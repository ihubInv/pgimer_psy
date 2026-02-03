-- Migration: Add visit_status column to followup_visits table
-- Description: Support marking follow-up visits as completed
-- Date: 2026-01-30

-- Add visit_status column to followup_visits table
ALTER TABLE followup_visits 
ADD COLUMN IF NOT EXISTS visit_status VARCHAR(20) DEFAULT 'scheduled' CHECK (visit_status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

-- Update existing records to have 'scheduled' status if they don't have one
UPDATE followup_visits 
SET visit_status = 'scheduled' 
WHERE visit_status IS NULL;
