/**
 * Password Encryption Utility
 * SECURITY FIX #2.17: Client-side password encryption before transmission
 * 
 * This utility encrypts passwords on the client side before sending them to the server.
 * This provides an additional layer of protection even if HTTPS/TLS fails or is compromised.
 * 
 * Encryption uses AES-256-GCM with PBKDF2 key derivation for maximum security.
 * 
 * IMPORTANT: To enable password encryption:
 * 1. Set VITE_ENABLE_PASSWORD_ENCRYPTION=true in frontend .env
 * 2. Set ENABLE_PASSWORD_ENCRYPTION=true in backend .env
 * 3. Set VITE_PASSWORD_ENCRYPTION_KEY and PASSWORD_ENCRYPTION_KEY to the same value in both .env files
 * 
 * The encryption key should be a strong, random string (at least 32 characters).
 */

/**
 * Encrypt password using Web Crypto API
 * Uses AES-GCM with a shared secret key
 */
async function encryptPasswordSimple(password) {
  try {
    // SECURITY FIX #2.17: Always encrypt passwords for transmission
    // Use a default encryption key if not provided in env (for development)
    // In production, VITE_PASSWORD_ENCRYPTION_KEY should be set
    let encryptionKey = import.meta.env.VITE_PASSWORD_ENCRYPTION_KEY;
    
    // Check if encryption is explicitly disabled
    const encryptionDisabled = import.meta.env.VITE_ENABLE_PASSWORD_ENCRYPTION === 'false';
    
    // If encryption is explicitly disabled, use HTTPS only
    if (encryptionDisabled) {
      return { encrypted: password, isEncrypted: false };
    }
    
    // If no key provided, use a default key (should be set in production)
    // This ensures encryption always works, even if env var is missing
    if (!encryptionKey) {
      // Use a default key - in production this should be set via env var
      encryptionKey = 'PGIMER_PSY_DEFAULT_ENCRYPTION_KEY_2024_SECURE_CHANGE_IN_PRODUCTION';
      console.warn('[Password Encryption] Using default encryption key. Set VITE_PASSWORD_ENCRYPTION_KEY in production!');
    }

    // Check if Web Crypto API is available
    if (!isEncryptionSupported()) {
      console.warn('[Password Encryption] Web Crypto API not available, using HTTPS only');
      return { encrypted: password, isEncrypted: false };
    }

    // Get encryption key from environment (must match backend)
    // Already checked above, but keep for clarity
    
    // Derive a key from the encryption key using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(encryptionKey),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const passwordBuffer = new TextEncoder().encode(password);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      passwordBuffer
    );

    // Combine salt, IV, and encrypted data
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(encryptedArray, salt.length + iv.length);

    const encryptedBase64 = btoa(String.fromCharCode(...combined));

    return {
      encrypted: encryptedBase64,
      isEncrypted: true,
    };
  } catch (error) {
    console.error('[Password Encryption] Encryption failed, using HTTPS only:', error);
    // Fallback: return password as-is (HTTPS will encrypt it)
    return { encrypted: password, isEncrypted: false };
  }
}

/**
 * Main encryption function
 * Returns encrypted password if enabled, otherwise returns plain password
 * (HTTPS will encrypt it in transit)
 */
export async function encryptPasswordForTransmission(password) {
  if (!password || typeof password !== 'string') {
    return { encrypted: password, isEncrypted: false };
  }

  try {
    return await encryptPasswordSimple(password);
  } catch (error) {
    console.error('[Password Encryption] Encryption failed, using HTTPS only:', error);
    return { encrypted: password, isEncrypted: false };
  }
}

/**
 * Check if password encryption is supported
 */
export function isEncryptionSupported() {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
}

export default {
  encryptPasswordForTransmission,
  isEncryptionSupported,
};

