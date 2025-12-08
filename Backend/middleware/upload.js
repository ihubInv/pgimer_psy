const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadConfig = require('../config/uploadConfig');

// Get base upload directory from config
const baseUploadsDir = uploadConfig.getAbsolutePath(uploadConfig.PATIENT_FILES_PATH);

// Ensure base uploads directory exists
if (!fs.existsSync(baseUploadsDir)) {
  fs.mkdirSync(baseUploadsDir, { recursive: true });
}

// Configure storage with dynamic destination
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Get patient ID from params or body
      const patientId = req.params.patient_id || req.params.id || req.body.patient_id || 'temp';
      
      // Get user role from authenticated user or default to 'Admin'
      const userRole = req.user?.role?.trim() || req.body.role || 'Admin';
      
      // Get document type from body or default to 'Patient_Details'
      const documentType = req.body.document_type || req.body.file_type || 'Patient_Details';
      
      // Get the target directory using config helper
      const targetDir = uploadConfig.getPatientFilesDir(patientId, userRole, documentType);
      
      console.log('[upload middleware] Destination directory:', targetDir);
      console.log('[upload middleware] Patient ID:', patientId, 'Role:', userRole, 'Document Type:', documentType);
      
      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log('[upload middleware] Created directory:', targetDir);
      }
      
      cb(null, targetDir);
    } catch (error) {
      console.error('[upload middleware] Error setting destination:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename (sanitized)
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    // Use original filename to preserve file type and readability
    cb(null, originalName);
  }
});

// File filter - allow images and common document types
const fileFilter = (req, file, cb) => {
  // Allow images and common document types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: images (jpeg, jpg, png, gif, webp), PDF, Word documents, and text files.`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 20 // Maximum 20 files per request
  }
});

// Middleware for multiple file uploads - support both 'files' and 'attachments[]'
const uploadMultiple = upload.fields([
  { name: 'files', maxCount: 20 },
  { name: 'attachments[]', maxCount: 20 }
]);

// Middleware wrapper to handle errors and normalize file arrays
const handleUpload = (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds 10MB limit'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum 20 files allowed.'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Unexpected file field name. Use "files" or "attachments[]" as the field name.'
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    
    // Normalize files - combine files from both field names into req.files array
    console.log('[handleUpload] Raw req.files:', req.files ? (typeof req.files === 'object' ? Object.keys(req.files) : 'not an object') : 'undefined');
    
    if (req.files) {
      const allFiles = [];
      if (req.files.files) {
        if (Array.isArray(req.files.files)) {
          allFiles.push(...req.files.files);
        } else {
          allFiles.push(req.files.files);
        }
      }
      if (req.files['attachments[]']) {
        if (Array.isArray(req.files['attachments[]'])) {
          allFiles.push(...req.files['attachments[]']);
        } else {
          allFiles.push(req.files['attachments[]']);
        }
      }
      req.files = allFiles;
      console.log('[handleUpload] Normalized files:', allFiles.length, 'file(s)');
      if (allFiles.length > 0) {
        allFiles.forEach((file, idx) => {
          console.log(`[handleUpload] File ${idx + 1}:`, file.originalname, 'Path:', file.path, 'Size:', file.size, 'Exists:', file.path ? fs.existsSync(file.path) : 'no path');
        });
      } else {
        console.log('[handleUpload] WARNING: req.files exists but no files found after normalization');
        console.log('[handleUpload] req.files structure:', JSON.stringify(Object.keys(req.files || {})));
      }
    } else {
      console.log('[handleUpload] No files in request (req.files is undefined/null)');
    }
    
    next();
  });
};

module.exports = {
  upload,
  uploadMultiple,
  handleUpload,
  uploadsDir
};

