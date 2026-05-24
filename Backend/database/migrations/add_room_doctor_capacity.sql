-- Add doctor_capacity to rooms table
-- Allows rooms to have more than one doctor (e.g. Faculty + Residents in shared consultation rooms)
-- Default of 1 preserves existing single-doctor behaviour for all existing rooms

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS doctor_capacity INTEGER NOT NULL DEFAULT 1;

-- Enforce valid range: 1-5 doctors per room
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rooms_doctor_capacity_check'
  ) THEN
    ALTER TABLE rooms
      ADD CONSTRAINT rooms_doctor_capacity_check
      CHECK (doctor_capacity >= 1 AND doctor_capacity <= 5);
  END IF;
END
$$;
