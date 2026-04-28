const crypto = require('crypto');
const db = require('../config/database');

/**
 * Opaque, DB-backed authentication token for the mobile app.
 *
 * Why this exists:
 * - Mobile UX wants "login once, no refresh dance".
 * - Server keeps full control: revoke a row to log a device out instantly.
 * - User deactivation / deletion already blocks access via auth middleware.
 *
 * Token format: `mt_<128 hex chars>` so the auth middleware can detect an
 * opaque token without trying to JWT-parse it.
 */
class MobileToken {
  static TOKEN_PREFIX = 'mt_';

  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.token = data.token;
    this.device_info = data.device_info;
    this.ip_address = data.ip_address;
    this.is_revoked = data.is_revoked === true;
    this.last_activity = data.last_activity;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static isMobileTokenString(token) {
    return typeof token === 'string' && token.startsWith(MobileToken.TOKEN_PREFIX);
  }

  static generateToken() {
    return MobileToken.TOKEN_PREFIX + crypto.randomBytes(64).toString('hex');
  }

  static async create(userId, deviceInfo = null, ipAddress = null) {
    const token = MobileToken.generateToken();
    const result = await db.query(
      `INSERT INTO mobile_tokens (user_id, token, device_info, ip_address, last_activity)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, token, deviceInfo, ipAddress]
    );
    return new MobileToken(result.rows[0]);
  }

  static async findByToken(token) {
    if (!MobileToken.isMobileTokenString(token)) return null;
    const result = await db.query(
      `SELECT * FROM mobile_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    if (result.rows.length === 0) return null;
    return new MobileToken(result.rows[0]);
  }

  /** True only if the row exists and has not been revoked. */
  isValid() {
    return this.id != null && this.is_revoked === false;
  }

  async updateActivity() {
    const result = await db.query(
      `UPDATE mobile_tokens
       SET last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [this.id]
    );
    if (result.rows.length > 0) {
      this.last_activity = result.rows[0].last_activity;
      this.updated_at = result.rows[0].updated_at;
    }
    return this;
  }

  async revoke() {
    const result = await db.query(
      `UPDATE mobile_tokens
       SET is_revoked = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [this.id]
    );
    if (result.rows.length > 0) {
      this.is_revoked = true;
      this.updated_at = result.rows[0].updated_at;
    }
    return this;
  }

  static async revokeAllForUser(userId) {
    const result = await db.query(
      `UPDATE mobile_tokens
       SET is_revoked = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_revoked = FALSE`,
      [userId]
    );
    return result.rowCount;
  }
}

module.exports = MobileToken;
