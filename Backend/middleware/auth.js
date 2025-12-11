const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { verifyAccessToken } = require('../utils/tokenUtils');

// Verify JWT token (access token)
// SECURITY FIX #2.7: Strict token validation - reject all invalid tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    // SECURITY: Validate Authorization header format
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization header required' 
      });
    }
    
    // SECURITY: Ensure Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authorization format. Expected: Bearer <token>' 
      });
    }
    
    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    // SECURITY: Validate token exists and is not empty
    if (!token || token.trim().length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }
    
    // SECURITY: Basic token format validation (JWT has 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }
    
    // SECURITY FIX #2.7: Strict token validation - reject ALL invalid tokens
    // Ensure JWT_SECRET is configured
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length === 0) {
      console.error('[Auth] CRITICAL: JWT_SECRET is not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }
    
    // SECURITY: Verify token signature and expiration
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (verifyError) {
      // SECURITY: Explicitly reject ALL invalid tokens - no exceptions
      // Log all token verification failures for security monitoring
      console.warn('[Auth] Token verification failed:', {
        error: verifyError.name,
        message: verifyError.message,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      // Reject all JWT-related errors
      if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token - authentication failed' 
        });
      }
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired - please login again' 
        });
      }
      if (verifyError.name === 'NotBeforeError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token not yet valid' 
        });
      }
      // SECURITY: Reject ANY other error during token verification
      // This ensures that malformed tokens, wrong secrets, or any other issues result in rejection
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - authentication failed' 
      });
    }
    
    // SECURITY: Additional validation - ensure decoded token is not null/undefined
    if (!decoded) {
      console.warn('[Auth] Token decoded to null/undefined');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - authentication failed' 
      });
    }
    
    // SECURITY: Validate decoded token structure - strict validation
    if (!decoded.userId || typeof decoded.userId !== 'number' || decoded.userId <= 0) {
      console.warn('[Auth] Invalid userId in token:', decoded.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token payload' 
      });
    }
    
    if (!decoded.email || typeof decoded.email !== 'string' || decoded.email.trim().length === 0) {
      console.warn('[Auth] Invalid email in token');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token payload' 
      });
    }
    
    // SECURITY: Verify token type is access token (not refresh token)
    if (decoded.type !== 'access') {
      console.warn('[Auth] Wrong token type:', decoded.type);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token type - access token required' 
      });
    }
    
    // SECURITY: Verify user still exists and get current role from database
    // Use parameterized query to prevent SQL injection
    let userResult;
    try {
      userResult = await db.query(
      'SELECT id, name, role, email, is_active FROM users WHERE id = $1 AND email = $2',
      [decoded.userId, decoded.email]
    );
    } catch (dbError) {
      console.error('[Auth] Database error during user verification:', dbError);
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection error. Please try again.' 
      });
    }

    // SECURITY: Strict validation - user must exist
    if (!userResult || !userResult.rows || userResult.rows.length === 0) {
      console.warn('[Auth] Token valid but user not found:', { 
        userId: decoded.userId, 
        email: decoded.email,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }
    
    // SECURITY: Check if user account is active - reject deactivated accounts
    if (userResult.rows[0].is_active === false) {
      console.warn('[Auth] Attempted access with deactivated account:', {
        userId: decoded.userId,
        email: decoded.email,
        path: req.path,
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }
    
    // SECURITY: Additional validation - ensure user data is valid
    if (!userResult.rows[0].id || !userResult.rows[0].email) {
      console.error('[Auth] Invalid user data retrieved from database');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid user data' 
      });
    }

    // SECURITY: Set user from database (not from token) to prevent role manipulation
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    // Handle database connection errors
    if (error.message && (
      error.message.includes('timeout') || 
      error.message.includes('connection') ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED'
    )) {
      console.error('Database connection error during authentication:', error.message);
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection timeout. Please try again.' 
      });
    }
    console.error('Authentication error:', error);
    // SECURITY: Don't expose error details in production
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed - invalid token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Flatten roles array (handle both authorizeRoles('JR', 'SR') and authorizeRoles(['JR', 'SR']))
    const flatRoles = roles.flat();
    
    // Normalize role comparison (trim whitespace and handle case)
    const userRole = req.user.role ? req.user.role.trim() : null;
    const normalizedRoles = flatRoles.map(r => typeof r === 'string' ? r.trim() : r);
    
    // Check if user role matches any of the allowed roles (case-insensitive)
    const hasAccess = normalizedRoles.some(role => 
      userRole && userRole.toLowerCase() === role.toLowerCase()
    );

    if (!hasAccess) {
      console.error(`[Authorization] User role "${userRole}" not in allowed roles: [${normalizedRoles.join(', ')}]`);
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required roles: ${normalizedRoles.join(', ')}. Your role: ${userRole || 'unknown'}` 
      });
    }

    next();
  };
};

// Specific role middlewares
const requireAdmin = authorizeRoles('Admin');
const requireMWO = authorizeRoles('Psychiatric Welfare Officer');
const requireDoctor = authorizeRoles('Faculty', 'Resident');
const requireMWOOrDoctor = authorizeRoles('Psychiatric Welfare Officer', 'Faculty', 'Resident');

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const userResult = await db.query(
          'SELECT id, name, role, email FROM users WHERE id = $1 AND email = $2',
          [decoded.userId, decoded.email]
        );

        if (userResult.rows.length > 0) {
          req.user = userResult.rows[0];
        }
      } catch (error) {
        // If token is invalid, continue without user context
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, continue without user context
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireMWO,
  requireDoctor,
  requireMWOOrDoctor,
  optionalAuth
};
