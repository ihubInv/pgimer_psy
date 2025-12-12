const db = require('../config/database');
const crypto = require('crypto');

class PasswordChangeOTP {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.otp = data.otp;
    this.verification_token = data.verification_token; // Token issued after OTP verification
    this.expires_at = data.expires_at;
    this.otp_verified = data.otp_verified || false;
    this.used = data.used || false;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new password change OTP
  static async create(userId) {
    try {
      // First, mark any existing unused OTPs for this user as used
      await db.query(
        'UPDATE password_change_otps SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      );

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const paddedOTP = otp.padStart(6, '0');
      
      console.log(`[PasswordChangeOTP] Generated OTP for user ${userId}: "${paddedOTP}"`);
      
      // Set expiration time (15 minutes from now)
      const result = await db.query(
        `INSERT INTO password_change_otps (user_id, otp, expires_at) 
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes') 
         RETURNING *`,
        [userId, paddedOTP]
      );

      return new PasswordChangeOTP(result.rows[0]);
    } catch (error) {
      console.error('[PasswordChangeOTP] Error creating OTP:', error);
      throw error;
    }
  }

  // Verify OTP and generate verification token
  static async verifyOTP(userId, otp) {
    try {
      // Sanitize OTP input
      const sanitizedOTP = String(otp || '').trim().replace(/\s+/g, '');
      
      // Validate OTP format
      if (!/^\d{6}$/.test(sanitizedOTP)) {
        console.error(`[PasswordChangeOTP] Invalid OTP format for user ${userId}: "${otp}"`);
        return null;
      }

      // Find unused and non-expired OTP
      const checkResult = await db.query(
        `SELECT * FROM password_change_otps 
         WHERE user_id = $1 AND otp = $2 AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, sanitizedOTP]
      );

      if (checkResult.rows.length === 0) {
        console.log(`[PasswordChangeOTP] No valid OTP found for user ${userId}`);
        return null;
      }

      const otpRecord = new PasswordChangeOTP(checkResult.rows[0]);

      // Generate verification token (random 32-byte hex string)
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Mark OTP as verified and store verification token
      await db.query(
        `UPDATE password_change_otps 
         SET otp_verified = true, verification_token = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [verificationToken, otpRecord.id]
      );

      otpRecord.otp_verified = true;
      otpRecord.verification_token = verificationToken;

      return otpRecord;
    } catch (error) {
      console.error('[PasswordChangeOTP] Error verifying OTP:', error);
      throw error;
    }
  }

  // Verify token (used when changing password)
  static async verifyToken(userId, token) {
    try {
      const result = await db.query(
        `SELECT * FROM password_change_otps 
         WHERE user_id = $1 AND verification_token = $2 AND otp_verified = true AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new PasswordChangeOTP(result.rows[0]);
    } catch (error) {
      console.error('[PasswordChangeOTP] Error verifying token:', error);
      throw error;
    }
  }

  // Mark OTP as used (after password is changed)
  async markAsUsed() {
    try {
      await db.query(
        'UPDATE password_change_otps SET used = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [this.id]
      );
      this.used = true;
      return true;
    } catch (error) {
      console.error('[PasswordChangeOTP] Error marking as used:', error);
      throw error;
    }
  }

  // Find by user ID (for cleanup)
  static async findByUserId(userId) {
    try {
      const result = await db.query(
        `SELECT * FROM password_change_otps 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new PasswordChangeOTP(result.rows[0]);
    } catch (error) {
      console.error('[PasswordChangeOTP] Error finding by user ID:', error);
      throw error;
    }
  }
}

module.exports = PasswordChangeOTP;

