/**
 * Password Encryption Utility
 * SECURITY FIX #17: Client-side password encryption before transmission
 * 
 * Note: This is an optional enhancement. HTTPS already provides encryption
 * in transit. This adds an additional layer of defense-in-depth.
 * 
 * IMPORTANT: Currently disabled by default. To enable:
 * 1. Set VITE_ENABLE_PASSWORD_ENCRYPTION=true in frontend .env
 * 2. Implement decryption on the backend (see Backend/utils/passwordDecryption.js)
 * 3. Update backend to handle encrypted passwords
 * 
 * For now, passwords are sent over HTTPS which provides adequate protection.
 * This utility is prepared for future enhancement if needed.
 */

/**
 * Encrypt password using Web Crypto API
 * Uses AES-GCM with a shared secret key
 */
async function encryptPasswordSimple(password) {
  try {
    // Check if encryption is enabled
    const encryptionEnabled = import.meta.env.VITE_ENABLE_PASSWORD_ENCRYPTION === 'true';
    
    if (!encryptionEnabled) {
      // Return password as-is (HTTPS will encrypt it)
      return { encrypted: password, isEncrypted: false };
    }

    // Check if Web Crypto API is available
    if (!isEncryptionSupported()) {
      console.warn('[Password Encryption] Web Crypto API not available, using HTTPS only');
      return { encrypted: password, isEncrypted: false };
    }

    // Get encryption key from environment (must match backend)
    const encryptionKey = import.meta.env.VITE_PASSWORD_ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.warn('[Password Encryption] Encryption key not configured, using HTTPS only');
      return { encrypted: password, isEncrypted: false };
    }
    
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

