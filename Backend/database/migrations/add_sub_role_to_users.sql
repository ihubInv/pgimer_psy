-- Add sub_role column for Resident users (Junior Resident / Senior Resident)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sub_role VARCHAR(50) NULL;

-- Backfill existing Resident users with default sub-role
UPDATE users
SET sub_role = 'Junior Resident'
WHERE role = 'Resident' AND sub_role IS NULL;

-- Enforce: Resident must have a valid sub_role; other roles must not have sub_role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_sub_role_check;
ALTER TABLE users ADD CONSTRAINT users_sub_role_check CHECK (
  (
    role = 'Resident'
    AND sub_role IN ('Junior Resident', 'Senior Resident')
  )
  OR (
    role <> 'Resident'
    AND sub_role IS NULL
  )
);

COMMENT ON COLUMN users.sub_role IS 'Resident sub-role: Junior Resident or Senior Resident. NULL for non-Resident roles.';
