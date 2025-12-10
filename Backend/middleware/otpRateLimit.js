/**
 * Enhanced OTP Rate Limiting Middleware
 * SECURITY FIX #2.15: Prevent OTP flooding with strict rate limits
 * 
 * Features:
 * - Per-IP rate limiting
 * - Per-email/account rate limiting
 * - Cooldown period between requests
 * - Daily/hourly caps
 * - Tracks requests in memory and database
 */

const rateLimit = require('express-rate-limit');
const db = require('../config/database');

// In-memory store for tracking OTP requests (for fast lookups)
// Format: { 'email:timestamp': count, 'ip:timestamp': count }
const otpRequestStore = new Map();
const COOLDOWN_PERIOD = 60 * 1000; // 60 seconds cooldown
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up old entries every 5 minutes

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of otpRequestStore.entries()) {
    if (data.expiresAt < now) {
      otpRequestStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Check if email has recent OTP request (cooldown check)
 */
async function checkEmailCooldown(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const cooldownKey = `email:${normalizedEmail}`;
  
  const lastRequest = otpRequestStore.get(cooldownKey);
  if (lastRequest && (now - lastRequest.timestamp) < COOLDOWN_PERIOD) {
    const remainingSeconds = Math.ceil((COOLDOWN_PERIOD - (now - lastRequest.timestamp)) / 1000);
    return {
      inCooldown: true,
      remainingSeconds
    };
  }
  
  return { inCooldown: false };
}

/**
 * Record OTP request for email
 */
function recordEmailRequest(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const cooldownKey = `email:${normalizedEmail}`;
  
  otpRequestStore.set(cooldownKey, {
    timestamp: now,
    expiresAt: now + COOLDOWN_PERIOD
  });
}

/**
 * Check daily/hourly limits for email
 */
async function checkEmailLimits(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  try {
    // Check hourly limit (5 OTPs per hour per email)
    const hourlyResult = await db.query(
      `SELECT COUNT(*) as count 
       FROM otp_request_log 
       WHERE email = $1 AND requested_at > $2`,
      [normalizedEmail, oneHourAgo]
    );
    const hourlyCount = parseInt(hourlyResult.rows[0].count, 10);
    if (hourlyCount >= 5) {
      return {
        exceeded: true,
        limit: 'hourly',
        count: hourlyCount,
        max: 5
      };
    }
    
    // Check daily limit (10 OTPs per day per email)
    const dailyResult = await db.query(
      `SELECT COUNT(*) as count 
       FROM otp_request_log 
       WHERE email = $1 AND requested_at > $2`,
      [normalizedEmail, oneDayAgo]
    );
    const dailyCount = parseInt(dailyResult.rows[0].count, 10);
    if (dailyCount >= 10) {
      return {
        exceeded: true,
        limit: 'daily',
        count: dailyCount,
        max: 10
      };
    }
    
    return { exceeded: false };
  } catch (error) {
    console.error('Error checking email limits:', error);
    // If database check fails, allow the request but log it
    return { exceeded: false };
  }
}

/**
 * Log OTP request to database
 */
async function logOTPRequest(email, ip, endpoint) {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    await db.query(
      `INSERT INTO otp_request_log (email, ip_address, endpoint, requested_at) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [normalizedEmail, ip, endpoint]
    );
  } catch (error) {
    console.error('Error logging OTP request:', error);
    // Don't fail the request if logging fails
  }
}

/**
 * Enhanced OTP rate limiter with per-IP limits
 */
const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 2, // Maximum 2 OTP requests per minute per IP (reduced from 3)
  message: {
    success: false,
    message: 'Too many OTP requests from this IP. Please wait 60 seconds before requesting another OTP.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks (if needed)
    return false;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests from this IP. Please wait 60 seconds before requesting another OTP.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  }
});

/**
 * Enhanced OTP rate limiting middleware
 * Checks both IP-based and email-based limits
 * Supports both email (forgot-password) and user_id (resend-login-otp) requests
 * SECURITY FIX #2.15: Prevents OTP flooding with multiple layers of protection
 */
const enhancedOTPRateLimit = (req, res, next) => {
  const email = req.body?.email;
  const user_id = req.body?.user_id;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const endpoint = req.path;
  let responseSent = false;
  
  // Helper to send response only once
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      res.status(status).json(data);
    }
  };
  
  // First, check IP-based rate limit (express-rate-limit)
  otpRateLimiter(req, res, async (err) => {
    if (err) {
      return sendResponse(429, {
        success: false,
        message: 'Too many OTP requests from this IP. Please wait 60 seconds before requesting another OTP.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      });
    }
    
    try {
      let emailToCheck = email;
      
      // If user_id is provided instead of email (for resend-login-otp), look up email
      if (!emailToCheck && user_id) {
        try {
          const User = require('../models/User');
          const user = await User.findById(user_id);
          if (user) {
            emailToCheck = user.email;
          }
        } catch (lookupError) {
          console.error('Error looking up user email for rate limiting:', lookupError);
          // Continue without email-based rate limiting if lookup fails
        }
      }
      
      // If no email available, continue (will be validated by controller)
      if (!emailToCheck) {
        if (!responseSent) {
          return next();
        }
        return;
      }
      
      // Check cooldown period (60 seconds between requests for same email)
      const cooldownCheck = await checkEmailCooldown(emailToCheck);
      if (cooldownCheck.inCooldown) {
        return sendResponse(429, {
          success: false,
          message: `Please wait ${cooldownCheck.remainingSeconds} seconds before requesting another OTP for this email.`,
          code: 'COOLDOWN_ACTIVE',
          retryAfter: cooldownCheck.remainingSeconds
        });
      }
      
      // Check daily/hourly limits
      const limitCheck = await checkEmailLimits(emailToCheck);
      if (limitCheck.exceeded) {
        const limitType = limitCheck.limit === 'hourly' ? 'hour' : 'day';
        return sendResponse(429, {
          success: false,
          message: `Too many OTP requests for this email. Maximum ${limitCheck.max} OTPs per ${limitType} allowed. Please try again later.`,
          code: 'EMAIL_LIMIT_EXCEEDED',
          limit: limitCheck.limit,
          count: limitCheck.count,
          max: limitCheck.max
        });
      }
      
      // Record the request
      recordEmailRequest(emailToCheck);
      // Log asynchronously (don't wait)
      logOTPRequest(emailToCheck, ip, endpoint).catch(err => {
        console.error('Error logging OTP request:', err);
      });
      
      // All checks passed, continue
      if (!responseSent) {
        next();
      }
    } catch (error) {
      console.error('Error in enhanced OTP rate limit:', error);
      // On error, allow the request but log it
      if (!responseSent) {
        next();
      }
    }
  });
};

module.exports = {
  otpRateLimiter,
  enhancedOTPRateLimit,
  checkEmailCooldown,
  checkEmailLimits
};

