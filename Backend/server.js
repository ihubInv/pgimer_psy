/*************************************************
 * PGIMER Psychiatry API – Corrected Server File
 *************************************************/

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Routes
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
const SecureFileController = require('./controllers/secureFileController');

const app = express();
const PORT = process.env.PORT || 8002;

/* =================================================
   TRUST NGINX PROXY (CRITICAL)
================================================= */
app.set('trust proxy', 1);

/* =================================================
   CORS – DOMAIN ONLY (NO IP / PORT)
   Mobile-friendly: Includes HTTPS variants and normalizes origins
================================================= */
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Normalize origin by removing trailing slashes
    const normalizedOrigin = origin.replace(/\/+$/, '');
    
    // Build allowed origins list (HTTPS prioritized, HTTP for fallback)
    const allowedOrigins = [
      'https://pgimerpsych.org',      // HTTPS prioritized
      'https://www.pgimerpsych.org',  // HTTPS prioritized
      'http://pgimerpsych.org',       // HTTP fallback (will redirect to HTTPS)
      'http://www.pgimerpsych.org'    // HTTP fallback (will redirect to HTTPS)
    ].map(o => o.replace(/\/+$/, '')); // Normalize all
    
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      // Log for debugging mobile issues
      console.warn(`[CORS] Blocked origin: ${origin} (normalized: ${normalizedOrigin})`);
      console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

/* =================================================
   SECURITY HEADERS
   HTTPS-enabled: HSTS enabled for secure connections
================================================= */
app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
    },
  },
}));

/* =================================================
   MIDDLEWARE
================================================= */
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =================================================
   LOGGING
================================================= */
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400
}));

/* =================================================
   AUTH DEBUG (REMOVE LATER IF YOU WANT)
================================================= */
app.use((req, res, next) => {
  console.log('[REQ]', req.method, req.path, {
    auth: req.headers.authorization ? 'YES' : 'NO',
    cookies: req.headers.cookie ? 'YES' : 'NO'
  });
  next();
});

/* =================================================
   HEALTH CHECK
================================================= */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PGIMER Psychiatry API is running',
    timestamp: new Date().toISOString()
  });
});

/* =================================================
   FILE SERVING ROUTE (Must be before API routes to avoid conflicts)
   Serves files from /fileupload/ directory with authentication
================================================= */
app.get('/fileupload/*', 
  SecureFileController.servePatientFile
);

/* =================================================
   API ROUTES
================================================= */
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

/* =================================================
   ROOT
================================================= */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to PGIMER Psychiatry API',
    health: '/api/health'
  });
});

/* =================================================
   404 HANDLER
================================================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/* =================================================
   GLOBAL ERROR HANDLER
================================================= */
app.use((err, req, res, next) => {
  console.error('❌ ERROR:', err);

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

/* =================================================
   START SERVER
================================================= */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 PGIMER Psychiatry API Started
🌐 Domain : https://pgimerpsych.org
🔗 API    : https://pgimerpsych.org/api
❤️ Health : https://pgimerpsych.org/api/health
📦 Port   : ${PORT}
🔒 SSL    : Enabled (HTTPS)
  `);
});

module.exports = app;
