const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const accessLogPath = path.join(logsDir, 'access.log');
const errorLogPath = path.join(logsDir, 'error.log');

// Helper function to format log entry
const formatLogEntry = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };
  return JSON.stringify(logEntry) + '\n';
};

// Helper function to write to log file
const writeToLogFile = (filePath, logEntry) => {
  fs.appendFile(filePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
};

// Access log middleware
const accessLogger = (req, res, next) => {
  const start = Date.now();
  
  // Override res.end to log response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    const logEntry = formatLogEntry('INFO', 'HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user.id : null,
      userRole: req.user ? req.user.role : null
    });
    
    writeToLogFile(accessLogPath, logEntry);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Error logger
const errorLogger = (err, req, res, next) => {
  const logEntry = formatLogEntry('ERROR', 'Application Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user ? req.user.id : null,
    userRole: req.user ? req.user.role : null
  });
  
  writeToLogFile(errorLogPath, logEntry);
  
  next(err);
};

// Custom logger for application events
const logger = {
  info: (message, meta = {}) => {
    const logEntry = formatLogEntry('INFO', message, meta);
    console.log(logEntry.trim());
    writeToLogFile(accessLogPath, logEntry);
  },
  
  error: (message, meta = {}) => {
    const logEntry = formatLogEntry('ERROR', message, meta);
    console.error(logEntry.trim());
    writeToLogFile(errorLogPath, logEntry);
  },
  
  warn: (message, meta = {}) => {
    const logEntry = formatLogEntry('WARN', message, meta);
    console.warn(logEntry.trim());
    writeToLogFile(accessLogPath, logEntry);
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = formatLogEntry('DEBUG', message, meta);
      console.debug(logEntry.trim());
      writeToLogFile(accessLogPath, logEntry);
    }
  }
};

module.exports = {
  accessLogger,
  errorLogger,
  logger
};
