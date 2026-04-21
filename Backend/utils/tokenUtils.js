const jwt = require('jsonwebtoken');

/** Default access TTL if env unset (matches previous behaviour). */
const DEFAULT_ACCESS_EXPIRES = '10m';

/**
 * Parse values like `10m`, `1h`, `2d`, `30s` into seconds (for cookies / API `expiresIn`).
 * Pure digits mean seconds (same as `jsonwebtoken` `expiresIn` number form).
 */
function parseAccessExpiresToSeconds(span) {
  const s = String(span).trim();
  if (!s) return 600;
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n > 0 ? n : 600;
  }
  const m = s.match(/^(\d+)\s*([smhd])$/i);
  if (!m) {
    console.warn(
      '[tokenUtils] JWT_ACCESS_EXPIRES_IN must be digits (seconds) or N[s|m|h|d]; using 10m:',
      s
    );
    return 600;
  }
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  const mult = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * mult[u];
}

function readAccessExpiresConfig() {
  const raw = process.env.JWT_ACCESS_EXPIRES_IN;
  const trimmed =
    raw == null || String(raw).trim() === '' ? DEFAULT_ACCESS_EXPIRES : String(raw).trim();
  if (/^\d+$/.test(trimmed)) {
    const sec = parseInt(trimmed, 10);
    const safe = sec > 0 ? sec : 600;
    return { jwtExpiresIn: safe, seconds: safe };
  }
  return { jwtExpiresIn: trimmed, seconds: parseAccessExpiresToSeconds(trimmed) };
}

const accessExpiresConfig = readAccessExpiresConfig();

/** Second argument to `jwt.sign` `expiresIn` (number = seconds, or string span). */
function getAccessTokenJwtExpiresIn() {
  return accessExpiresConfig.jwtExpiresIn;
}

/** TTL in seconds for login/refresh JSON `expiresIn` and access-token cookies. */
function getAccessTokenExpiresInSeconds() {
  return accessExpiresConfig.seconds;
}

/**
 * Generate a short-lived access token.
 * TTL: `JWT_ACCESS_EXPIRES_IN` (default `10m`). Examples: `900`, `15m`, `1h`, `2d`.
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: getAccessTokenJwtExpiresIn() }
  );
}

/**
 * Generate a long-lived refresh token (7 days)
 * Note: This is just for signing, actual token is stored in DB
 * @param {Object} payload - Token payload (userId, tokenId)
 * @returns {string} JWT refresh token
 */
function generateRefreshTokenJWT(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      tokenId: payload.tokenId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7 days TTL
  );
}

/**
 * Verify and decode an access token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
}

/**
 * Verify and decode a refresh token JWT
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 */
function verifyRefreshTokenJWT(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
}

/**
 * Extract device info from request headers
 * @param {Object} req - Express request object
 * @returns {string} Device information string
 */
function getDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  return userAgent.substring(0, 255); // Limit length
}

/**
 * Extract IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
function getIpAddress(req) {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         'Unknown';
}

module.exports = {
  generateAccessToken,
  generateRefreshTokenJWT,
  verifyAccessToken,
  verifyRefreshTokenJWT,
  getDeviceInfo,
  getIpAddress,
  getAccessTokenExpiresInSeconds,
  getAccessTokenJwtExpiresIn,
};

