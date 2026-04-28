-- Mobile (opaque) auth tokens.
-- These are long-lived, non-JWT tokens used by the mobile app so it does not
-- need to manage refresh / expiry on the device. Server has full control:
-- revoke a row to log a device out instantly; deactivating/deleting the user
-- also blocks the token via the existing is_active / FK CASCADE checks.

CREATE TABLE IF NOT EXISTS mobile_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  device_info VARCHAR(255),
  ip_address VARCHAR(64),
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mobile_tokens_token ON mobile_tokens(token);
CREATE INDEX IF NOT EXISTS idx_mobile_tokens_user_id ON mobile_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_tokens_user_active ON mobile_tokens(user_id, is_revoked);
