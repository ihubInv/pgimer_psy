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
 * SECURITY FIX #2.17: Enable by default for better security
 */
function isEncryptionEnabled() {
  // Enable encryption by default unless explicitly disabled
  if (process.env.ENABLE_PASSWORD_ENCRYPTION === 'false') {
    return false;
  }
  // If no env var is set, enable encryption (default behavior)
  return true;
}

/**
 * Decrypt password encrypted with crypto-js (fallback method)
 * Uses AES-256-CBC with PBKDF2 key derivation
 * @param {string} encryptedPassword - Base64 encoded encrypted password with CRYPTOJS: prefix
 * @param {string} encryptionKey - Encryption key
 * @returns {string} - Decrypted password
 */
async function decryptPasswordCryptoJS(encryptedPassword, encryptionKey) {
  try {
    // Remove CRYPTOJS: prefix
    const base64Data = encryptedPassword.replace(/^CRYPTOJS:/, '');
    
    // Decode base64 to hex
    const combinedHex = Buffer.from(base64Data, 'base64').toString('hex');
    
    // Extract salt (first 32 hex chars = 16 bytes), IV (next 32 hex chars = 16 bytes), and ciphertext (rest)
    const saltHex = combinedHex.substring(0, 32);
    const ivHex = combinedHex.substring(32, 64);
    const ciphertextHex = combinedHex.substring(64);
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    
    // Derive key using PBKDF2 (same as frontend)
    const keyMaterial = Buffer.from(encryptionKey, 'utf8');
    const key = crypto.pbkdf2Sync(
      keyMaterial,
      salt,
      100000, // Same iterations as frontend
      32, // 256 bits = 32 bytes for AES-256
      'sha256'
    );
    
    // Decrypt using AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Password Decryption] crypto-js decryption failed:', error.message);
    throw error;
  }
}

/**
 * Decrypt password that was encrypted on the client side using Web Crypto API
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
    let encryptionKey = process.env.PASSWORD_ENCRYPTION_KEY;
    if (!encryptionKey) {
      // Use default key if not set (should be set in production)
      encryptionKey = 'PGIMER_PSY_DEFAULT_ENCRYPTION_KEY_2024_SECURE_CHANGE_IN_PRODUCTION';
      console.warn('[Password Decryption] Using default encryption key. Set PASSWORD_ENCRYPTION_KEY in production!');
    }

    // Check if it's crypto-js format (has CRYPTOJS: prefix)
    if (encryptedPassword.startsWith('CRYPTOJS:')) {
      return await decryptPasswordCryptoJS(encryptedPassword, encryptionKey);
    }

    // Web Crypto API format (AES-GCM)
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
  
  // Check for crypto-js format (has CRYPTOJS: prefix)
  if (password.startsWith('CRYPTOJS:')) {
    return true;
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

