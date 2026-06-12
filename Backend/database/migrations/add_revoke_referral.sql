-- Allow 'revoked' as a valid referral status and audit-log action.
-- Also adds a revoked_at timestamp column for tracking when a referral was revoked.

-- 1. Add revoked_at column to patient_referrals
ALTER TABLE patient_referrals
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITHOUT TIME ZONE;

-- 2. Expand the status CHECK constraint on patient_referrals
ALTER TABLE patient_referrals DROP CONSTRAINT IF EXISTS patient_referrals_status_check;
ALTER TABLE patient_referrals
    ADD CONSTRAINT patient_referrals_status_check
    CHECK (status IN ('pending', 'seen', 'completed', 'cancelled', 'revoked'));

-- 3. Expand the action CHECK constraint on patient_referral_logs
ALTER TABLE patient_referral_logs DROP CONSTRAINT IF EXISTS patient_referral_logs_action_check;
ALTER TABLE patient_referral_logs
    ADD CONSTRAINT patient_referral_logs_action_check
    CHECK (action IN ('referred', 'viewed', 'seen', 'note_added', 'completed', 'cancelled', 'revoked'));
