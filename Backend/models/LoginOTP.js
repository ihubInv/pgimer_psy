const db = require('../config/database');
const crypto = require('crypto');

class LoginOTP {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.otp = data.otp;
    this.expires_at = data.expires_at;
    this.used = data.used;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // User data fields
    this.name = data.name;
    this.email = data.email;
    this.mobile = data.mobile;
    this.role = data.role;
    this.is_active = data.is_active;
  }

  // Create a new login OTP
  static async create(userId) {
    try {
      // First, mark any existing unused OTPs for this user as used
      await db.query(
        'UPDATE login_otps SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      );

      // Generate 6-digit OTP (ensuring it's always exactly 6 digits)
      // Math.random() * 900000 gives 0-899999, adding 100000 gives 100000-999999
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Ensure it's exactly 6 digits (pad with zeros if needed, though it shouldn't be)
      const paddedOTP = otp.padStart(6, '0');
      
      console.log(`[OTP Create] Generated OTP for user ${userId}: "${paddedOTP}" (original: "${otp}")`);
      
      // Set expiration time (5 minutes from now) - use database time to avoid timezone issues
      const result = await db.query(
        `INSERT INTO login_otps (user_id, otp, expires_at) 
         VALUES ($1, $2, NOW() + INTERVAL '5 minutes') 
         RETURNING *`,
        [userId, paddedOTP]
      );

      console.log(`[OTP Create] OTP stored in database:`, {
        id: result.rows[0].id,
        otp: result.rows[0].otp,
        otp_type: typeof result.rows[0].otp,
        expires_at: result.rows[0].expires_at
      });

      return new LoginOTP(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find login OTP by user ID and OTP
  static async verifyOTP(userId, otp) {
    try {
      // Sanitize OTP input: trim whitespace and ensure it's a string
      const sanitizedOTP = String(otp || '').trim().replace(/\s+/g, '');
      
      // Validate OTP format (should be 6 digits)
      if (!/^\d{6}$/.test(sanitizedOTP)) {
        console.error(`[OTP Verify] Invalid OTP format for user ${userId}: "${otp}" (sanitized: "${sanitizedOTP}")`);
        return null;
      }

      // Debug: Get all recent OTPs for this user to see what's in the database
      const allOTPsResult = await db.query(
        `SELECT id, otp, used, expires_at, created_at, 
         LENGTH(otp) as otp_length, 
         otp::text as otp_text
         FROM login_otps 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [userId]
      );

      console.log(`[OTP Verify] User ${userId} - Looking for OTP: "${sanitizedOTP}"`);
      console.log(`[OTP Verify] Recent OTPs in database:`, allOTPsResult.rows.map(r => ({
        id: r.id,
        otp: r.otp,
        otp_type: typeof r.otp,
        otp_length: r.otp_length,
        used: r.used,
        expires_at: r.expires_at,
        created_at: r.created_at
      })));

      // Try exact match first - prioritize unused and non-expired OTPs (using database time)
      let checkResult = await db.query(
        `SELECT * FROM login_otps 
         WHERE user_id = $1 AND otp = $2 AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, sanitizedOTP]
      );

      // If no exact match, try with string casting (in case of type mismatch)
      if (checkResult.rows.length === 0) {
        console.log(`[OTP Verify] No exact match found, trying with CAST to text`);
        checkResult = await db.query(
          `SELECT * FROM login_otps 
           WHERE user_id = $1 AND otp::text = $2 AND used = false AND expires_at > NOW()
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId, sanitizedOTP]
        );
      }

      // If still no match, try trimming the database OTP (in case it has spaces)
      if (checkResult.rows.length === 0) {
        console.log(`[OTP Verify] No match with CAST, trying with TRIM`);
        checkResult = await db.query(
          `SELECT * FROM login_otps 
           WHERE user_id = $1 AND TRIM(otp::text) = $2 AND used = false AND expires_at > NOW()
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId, sanitizedOTP]
        );
      }
      
      // If still no match, check if OTP exists but is used or expired (for better error messages)
      if (checkResult.rows.length === 0) {
        const anyOTPResult = await db.query(
          `SELECT * FROM login_otps 
           WHERE user_id = $1 AND otp = $2
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId, sanitizedOTP]
        );
        
        if (anyOTPResult.rows.length > 0) {
          const anyOTP = anyOTPResult.rows[0];
          if (anyOTP.used) {
            console.log(`[OTP Verify] OTP found but already used`);
          } else {
            const expiredCheck = await db.query(
              `SELECT expires_at > NOW() as is_valid FROM login_otps WHERE id = $1`,
              [anyOTP.id]
            );
            if (expiredCheck.rows.length > 0 && !expiredCheck.rows[0].is_valid) {
              console.log(`[OTP Verify] OTP found but expired`);
            }
          }
        }
      }

      if (checkResult.rows.length === 0) {
        console.error(`[OTP Verify] ❌ OTP not found for user ${userId}: "${sanitizedOTP}"`);
        console.error(`[OTP Verify] Available OTPs in database:`, allOTPsResult.rows.map(r => ({
          otp: `"${r.otp}"`,
          used: r.used,
          expires_at: r.expires_at
        })));
        
        // Check if there's a similar OTP (maybe with different formatting)
        const similarOTPs = allOTPsResult.rows.filter(r => {
          const dbOTP = String(r.otp).trim();
          return dbOTP === sanitizedOTP || dbOTP.replace(/\s/g, '') === sanitizedOTP;
        });
        
        if (similarOTPs.length > 0) {
          console.error(`[OTP Verify] Found similar OTP but query didn't match - possible database issue`);
        }
        
        return null;
      }

      const otpRecord = checkResult.rows[0];
      const dbOTP = String(otpRecord.otp).trim();
      
      console.log(`[OTP Verify] Found OTP record:`, {
        id: otpRecord.id,
        db_otp: `"${dbOTP}"`,
        input_otp: `"${sanitizedOTP}"`,
        match: dbOTP === sanitizedOTP,
        otp_type: typeof otpRecord.otp,
        used: otpRecord.used,
        expires_at: otpRecord.expires_at,
        created_at: otpRecord.created_at
      });
      
      // Double-check the OTP matches (case-insensitive string comparison)
      if (dbOTP !== sanitizedOTP && dbOTP.replace(/\s/g, '') !== sanitizedOTP) {
        console.error(`[OTP Verify] ❌ OTP mismatch - DB: "${dbOTP}", Input: "${sanitizedOTP}"`);
        return null;
      }
      
      // Check if OTP is already used
      if (otpRecord.used) {
        console.error(`[OTP Verify] ❌ OTP already used for user ${userId}: "${sanitizedOTP}"`);
        return null;
      }

      // Check if OTP has expired (using database time for accuracy to avoid timezone issues)
      // Use database NOW() instead of JavaScript Date to ensure timezone consistency
      const timeCheckResult = await db.query(
        `SELECT 
          expires_at,
          NOW() as current_time,
          expires_at > NOW() as is_valid,
          EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_remaining
         FROM login_otps 
         WHERE id = $1`,
        [otpRecord.id]
      );
      
      if (timeCheckResult.rows.length === 0) {
        console.error(`[OTP Verify] Could not check expiration time for OTP ${otpRecord.id}`);
        return null;
      }
      
      const timeCheck = timeCheckResult.rows[0];
      const isValid = timeCheck.is_valid;
      const secondsRemaining = Math.floor(timeCheck.seconds_remaining || 0);
      const minutesRemaining = Math.floor(secondsRemaining / 60);
      
      console.log(`[OTP Verify] Time check (DB time) - Expires: ${timeCheck.expires_at}, Now: ${timeCheck.current_time}, Valid: ${isValid}, Remaining: ${secondsRemaining}s (${minutesRemaining} minutes)`);
      
      if (!isValid) {
        console.error(`[OTP Verify] ❌ OTP expired for user ${userId}: "${sanitizedOTP}" (expired at: ${timeCheck.expires_at}, now: ${timeCheck.current_time}, remaining: ${secondsRemaining}s)`);
        return null;
      }

      // Get user data separately
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        console.error(`[OTP Verify] User not found: ${userId}`);
        return null;
      }

      // Combine data - prioritize OTP data, then add user data
      const combinedData = { ...otpRecord };
      const userData = userResult.rows[0];
      combinedData.name = userData.name;
      combinedData.mobile = userData.mobile;
      combinedData.email = userData.email;
      combinedData.role = userData.role;
      combinedData.is_active = userData.is_active;
      
      console.log(`[OTP Verify] ✅ OTP verified successfully for user ${userId} - ${minutesRemaining} minutes remaining`);
      return new LoginOTP(combinedData);
    } catch (error) {
      console.error('[OTP Verify] Error in verifyOTP:', error);
      throw error;
    }
  }

  // Find login OTP by user ID (for checking if OTP exists)
  static async findByUserId(userId) {
    try {
      const result = await db.query(
        `SELECT * FROM login_otps 
         WHERE user_id = $1 AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Get user data separately
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return null;
      }

      // Combine data - prioritize OTP data, then add user data
      const combinedData = { ...result.rows[0] };
      const userData = userResult.rows[0];
      combinedData.name = userData.name;
      combinedData.mobile = userData.mobile;
      combinedData.email = userData.email;
      combinedData.role = userData.role;
      combinedData.is_active = userData.is_active;
      return new LoginOTP(combinedData);
    } catch (error) {
      throw error;
    }
  }

  // Mark OTP as used
  async markAsUsed() {
    try {
      const result = await db.query(
        'UPDATE login_otps SET used = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [this.id]
      );

      if (result.rows.length > 0) {
        this.used = true;
        this.updated_at = result.rows[0].updated_at;
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  }

  // Clean up expired OTPs
  static async cleanupExpiredOTPs() {
    try {
      const result = await db.query(
        'DELETE FROM login_otps WHERE expires_at < NOW() OR used = true'
      );
      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }

  // Get user data for this OTP
  getUserData() {
    return {
      id: this.user_id,
      name: this.name,
      mobile: this.mobile,
      email: this.email,
      role: this.role,
      is_active: this.is_active
    };
  }
}

module.exports = LoginOTP;
