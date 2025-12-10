/**
 * HTTPS Redirect Middleware
 * SECURITY FIX #5: Enforce HTTPS in production
 */

/**
 * Middleware to redirect HTTP to HTTPS in production
 * Only applies when NODE_ENV is 'production'
 */
const httpsRedirect = (req, res, next) => {
  // Only enforce HTTPS in production
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is already HTTPS
  const isHTTPS = req.secure || 
                  req.headers['x-forwarded-proto'] === 'https' ||
                  req.protocol === 'https';

  if (!isHTTPS) {
    // Redirect to HTTPS
    const httpsUrl = `https://${req.headers.host}${req.originalUrl}`;
    return res.redirect(301, httpsUrl);
  }

  next();
};

module.exports = httpsRedirect;

