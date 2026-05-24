-- Inter-doctor patient referrals and audit logs

CREATE TABLE IF NOT EXISTS patient_referrals (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    patient_type VARCHAR(10) NOT NULL CHECK (patient_type IN ('adult', 'child')),
    referred_by_doctor_id INTEGER NOT NULL REFERENCES users(id),
    referred_to_doctor_id INTEGER NOT NULL REFERENCES users(id),
    referral_reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'seen', 'completed', 'cancelled')),
    referred_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    seen_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_referrals_no_self_referral CHECK (referred_by_doctor_id <> referred_to_doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_referrals_referred_to
    ON patient_referrals (referred_to_doctor_id, status, referred_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_referrals_referred_by
    ON patient_referrals (referred_by_doctor_id, referred_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_referrals_patient
    ON patient_referrals (patient_type, patient_id, status);

CREATE TABLE IF NOT EXISTS patient_referral_logs (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER NOT NULL REFERENCES patient_referrals(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(30) NOT NULL
        CHECK (action IN ('referred', 'viewed', 'seen', 'note_added', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_referral_logs_referral
    ON patient_referral_logs (referral_id, created_at ASC);

COMMENT ON TABLE patient_referrals IS 'Doctor-to-doctor patient referrals within the department';
COMMENT ON TABLE patient_referral_logs IS 'Audit trail for referral lifecycle events';
