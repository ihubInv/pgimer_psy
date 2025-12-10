/**
 * Email Content Sanitizer
 * SECURITY FIX #13: Prevent HTML injection in email content
 */

/**
 * Escape HTML special characters to prevent XSS/HTML injection
 */
function escapeHtml(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitize user input for email content
 * Removes or escapes potentially dangerous content
 */
function sanitizeEmailContent(content) {
  if (!content) return '';
  
  if (typeof content === 'string') {
    // Escape HTML characters
    return escapeHtml(content);
  }
  
  if (typeof content === 'object') {
    // Recursively sanitize object properties
    const sanitized = {};
    for (const key in content) {
      if (content.hasOwnProperty(key)) {
        sanitized[key] = sanitizeEmailContent(content[key]);
      }
    }
    return sanitized;
  }
  
  return content;
}

/**
 * Sanitize user name for email templates
 */
function sanitizeUserName(userName) {
  if (!userName) return 'User';
  return escapeHtml(String(userName).trim());
}

/**
 * Sanitize OTP for email display (OTP is numeric, but we still escape it)
 */
function sanitizeOTP(otp) {
  if (!otp) return '';
  // OTP should be numeric, but we escape it anyway for safety
  return escapeHtml(String(otp).trim());
}

module.exports = {
  escapeHtml,
  sanitizeEmailContent,
  sanitizeUserName,
  sanitizeOTP
};

