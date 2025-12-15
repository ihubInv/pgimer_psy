// Production preview server with security headers
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8001;
const DIST_DIR = join(__dirname, 'dist');

// SECURITY FIX #2.18: Set security headers for ALL responses
app.use((req, res, next) => {
  // CRITICAL: Set X-XSS-Protection header
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');  // Changed from DENY to SAMEORIGIN for mobile compatibility
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy - Allow Google Fonts and backend API
  const apiUrl = process.env.VITE_API_URL || '/api';
  const apiOrigin = apiUrl.replace('/api', ''); // Remove /api to get origin
  
  // Build CSP directive allowing Google Fonts and backend API
  // Mobile-friendly: More permissive for mobile browsers
  const csp = [
    "default-src 'self'",
    `connect-src 'self' ${apiOrigin} http://pgimerpsych.org https://pgimerpsych.org http://www.pgimerpsych.org https://www.pgimerpsych.org https://fonts.googleapis.com`,
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: http: blob:",
    "frame-ancestors 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  next();
});

// Serve static files from dist directory
app.use(express.static(DIST_DIR, {
  setHeaders: (res, path) => {
    // Ensure security headers on all static files
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');  // Changed from DENY to SAMEORIGIN for mobile compatibility
    
    // Prevent caching of JS files
    if (path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Handle SPA routing - serve index.html for all non-API routes
app.use((req, res, next) => {
  // Skip if it's an API request or static asset
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
    return next();
  }
  
  // For all other routes, serve index.html (SPA routing)
  try {
    const indexHtml = readFileSync(join(DIST_DIR, 'index.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');  // Changed from DENY to SAMEORIGIN for mobile compatibility
    res.send(indexHtml);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on http://0.0.0.0:${PORT}`);
  console.log('Security headers enabled: X-XSS-Protection, X-Content-Type-Options, X-Frame-Options');
});

