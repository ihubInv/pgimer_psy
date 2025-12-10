/**
 * Password Decryption Utility
 * SECURITY FIX #2.17: Decrypt client-side encrypted passwords
 * 
 * This utility decrypts passwords that were encrypted on the client side
 * using the Web Crypto API (AES-GCM).
 * 
 * The encryption key must match the frontend VITE_PASSWORD_ENCRYPTION_KEY
 */

const crypto = require('crypto');

/**
 * Check if password encryption is enabled
 */
function isEncryptionEnabled() {
  return process.env.ENABLE_PASSWORD_ENCRYPTION === 'true';
}

/**
 * Decrypt password that was encrypted on the client side
 * @param {string} encryptedPassword - Base64 encoded encrypted password
 * @returns {string} - Decrypted password
 */
async function decryptPassword(encryptedPassword) {
  try {
    // If encryption is not enabled, return password as-is
    if (!isEncryptionEnabled()) {
      return encryptedPassword;
    }

    // Get encryption key from environment (must match frontend)
    const encryptionKey = process.env.PASSWORD_ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.warn('[Password Decryption] Encryption key not configured, assuming plain password');
      return encryptedPassword;
    }

    // Decode base64
    const combined = Buffer.from(encryptedPassword, 'base64');
    
    // Extract salt (first 16 bytes), IV (next 12 bytes), and encrypted data (rest)
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    // Derive key using PBKDF2 (same as frontend)
    // Frontend uses the encryption key directly as keyMaterial for PBKDF2
    const keyMaterial = Buffer.from(encryptionKey, 'utf8');
    const key = crypto.pbkdf2Sync(
      keyMaterial,
      salt,
      100000, // Same iterations as frontend
      32, // 256 bits = 32 bytes for AES-256
      'sha256'
    );

    // Decrypt using AES-256-GCM
    // Extract auth tag (last 16 bytes of encrypted data - GCM auth tag is always 16 bytes)
    const authTagLength = 16;
    const ciphertext = encryptedData.slice(0, -authTagLength);
    const authTag = encryptedData.slice(-authTagLength);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Password Decryption] Decryption failed, assuming plain password:', error.message);
    // If decryption fails, assume it's a plain password (for backward compatibility)
    return encryptedPassword;
  }
}

/**
 * Check if a password appears to be encrypted (base64 format check)
 */
function isEncryptedFormat(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  // Encrypted passwords are base64 encoded and typically longer
  // Plain passwords are usually shorter and may contain special characters
  // A simple heuristic: if it's valid base64 and longer than 50 chars, likely encrypted
  try {
    const decoded = Buffer.from(password, 'base64');
    // Encrypted password format: salt (16 bytes) + IV (12 bytes) + encrypted data (variable) + auth tag (16 bytes)
    // Minimum size: 16 + 12 + 16 = 44 bytes (but actual encrypted password data will be longer)
    // Base64 encoding: ~1.33x the binary size, so minimum ~60 characters
    // We check for at least 44 bytes decoded and 60+ characters in base64
    return decoded.length >= 44 && password.length >= 60;
  } catch (e) {
    return false;
  }
}

/**
 * Main decryption function
 * Automatically detects if password is encrypted and decrypts if needed
 * @param {string} password - Potentially encrypted password
 * @returns {Promise<string>} - Decrypted password (or original if not encrypted)
 */
async function decryptPasswordIfNeeded(password) {
  if (!password || typeof password !== 'string') {
    return password;
  }

  // If encryption is not enabled, return as-is
  if (!isEncryptionEnabled()) {
    return password;
  }

  // Check if password appears to be encrypted
  if (isEncryptedFormat(password)) {
    try {
      return await decryptPassword(password);
    } catch (error) {
      console.error('[Password Decryption] Failed to decrypt, using as plain password:', error.message);
      return password;
    }
  }

  // Not encrypted format, return as-is (backward compatibility)
  return password;
}

module.exports = {
  decryptPassword,
  decryptPasswordIfNeeded,
  isEncryptedFormat,
  isEncryptionEnabled,
};

