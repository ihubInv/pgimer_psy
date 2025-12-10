const db = require('../config/database');
const crypto = require('crypto');

class PasswordResetToken {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.token = data.token;
    this.otp = data.otp;
    this.expires_at = data.expires_at;
    this.used = data.used;
    this.otp_verified = data.otp_verified || false;
    this.created_at = data.created_at;
  }

  // Generate a secure random token
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate a 6-digit OTP
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create a new password reset token
  static async create(userId) {
    try {
      const token = this.generateToken();
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      // Invalidate any existing tokens for this user
      await db.query(
        'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      );

      const result = await db.query(
        `INSERT INTO password_reset_tokens (user_id, token, otp, expires_at) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userId, token, otp, expiresAt]
      );

      return new PasswordResetToken(result.rows[0]);
    } catch (error) {
      console.error('Error creating password reset token:', error);
      throw new Error('Failed to create password reset token');
    }
  }

  // Find a valid token by token string (for password reset - requires OTP verification)
  static async findByToken(token) {
    try {
      const result = await db.query(
        `SELECT prt.*, u.name, u.email 
         FROM password_reset_tokens prt 
         JOIN users u ON prt.user_id = u.id 
         WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW() AND prt.otp_verified = true`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tokenInstance = new PasswordResetToken(result.rows[0]);
      tokenInstance.user_name = result.rows[0].name;
      tokenInstance.user_email = result.rows[0].email;
      return tokenInstance;
    } catch (error) {
      console.error('Error finding password reset token:', error);
      throw new Error('Failed to find password reset token');
    }
  }

  // Find a valid token by user ID
  static async findByUserId(userId) {
    try {
      const result = await db.query(
        `SELECT prt.*, u.name, u.email 
         FROM password_reset_tokens prt 
         JOIN users u ON prt.user_id = u.id 
         WHERE prt.user_id = $1 AND prt.used = false AND prt.expires_at > NOW() 
         ORDER BY prt.created_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tokenInstance = new PasswordResetToken(result.rows[0]);
      tokenInstance.user_name = result.rows[0].name;
      tokenInstance.user_email = result.rows[0].email;
      return tokenInstance;
    } catch (error) {
      console.error('Error finding password reset token by user ID:', error);
      throw new Error('Failed to find password reset token');
    }
  }

  // Verify OTP
  static async verifyOTP(token, otp) {
    try {
      const result = await db.query(
        `SELECT prt.*, u.name, u.email 
         FROM password_reset_tokens prt 
         JOIN users u ON prt.user_id = u.id 
         WHERE prt.token = $1 AND prt.otp = $2 AND prt.used = false AND prt.expires_at > NOW()`,
        [token, otp]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Mark OTP as verified in the database
      await db.query(
        'UPDATE password_reset_tokens SET otp_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].id]
      );

      const tokenInstance = new PasswordResetToken(result.rows[0]);
      tokenInstance.otp_verified = true;
      tokenInstance.user_name = result.rows[0].name;
      tokenInstance.user_email = result.rows[0].email;
      return tokenInstance;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Failed to verify OTP');
    }
  }

  // Mark token as used
  async markAsUsed() {
    try {
      const result = await db.query(
        'UPDATE password_reset_tokens SET used = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Token not found');
      }

      this.used = true;
      this.updated_at = result.rows[0].updated_at;
      return this;
    } catch (error) {
      console.error('Error marking token as used:', error);
      throw new Error('Failed to mark token as used');
    }
  }

  // Clean up expired tokens (utility method)
  static async cleanupExpiredTokens() {
    try {
      const result = await db.query(
        'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = true'
      );
      
      console.log(`Cleaned up ${result.rowCount} expired password reset tokens`);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw new Error('Failed to cleanup expired tokens');
    }
  }

  // Get token statistics (for admin)
  static async getStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_tokens,
          COUNT(CASE WHEN used = true THEN 1 END) as used_tokens,
          COUNT(CASE WHEN used = false AND expires_at > NOW() THEN 1 END) as active_tokens,
          COUNT(CASE WHEN used = false AND expires_at <= NOW() THEN 1 END) as expired_tokens
        FROM password_reset_tokens
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting token stats:', error);
      throw new Error('Failed to get token statistics');
    }
  }
}

module.exports = PasswordResetToken;
