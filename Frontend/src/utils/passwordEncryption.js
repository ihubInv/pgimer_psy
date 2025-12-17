/**
 * Password Encryption Utility
 * SECURITY FIX #2.17: Client-side password encryption before transmission
 * 
 * This utility encrypts passwords on the client side before sending them to the server.
 * This provides an additional layer of protection even if HTTPS/TLS fails or is compromised.
 * 
 * Encryption methods:
 * - Primary: AES-256-GCM with PBKDF2 key derivation using Web Crypto API (preferred, requires HTTPS)
 * - Fallback: AES-256-CBC using crypto-js (works over HTTP, still secure)
 * 
 * SECURITY: Encryption is MANDATORY - passwords are NEVER sent in plaintext.
 * If encryption fails, an error is thrown and the operation is aborted.
 * 
 * IMPORTANT: To configure password encryption:
 * 1. Set VITE_PASSWORD_ENCRYPTION_KEY in frontend .env (optional - uses default if not set)
 * 2. Set PASSWORD_ENCRYPTION_KEY in backend .env (must match frontend key)
 * 
 * The encryption key should be a strong, random string (at least 32 characters).
 * If not provided, a default key is used (change in production for better security).
 */

import CryptoJS from 'crypto-js';

/**
 * Encrypt password using crypto-js (fallback when Web Crypto API unavailable)
 * Uses AES-256-CBC with PBKDF2 key derivation
 * SECURITY FIX #2.17: Fallback encryption method for HTTP contexts
 */
async function encryptPasswordWithCryptoJS(password, encryptionKey) {
  try {
    // Generate random salt and IV
    const salt = CryptoJS.lib.WordArray.random(16); // 16 bytes = 128 bits
    const iv = CryptoJS.lib.WordArray.random(16); // 16 bytes for AES-256-CBC
    
    // Derive key using PBKDF2 (same as Web Crypto API approach)
    const key = CryptoJS.PBKDF2(encryptionKey, salt, {
      keySize: 256 / 32, // 256 bits = 8 words
      iterations: 100000
    });
    
    // Encrypt password using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(password, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Format: salt (16 bytes) + IV (16 bytes) + encrypted data
    // Convert to base64 for transmission
    const saltHex = salt.toString();
    const ivHex = iv.toString();
    const ciphertextHex = encrypted.ciphertext.toString();
    
    // Combine and encode as base64
    const combined = saltHex + ivHex + ciphertextHex;
    const encryptedBase64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(combined));
    
    // Add prefix to indicate crypto-js format (backend can detect and decrypt accordingly)
    return {
      encrypted: 'CRYPTOJS:' + encryptedBase64,
      isEncrypted: true,
    };
  } catch (error) {
    console.error('[Password Encryption] crypto-js encryption failed:', error);
    throw new Error(`[Password Encryption] Failed to encrypt password with crypto-js: ${error.message}`);
  }
}

/**
 * Encrypt password using Web Crypto API
 * Uses AES-GCM with a shared secret key
 * SECURITY FIX #2.17: Always encrypt - never send plaintext passwords
 */
async function encryptPasswordWithWebCrypto(password, encryptionKey, cryptoObj) {
  try {
    // Derive a key from the encryption key using PBKDF2
    const keyMaterial = await cryptoObj.subtle.importKey(
      'raw',
      new TextEncoder().encode(encryptionKey),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = cryptoObj.getRandomValues(new Uint8Array(16));
    const key = await cryptoObj.subtle.deriveKey(
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

    const iv = cryptoObj.getRandomValues(new Uint8Array(12));
    const passwordBuffer = new TextEncoder().encode(password);

    const encryptedBuffer = await cryptoObj.subtle.encrypt(
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
    console.error('[Password Encryption] Web Crypto API encryption failed:', error);
    throw error;
  }
}

/**
 * Main encryption function - tries Web Crypto API first, falls back to crypto-js
 * SECURITY FIX #2.17: Always encrypt - never send plaintext passwords
 */
async function encryptPasswordSimple(password) {
  // SECURITY FIX #2.17: Always encrypt passwords for transmission
  // Never allow plaintext password transmission
  
  // Get encryption key from environment or use default
  let encryptionKey = import.meta.env.VITE_PASSWORD_ENCRYPTION_KEY;
  
  // If no key provided, use a default key (should be set in production)
  // This ensures encryption always works, even if env var is missing
  if (!encryptionKey) {
    // Use a default key - in production this should be set via env var
    encryptionKey = 'PGIMER_PSY_DEFAULT_ENCRYPTION_KEY_2024_SECURE_CHANGE_IN_PRODUCTION';
    console.warn('[Password Encryption] Using default encryption key. Set VITE_PASSWORD_ENCRYPTION_KEY in production!');
  }

  // Try Web Crypto API first (preferred method)
  if (isEncryptionSupported()) {
    try {
      const cryptoObj = getCrypto();
      console.log('[Password Encryption] Using Web Crypto API (preferred method)');
      return await encryptPasswordWithWebCrypto(password, encryptionKey, cryptoObj);
    } catch (error) {
      console.warn('[Password Encryption] Web Crypto API failed, falling back to crypto-js:', error.message);
      // Fall through to crypto-js fallback
    }
  } else {
    console.warn('[Password Encryption] Web Crypto API not available, using crypto-js fallback');
  }
  
  // Fallback to crypto-js (works over HTTP)
  console.log('[Password Encryption] Using crypto-js (fallback method)');
  return await encryptPasswordWithCryptoJS(password, encryptionKey);
}

/**
 * Main encryption function
 * SECURITY FIX #2.17: Always encrypts password - never returns plaintext
 * Throws error if encryption fails (for security)
 */
export async function encryptPasswordForTransmission(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('[Password Encryption] Invalid password provided');
  }

  // Always attempt encryption - never allow plaintext
  return await encryptPasswordSimple(password);
}

/**
 * Check if password encryption is supported
 */
export function isEncryptionSupported() {
  try {
    // Check for crypto in multiple contexts (window.crypto, global crypto, etc.)
    let cryptoObj = null;
    
    // Try window.crypto first (most common in browsers)
    if (typeof window !== 'undefined') {
      cryptoObj = window.crypto || window.msCrypto; // IE11 fallback
    }
    
    // Fallback to global crypto
    if (!cryptoObj && typeof crypto !== 'undefined') {
      cryptoObj = crypto;
    }
    
    // Log diagnostic info
    const diagnostics = {
      windowAvailable: typeof window !== 'undefined',
      windowCrypto: typeof window !== 'undefined' && !!window.crypto,
      globalCrypto: typeof crypto !== 'undefined',
      cryptoObj: !!cryptoObj,
      subtle: !!(cryptoObj && cryptoObj.subtle),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      protocol: typeof window !== 'undefined' && window.location ? window.location.protocol : 'unknown'
    };
    
    console.log('[Password Encryption] Diagnostics:', diagnostics);
    
    if (!cryptoObj) {
      console.error('[Password Encryption] crypto object not found. Diagnostics:', diagnostics);
      return false;
    }
    
    if (!cryptoObj.subtle) {
      // crypto.subtle is only available in secure contexts (HTTPS)
      // This is expected in HTTP contexts - will fall back to crypto-js
      console.warn('[Password Encryption] crypto.subtle not available (expected in HTTP contexts). Will use crypto-js fallback. Diagnostics:', diagnostics);
      return false;
    }
    
    // Check if required methods exist
    const requiredMethods = ['importKey', 'deriveKey', 'encrypt', 'getRandomValues'];
    const missingMethods = requiredMethods.filter(method => {
      if (method === 'getRandomValues') {
        return typeof cryptoObj[method] !== 'function';
      }
      return typeof cryptoObj.subtle[method] !== 'function';
    });
    
    if (missingMethods.length > 0) {
      console.error('[Password Encryption] Missing required methods:', missingMethods);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Password Encryption] Error checking support:', error);
    return false;
  }
}

/**
 * Get the crypto object (works in browser contexts)
 */
function getCrypto() {
  // Try window.crypto first (most common in browsers)
  if (typeof window !== 'undefined') {
    if (window.crypto) {
      return window.crypto;
    }
    // IE11 fallback
    if (window.msCrypto) {
      console.warn('[Password Encryption] Using msCrypto (IE11 fallback) - may not support all features');
      return window.msCrypto;
    }
  }
  
  // Fallback to global crypto
  if (typeof crypto !== 'undefined') {
    return crypto;
  }
  
  throw new Error('Web Crypto API not available. Please use a modern browser with Web Crypto API support.');
}

export default {
  encryptPasswordForTransmission,
  isEncryptionSupported,
};

