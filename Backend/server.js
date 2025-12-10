const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
require('dotenv').config();

// Import configurations
const { swaggerSpecs, swaggerUiOptions } = require('./config/swagger');

// Import routes
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const patientFileRoutes = require('./routes/patientFileRoutes');
const clinicalRoutes = require('./routes/clinicalRoutes');
const adlRoutes = require('./routes/adlRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const prescriptionTemplateRoutes = require('./routes/prescriptionTemplateRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const roomRoutes = require('./routes/roomRoutes');

const app = express();
const PORT = process.env.PORT || 8000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 8001;

// SECURITY FIX #5: HTTPS redirect in production (DISABLED - using HTTP)
// const httpsRedirect = require('./middleware/httpsRedirect');
// if (process.env.NODE_ENV === 'production') {
//   app.use(httpsRedirect);
// }

// SECURITY FIX #9: Web Application Firewall (WAF) middleware
// Provides application-level protection against common attacks
const wafMiddleware = require('./middleware/waf');
app.use(wafMiddleware);

// Security middleware - configured to allow Google Fonts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "http:", "https:", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    },
  },
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: false, // Disable HSTS for HTTP connections
  // Disable X-Content-Type-Options to prevent MIME type blocking for external resources like Google Fonts
  // This allows the browser to load CSS from Google Fonts even if there are MIME type mismatches
  contentTypeNosniff: false,
}));


app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        `${process.env.SERVER_HOST}:${FRONTEND_PORT}`,
        `${process.env.SERVER_HOST}:${PORT}`,

      ]
    : [
        `${process.env.SERVER_HOST}:${FRONTEND_PORT}`,
        `${process.env.SERVER_HOST}:${PORT}`,
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// SECURITY FIX #15: Rate limiting for OTP generation endpoints to prevent flooding
// const otpRateLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 3, // Maximum 3 OTP requests per minute per IP
//   message: {
//     success: false,
//     message: 'Too many OTP requests. Please wait 60 seconds before requesting another OTP.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   skipSuccessfulRequests: false,
// });

// // General API rate limiting (more lenient)
// const apiRateLimiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP to 1000 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many requests from this IP, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Apply general rate limiting to all API routes
// app.use('/api/', apiRateLimiter);

// Compression middleware
app.use(compression());

// HTTP request logging middleware
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // Parse cookies for refresh tokens

// Secure file serving - MUST be before API routes but after authentication setup
const path = require('path');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const SecureFileController = require('./controllers/secureFileController');

// Serve files from /fileupload directory with authentication and authorization
// Path format: /fileupload/{role}/{document_type}/{patient_id}/{filename}
app.get('/fileupload/*', 
  authenticateToken,
  authorizeRoles('Admin', 'Psychiatric Welfare Officer', 'Faculty', 'Resident'),
  SecureFileController.servePatientFile
);

// Legacy /uploads route - also secured (for backward compatibility)
const uploadsPath = path.join(__dirname, 'fileupload');
const fileuploadPath = path.join(__dirname, 'fileupload');
console.log('[Server] Secure file serving enabled for /fileupload');
console.log('[Server] Fileupload directory:', fileuploadPath);
console.log('[Server] Legacy uploads directory:', uploadsPath);

// Legacy /uploads route - secured (if files exist in old location)
app.get('/fileupload/*',
  authenticateToken,
  authorizeRoles('Admin', 'Psychiatric Welfare Officer', 'Faculty', 'Resident'),
  (req, res, next) => {
    // For legacy files, use similar security but simpler path validation
    const requestedPath = req.path;
    const legacyPath = path.join(__dirname, 'fileupload', requestedPath.replace(/^\/fileupload\//, ''));
    const normalizedRequested = path.normalize(legacyPath);
    const normalizedBase = path.normalize(uploadsPath);
    
    // Prevent directory traversal
    if (!normalizedRequested.startsWith(normalizedBase)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Invalid file path'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(normalizedRequested)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Serve file with appropriate headers
    const ext = path.extname(normalizedRequested).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain'
    };
    
    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      const filename = path.basename(normalizedRequested);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    const fileStream = require('fs').createReadStream(normalizedRequested);
    fileStream.pipe(res);
  }
);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PGIMER Psychiatry API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Middleware to prevent HTTPS conversion for Swagger UI
app.use('/api-docs', (req, res, next) => {
  // Remove security headers that might force HTTPS
  res.removeHeader('Strict-Transport-Security');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Content-Type-Options');
  res.removeHeader('X-Frame-Options');
  // SECURITY FIX #18: Set X-XSS-Protection header properly
  // Modern browsers have built-in XSS protection, but we set it for legacy support
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Origin-Agent-Cluster');
  
  // Set headers to allow mixed content and prevent HTTPS conversion
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  // Override any HTTPS redirects
  if (req.headers['x-forwarded-proto'] === 'https') {
    req.headers['x-forwarded-proto'] = 'http';
  }
  
  next();
});

// API Documentation
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

// Favicon route to prevent 404 error
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content, but no error
});

// Serve Swagger UI with proper configuration
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerUiOptions));

app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patient-files', patientFileRoutes);
app.use('/api/clinical-proformas', clinicalRoutes);
app.use('/api/adl-files', adlRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/prescription-templates', prescriptionTemplateRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/rooms', roomRoutes);

// ✅ Updated Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to PGIMER Psychiatry API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      users: '/api/users',
      patients: '/api/patients',
      patientFiles: '/api/patient-files',
      clinicalProformas: '/api/clinical-proformas',
      adlFiles: '/api/adl-files',
      prescriptions: '/api/prescriptions',
      prescriptionTemplates: '/api/prescription-templates',
      medicines: '/api/medicines',
      session: '/api/session',
      rooms: '/api/rooms'
    }
  });
});


// SECURITY FIX #2.8 & #8 & #16: Block access to sensitive paths and prevent information leakage
// Block /src paths and configuration files - comprehensive protection
app.use((req, res, next) => {
  const path = req.path.toLowerCase();
  const originalPath = req.path;
  
  // SECURITY FIX #2.8: Block all frontend source code paths (case-insensitive)
  // This prevents source code exposure through the backend server
  if (path.includes('/src/') || 
      path.startsWith('/src/') || 
      path.endsWith('/src') ||
      originalPath.includes('/src/') ||
      originalPath.startsWith('/src/')) {
    console.warn(`[Security] Blocked source code access attempt: ${originalPath} from IP: ${req.ip}`);
    return res.status(404).json({
      success: false,
      message: 'Not found'
    });
  }
  
  // Block configuration files and sensitive directories
  const blockedPatterns = [
    '/package.json',
    '/package-lock.json',
    '/.env',
    '/.git',
    '/node_modules',
    '/.vscode',
    '/.idea',
    '/.gitignore',
    '/.gitattributes',
    '/vite.config.js',
    '/vite.config.ts',
    '/tsconfig.json',
    '/jsconfig.json',
    '/.eslintrc',
    '/.prettierrc',
    '/tailwind.config.js',
    '/postcss.config.js'
  ];
  
  for (const pattern of blockedPatterns) {
    if (path.includes(pattern.toLowerCase())) {
      console.warn(`[Security] Blocked configuration file access: ${originalPath} from IP: ${req.ip}`);
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }
  }
  
  // Block common source file extensions if accessed directly
  const blockedExtensions = ['.jsx', '.tsx', '.ts', '.js'];
  const pathLower = path.toLowerCase();
  for (const ext of blockedExtensions) {
    // Only block if it's a direct file access (not API routes)
    if (pathLower.endsWith(ext) && !pathLower.startsWith('/api/')) {
      // Allow if it's a built asset (in dist or assets folder)
      if (!pathLower.includes('/dist/') && !pathLower.includes('/assets/') && !pathLower.includes('/build/')) {
        console.warn(`[Security] Blocked source file access: ${originalPath} from IP: ${req.ip}`);
        return res.status(404).json({
          success: false,
          message: 'Not found'
        });
      }
    }
  }
  
  next();
});

// 404 handler - SECURITY FIX #19: Don't expose route information
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid input data'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid ID'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Authentication failed'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Please login again'
    });
  }

  // Handle database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Service temporarily unavailable'
    });
  }

  // SECURITY FIX #19: Generic error messages in production to prevent information leakage
  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? (err.message || 'Internal Server Error') : 'An unexpected error occurred. Please try again later.',
    error: isDevelopment ? err.stack : undefined // Never expose stack traces in production
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server with port fallback
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 EMRS PGIMER API Server is running!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📚 API Documentation: ${process.env.SERVER_HOST}:${PORT}/api-docs
🔍 Health Check: ${process.env.SERVER_HOST}:${PORT}/health
🏥 Endpoints:
   - Users: ${process.env.SERVER_HOST}:${PORT}/api/users
   - Patients: ${process.env.SERVER_HOST}:${PORT}/api/patients
   - Clinical Proformas: ${process.env.SERVER_HOST}:${PORT}/api/clinical-proformas
   - Out Patient Intake Record: ${process.env.SERVER_HOST}:${PORT}/api/adl-files
   - Prescriptions: ${process.env.SERVER_HOST}:${PORT}/api/prescriptions
  `);
});

// Handle port already in use error
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`
❌ Port ${PORT} is already in use!

🔧 Solutions:
1. Kill the process using port ${PORT}:
   npm run kill-port

2. Or manually kill the process:
   Windows: netstat -ano | findstr :${PORT}
   Linux/Mac: lsof -ti:${PORT} | xargs kill -9

3. Or change the PORT in your .env file to a different port
   PORT=5001

4. Or find and stop the other server manually
    `);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

module.exports = app;
