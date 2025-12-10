/**
 * Password Policy Validation
 * SECURITY FIX #2.12: Strong password policy enforcement (matches backend)
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */

/**
 * Validate password strength
 * Returns array of error messages (empty if valid)
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty123',
    'admin123', 'welcome123', 'letmein123', 'monkey123'
  ];
  
  const lowerPassword = password.toLowerCase();
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return errors;
}

/**
 * Check if password meets all requirements
 */
export function isPasswordValid(password) {
  return validatePassword(password).length === 0;
}

/**
 * Get password strength score (0-100)
 */
export function getPasswordStrength(password) {
  if (!password) return 0;

  let score = 0;

  // Length score (max 25 points)
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 5;

  // Character variety (max 50 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
  if (password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password)) score += 10;

  // Complexity bonus (max 25 points)
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.6) score += 15;
  if (uniqueChars >= password.length * 0.8) score += 10;

  return Math.min(100, score);
}

/**
 * Get password requirements as an array of requirement objects
 * Each object has: { text, met } where met is a boolean
 */
export function getPasswordRequirements(password) {
  return [
    {
      text: 'At least 8 characters',
      met: password && password.length >= 8
    },
    {
      text: 'One uppercase letter',
      met: password && /[A-Z]/.test(password)
    },
    {
      text: 'One lowercase letter',
      met: password && /[a-z]/.test(password)
    },
    {
      text: 'One number',
      met: password && /[0-9]/.test(password)
    },
    {
      text: 'One special character (!@#$%^&*()_+-=[]{}|;:,.<>?)',
      met: password && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ];
}

