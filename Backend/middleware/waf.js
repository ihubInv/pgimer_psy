/**
 * Web Application Firewall (WAF) Middleware
 * SECURITY FIX #2.9: Enhanced WAF protection against critical vulnerabilities
 * 
 * This middleware provides comprehensive WAF functionality including:
 * - SQL Injection detection (enhanced patterns)
 * - XSS attack detection (comprehensive)
 * - Path traversal detection (all variants)
 * - Command injection detection (shell operators)
 * - Suspicious pattern detection
 * - Rate limiting for attack attempts
 * 
 * Note: For production, consider deploying infrastructure-level WAF
 * (Cloudflare, AWS WAF, etc.) for comprehensive protection.
 */

const suspiciousPatterns = {
  // SQL Injection patterns - Enhanced to catch all variants
  sqlInjection: [
    // SQL keywords in suspicious contexts
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|SCRIPT|SCRIPTING)\b/i,
    // SQL operators and injection patterns
    /(\bOR\b\s*['"]?\s*\d+\s*=\s*\d+)|(\bOR\b\s*['"]?\s*['"]?\s*=\s*['"]?\s*['"])/i, // ' OR '1'='1
    /(\bAND\b\s*['"]?\s*\d+\s*=\s*\d+)|(\bAND\b\s*['"]?\s*['"]?\s*=\s*['"]?\s*['"])/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bUNION\b.*\bALL\b.*\bSELECT\b)/i,
    // SQL comment patterns
    /(--|\#|\/\*|\*\/)/i,
    // SQL string concatenation
    /(\+|\|\|)/i,
    // SQL functions
    /(\bEXEC\b|\bEXECUTE\b|\bSP_EXECUTESQL\b).*\b\(/i,
    /(\bCONCAT\b|\bCHAR\b|\bASCII\b).*\b\(/i,
    // Boolean-based SQL injection
    /'?\s*(OR|AND)\s*'?\s*\d+\s*=\s*\d+/i,
    /'?\s*(OR|AND)\s*'?\s*'?\s*=\s*'?/i,
    // Time-based SQL injection
    /(\bSLEEP\b|\bWAITFOR\b|\bDELAY\b).*\b\(/i,
    // Error-based SQL injection
    /(\bCAST\b|\bCONVERT\b).*\b\(/i,
  ],
  
  // XSS patterns - Comprehensive coverage
  xss: [
    // Script tags (all variants)
    /<script[^>]*>.*?<\/script>/gis,
    /<script[^>]*>/gi,
    /<\/script>/gi,
    // Event handlers
    /on\w+\s*=\s*["']/gi, // onclick=, onerror=, onload=, etc.
    /on\w+\s*=\s*[^"'\s>]/gi,
    // JavaScript protocol
    /javascript\s*:/gi,
    /javascript\s*%3A/gi, // URL encoded
    /javascript\s*%253A/gi, // Double URL encoded
    // Iframe injection
    /<iframe[^>]*>/gi,
    /<iframe[^>]*src/gi,
    // Object/Embed tags
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    // Image with script
    /<img[^>]*src[^>]*javascript:/gi,
    /<img[^>]*onerror/gi,
    // SVG with script
    /<svg[^>]*onload/gi,
    /<svg[^>]*onerror/gi,
    // Script execution functions
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /Function\s*\(/gi,
    // HTML entities used for XSS
    /&#x3c;script/gi,
    /&lt;script/gi,
    // Data URI with script
    /data\s*:\s*text\/html/gi,
    // VBScript (IE)
    /vbscript\s*:/gi,
  ],
  
  // Path traversal patterns - All encoding variants
  pathTraversal: [
    // Basic path traversal
    /\.\.\//g,
    /\.\.\\/g,
    // URL encoded
    /\.\.%2F/gi,
    /\.\.%5C/gi,
    /%2E%2E%2F/gi,
    /%2E%2E%5C/gi,
    // Double URL encoded
    /\.\.%252F/gi,
    /\.\.%255C/gi,
    /%252E%252E%252F/gi,
    /%252E%252E%255C/gi,
    // Unicode encoded
    /\.\.%c0%af/gi,
    /\.\.%c1%9c/gi,
    // Specific sensitive files
    /\/etc\/passwd/gi,
    /\/etc\/shadow/gi,
    /\/etc\/hosts/gi,
    /\/proc\/self\/environ/gi,
    /\/proc\/self\/cmdline/gi,
    /\/windows\/system32/gi,
    /\/windows\/win\.ini/gi,
    /boot\.ini/gi,
    // Absolute paths
    /^\/[a-z]:\\/gi,
    /^[a-z]:\\/gi,
  ],
  
  // Command injection patterns - Enhanced (context-aware to reduce false positives)
  commandInjection: [
    // Command separators followed by commands (not standalone separators)
    /;\s*(nc|netcat|bash|sh|cmd|powershell|python|perl|ruby|whoami|id|cat|ls|pwd)/i,
    /\|\s*(nc|netcat|bash|sh|cmd|powershell|python|perl|ruby|whoami|id|cat|ls|pwd)/i,
    /&&\s*(nc|netcat|bash|sh|cmd|powershell|whoami|id)/i,
    // Command substitution (backticks with content)
    /\$\([^)]+\)/g,
    /`[^`]+`/g,
    // Common commands in suspicious contexts (not just the word itself)
    /;\s*(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|curl|wget|nc|netcat)\b/i,
    // Windows commands in suspicious contexts
    /;\s*(dir|type|copy|del|rmdir|md|mkdir|cd|chdir)\b/i,
    // Process execution functions (PHP/scripting)
    /\b(exec|system|passthru|shell_exec|proc_open|popen)\s*\(/i,
    // Redirection operators with paths
    />\s*\/\w+/g,
    /<\s*\/\w+/g,
    // Environment variables in command context
    /\$\w+\s*\(/g,
    // Pipe operators with commands
    /\|\s*(nc|bash|sh|cmd|cat|ls|grep|awk|sed)/i,
    // Backtick command execution
    /`[^`]*\$\w+[^`]*`/g,
  ],
  
  // Suspicious file extensions
  suspiciousFiles: [
    /\.(php|jsp|asp|aspx|cgi|pl|sh|bat|cmd|exe|dll|scr|vbs|js|jar|war|ear|py|rb|pl|phtml|php3|php4|php5|phps)$/i,
  ],
  
  // LDAP Injection patterns - Context-aware to avoid false positives
  // Note: & is a normal query parameter separator, so we check for LDAP-specific patterns
  ldapInjection: [
    // LDAP filter operators in suspicious contexts
    /\(&\(/g,  // LDAP AND filter: (&(...))
    /\(\|\(/g,  // LDAP OR filter: (|(...))
    /\(!/g,     // LDAP NOT filter: (!...)
    // LDAP wildcard patterns
    /\*\)/g,    // Wildcard closing: *)
    // LDAP injection attempts (not just standalone characters)
    /\(&[^)]*\)/g,  // LDAP AND with content
    /\(\|[^)]*\)/g, // LDAP OR with content
    /\(![^)]*\)/g,  // LDAP NOT with content
    // LDAP attribute injection
    /\([^)]*=\*\)/g, // Attribute with wildcard
  ],
  
  // XML/XXE Injection patterns
  xmlInjection: [
    /<!ENTITY/i,
    /<!DOCTYPE/i,
    /SYSTEM\s+["']/i,
    /PUBLIC\s+["']/i,
  ],
};

/**
 * URL decode a string (handles multiple encodings)
 */
function urlDecode(value) {
  if (!value || typeof value !== 'string') return value;
  
  try {
    // Decode multiple times to catch double/triple encoding
    let decoded = value;
    for (let i = 0; i < 3; i++) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch (e) {
        // If decoding fails, return what we have
        break;
      }
    }
    return decoded;
  } catch (e) {
    return value;
  }
}

/**
 * Check if a string matches suspicious patterns
 * Also checks URL-decoded versions
 */
function detectSuspiciousPattern(value, type) {
  if (!value || typeof value !== 'string') return false;
  
  const patterns = suspiciousPatterns[type] || [];
  
  // Check original value
  if (patterns.some(pattern => pattern.test(value))) {
    return true;
  }
  
  // Check URL-decoded value (attackers often encode payloads)
  const decoded = urlDecode(value);
  if (decoded !== value && patterns.some(pattern => pattern.test(decoded))) {
    return true;
  }
  
  // Check lowercase version (case-insensitive matching)
  const lowerValue = value.toLowerCase();
  const lowerDecoded = decoded.toLowerCase();
  if (patterns.some(pattern => pattern.test(lowerValue)) || 
      patterns.some(pattern => pattern.test(lowerDecoded))) {
    return true;
  }
  
  return false;
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
  
  // Patterns to skip for query parameters (to avoid false positives)
  // LDAP patterns are often false positives in query params (e.g., & is a normal separator)
  const skipPatternsForQueryParams = ['ldapInjection'];
  
  Object.keys(query).forEach(key => {
    const value = query[key];
    if (typeof value === 'string') {
      for (const [type, patterns] of Object.entries(suspiciousPatterns)) {
        // Skip LDAP injection checks for query parameters (too many false positives)
        if (skipPatternsForQueryParams.includes(type)) {
          continue;
        }
        
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
 * Sanitize and check URL path (path only, not query string)
 */
function checkUrlPath(req) {
  // Use req.path which doesn't include query string, or extract path from req.url
  let path = req.path;
  if (!path && req.url) {
    // Extract path from URL (remove query string)
    path = req.url.split('?')[0];
  }
  if (!path || typeof path !== 'string') return null;
  
  const suspicious = [];
  
  // Only check path-specific patterns (not LDAP, SQL, XSS, etc. which are for parameters/body)
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

// Rate limiting for attack attempts (in-memory store)
// In production, use Redis or similar for distributed systems
const attackAttempts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 5; // Max attempts per IP per window

/**
 * Check and update rate limit for an IP
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = attackAttempts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  // Reset if window expired
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  attempts.count++;
  attackAttempts.set(ip, attempts);
  
  // Clean up old entries periodically
  if (attackAttempts.size > 1000) {
    for (const [key, value] of attackAttempts.entries()) {
      if (now > value.resetTime) {
        attackAttempts.delete(key);
      }
    }
  }
  
  return attempts.count > RATE_LIMIT_MAX_ATTEMPTS;
}

/**
 * Get client IP address
 */
function getClientIp(req) {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown';
}

/**
 * WAF Middleware - SECURITY FIX #2.9: Enhanced protection
 */
const wafMiddleware = (req, res, next) => {
  // CRITICAL: Allow OPTIONS requests (CORS preflight) to pass through
  // CORS middleware needs to handle these requests first
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Skip WAF checks for certain paths (e.g., health checks, static files)
  const skipPaths = ['/health', '/api-docs', '/favicon.ico'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  const clientIp = getClientIp(req);
  const threats = [];
  
  // Check URL path
  const pathThreats = checkUrlPath(req);
  if (pathThreats) {
    threats.push(...pathThreats);
  }
  
  // Check query parameters (including URL-encoded values)
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
  
  // Check headers for suspicious patterns
  const headerThreats = checkHeaders(req);
  if (headerThreats) {
    threats.push(...headerThreats);
  }
  
  // If threats detected, block the request
  if (threats.length > 0) {
    // Check rate limit
    const isRateLimited = checkRateLimit(clientIp);
    
    // Log the threat for security monitoring
    const threatDetails = {
      ip: clientIp,
      method: req.method,
      path: req.path,
      url: req.url,
      userAgent: req.headers['user-agent'] || 'unknown',
      threats: threats.map(t => ({
        type: t.type,
        location: t.path || t.param || 'unknown',
        value: t.value ? t.value.substring(0, 200) : 'N/A' // Limit value length
      })),
      timestamp: new Date().toISOString(),
      rateLimited: isRateLimited
    };
    
    // Log the threat for security monitoring
    console.warn('[WAF] SECURITY THREAT BLOCKED:', JSON.stringify(threatDetails, null, 2));
    
    // Debug: Always log what triggered the block for troubleshooting
    console.log('[WAF DEBUG] Request details that triggered block:', {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      queryString: req.url.split('?')[1] || '',
      body: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'user-agent': req.headers['user-agent'],
        'origin': req.headers.origin,
      },
      detectedThreats: threats
    });
    
    // If rate limited, return 429 (Too Many Requests)
    if (isRateLimited) {
      // Ensure CORS headers are set (CORS middleware should run before WAF, but add as safety)
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      return res.status(429).json({
        success: false,
        message: 'Too many security violation attempts. Please try again later.',
        code: 'WAF_RATE_LIMITED',
      });
    }
    
    // Return 403 Forbidden with generic message (don't reveal what was detected)
    // CRITICAL: Ensure CORS headers are set so browser can read the error response
    // CORS middleware should run before WAF, but we add headers here as defense in depth
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    }
    
    return res.status(403).json({
      success: false,
      message: 'Request blocked by security policy.',
      code: 'WAF_BLOCKED',
    });
  }
  
  next();
};

/**
 * Check request headers for suspicious patterns
 */
function checkHeaders(req) {
  const suspicious = [];
  const headersToCheck = ['user-agent', 'referer', 'x-forwarded-for', 'x-real-ip'];
  
  headersToCheck.forEach(headerName => {
    const headerValue = req.headers[headerName];
    if (typeof headerValue === 'string') {
      // Check for SQL injection in headers
      if (detectSuspiciousPattern(headerValue, 'sqlInjection')) {
        suspicious.push({
          type: 'sqlInjection',
          header: headerName,
          value: headerValue.substring(0, 100)
        });
      }
      // Check for XSS in headers
      if (detectSuspiciousPattern(headerValue, 'xss')) {
        suspicious.push({
          type: 'xss',
          header: headerName,
          value: headerValue.substring(0, 100)
        });
      }
    }
  });
  
  return suspicious.length > 0 ? suspicious : null;
}

module.exports = wafMiddleware;

