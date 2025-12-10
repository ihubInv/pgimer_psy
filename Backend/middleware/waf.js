/**
 * Web Application Firewall (WAF) Middleware
 * SECURITY FIX #9: Application-level WAF protection
 * 
 * This middleware provides basic WAF functionality including:
 * - SQL Injection detection
 * - XSS attack detection
 * - Path traversal detection
 * - Command injection detection
 * - Suspicious pattern detection
 * 
 * Note: For production, consider deploying infrastructure-level WAF
 * (Cloudflare, AWS WAF, etc.) for comprehensive protection.
 */

const suspiciousPatterns = {
  // SQL Injection patterns
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    /('|(\\')|(;)|(--)|(\/\*)|(\*\/)|(\+)|(\%27)|(\%3B)|(\%2D)|(\%2D))/i,
    /(\bOR\b.*=.*)|(\bAND\b.*=.*)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bEXEC\b|\bEXECUTE\b).*\b\(/i,
  ],
  
  // XSS patterns
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick=, onerror=, etc.
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<img[^>]*src[^>]*javascript:/gi,
    /<svg[^>]*onload/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ],
  
  // Path traversal patterns
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\/g,
    /\.\.%2F/gi,
    /\.\.%5C/gi,
    /\.\.%252F/gi,
    /\.\.%255C/gi,
    /\/etc\/passwd/gi,
    /\/etc\/shadow/gi,
    /\/proc\/self\/environ/gi,
    /\/windows\/system32/gi,
  ],
  
  // Command injection patterns
  commandInjection: [
    /[;&|`$(){}[\]]/g,
    /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|curl|wget)\b/i,
    /\|\s*(nc|netcat|bash|sh|cmd|powershell)/i,
    /;\s*(nc|netcat|bash|sh|cmd|powershell)/i,
  ],
  
  // Suspicious file extensions
  suspiciousFiles: [
    /\.(php|jsp|asp|aspx|cgi|pl|sh|bat|cmd|exe|dll|scr|vbs|js|jar|war|ear|sh|py|rb|pl)$/i,
  ],
};

/**
 * Check if a string matches suspicious patterns
 */
function detectSuspiciousPattern(value, type) {
  if (!value || typeof value !== 'string') return false;
  
  const patterns = suspiciousPatterns[type] || [];
  return patterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize and check request body
 */
function checkRequestBody(req) {
  const body = req.body;
  if (!body || typeof body !== 'object') return null;
  
  const suspicious = [];
  
  // Recursively check all values in the body
  function checkValue(value, path = '') {
    if (value === null || value === undefined) return;
    
    if (typeof value === 'string') {
      // Check all pattern types
      for (const [type, patterns] of Object.entries(suspiciousPatterns)) {
        if (detectSuspiciousPattern(value, type)) {
          suspicious.push({
            type,
            path,
            value: value.substring(0, 100), // Limit value length in log
          });
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        checkValue(item, `${path}[${index}]`);
      });
    } else if (typeof value === 'object') {
      Object.keys(value).forEach(key => {
        checkValue(value[key], path ? `${path}.${key}` : key);
      });
    }
  }
  
  checkValue(body);
  return suspicious.length > 0 ? suspicious : null;
}

/**
 * Sanitize and check query parameters
 */
function checkQueryParams(req) {
  const query = req.query;
  if (!query || typeof query !== 'object') return null;
  
  const suspicious = [];
  
  Object.keys(query).forEach(key => {
    const value = query[key];
    if (typeof value === 'string') {
      for (const [type, patterns] of Object.entries(suspiciousPatterns)) {
        if (detectSuspiciousPattern(value, type)) {
          suspicious.push({
            type,
            param: key,
            value: value.substring(0, 100),
          });
        }
      }
    }
  });
  
  return suspicious.length > 0 ? suspicious : null;
}

/**
 * Sanitize and check URL path
 */
function checkUrlPath(req) {
  const path = req.path || req.url;
  if (!path || typeof path !== 'string') return null;
  
  const suspicious = [];
  
  // Check for path traversal
  if (detectSuspiciousPattern(path, 'pathTraversal')) {
    suspicious.push({
      type: 'pathTraversal',
      path,
    });
  }
  
  // Check for suspicious file extensions
  if (detectSuspiciousPattern(path, 'suspiciousFiles')) {
    suspicious.push({
      type: 'suspiciousFiles',
      path,
    });
  }
  
  return suspicious.length > 0 ? suspicious : null;
}

/**
 * WAF Middleware
 */
const wafMiddleware = (req, res, next) => {
  // Skip WAF checks for certain paths (e.g., health checks, static files)
  const skipPaths = ['/health', '/api-docs', '/favicon.ico'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  const threats = [];
  
  // Check URL path
  const pathThreats = checkUrlPath(req);
  if (pathThreats) {
    threats.push(...pathThreats);
  }
  
  // Check query parameters
  const queryThreats = checkQueryParams(req);
  if (queryThreats) {
    threats.push(...queryThreats);
  }
  
  // Check request body (skip for GET requests and file uploads)
  if (req.method !== 'GET' && !req.path.includes('/upload')) {
    const bodyThreats = checkRequestBody(req);
    if (bodyThreats) {
      threats.push(...bodyThreats);
    }
  }
  
  // If threats detected, block the request
  if (threats.length > 0) {
    // Log the threat for security monitoring
    console.warn('[WAF] Potential security threat detected:', {
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      path: req.path,
      threats,
      timestamp: new Date().toISOString(),
    });
    
    return res.status(403).json({
      success: false,
      message: 'Request blocked by security policy. Suspicious activity detected.',
      code: 'WAF_BLOCKED',
    });
  }
  
  next();
};

module.exports = wafMiddleware;

