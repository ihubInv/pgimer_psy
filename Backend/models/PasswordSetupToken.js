const db = require('../config/database');
const crypto = require('crypto');

class PasswordSetupToken {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.token = data.token;
    this.expires_at = data.expires_at;
    this.used = data.used;
    this.created_at = data.created_at;
  }

  // Generate a secure random token
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create a new password setup token (24 hour expiration)
  static async create(userId) {
    try {
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Invalidate any existing tokens for this user
      await db.query(
        'UPDATE password_setup_tokens SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      );

      const result = await db.query(
        `INSERT INTO password_setup_tokens (user_id, token, expires_at) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [userId, token, expiresAt]
      );

      return new PasswordSetupToken(result.rows[0]);
    } catch (error) {
      console.error('Error creating password setup token:', error);
      throw new Error('Failed to create password setup token');
    }
  }

  // Find a valid token by token string
  static async findByToken(token) {
    try {
      const result = await db.query(
        `SELECT pst.*, u.name, u.email 
         FROM password_setup_tokens pst 
         JOIN users u ON pst.user_id = u.id 
         WHERE pst.token = $1 AND pst.used = false AND pst.expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tokenInstance = new PasswordSetupToken(result.rows[0]);
      tokenInstance.user_name = result.rows[0].name;
      tokenInstance.user_email = result.rows[0].email;
      return tokenInstance;
    } catch (error) {
      console.error('Error finding password setup token:', error);
      throw new Error('Failed to find password setup token');
    }
  }

  // Find a valid token by user ID
  static async findByUserId(userId) {
    try {
      const result = await db.query(
        `SELECT pst.*, u.name, u.email 
         FROM password_setup_tokens pst 
         JOIN users u ON pst.user_id = u.id 
         WHERE pst.user_id = $1 AND pst.used = false AND pst.expires_at > NOW() 
         ORDER BY pst.created_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tokenInstance = new PasswordSetupToken(result.rows[0]);
      tokenInstance.user_name = result.rows[0].name;
      tokenInstance.user_email = result.rows[0].email;
      return tokenInstance;
    } catch (error) {
      console.error('Error finding password setup token by user ID:', error);
      throw new Error('Failed to find password setup token');
    }
  }

  // Mark token as used
  async markAsUsed() {
    try {
      const result = await db.query(
        'UPDATE password_setup_tokens SET used = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
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
        'DELETE FROM password_setup_tokens WHERE expires_at < NOW() OR used = true'
      );
      
      console.log(`Cleaned up ${result.rowCount} expired password setup tokens`);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw new Error('Failed to cleanup expired tokens');
    }
  }
}

module.exports = PasswordSetupToken;

