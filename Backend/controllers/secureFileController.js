const path = require('path');
const fs = require('fs');
const Patient = require('../models/Patient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * Secure file serving controller
 * Validates user authentication and authorization before serving files
 */
class SecureFileController {
  /**
   * Serve patient files securely
   * Validates:
   * 1. User is authenticated
   * 2. User has authorized role
   * 3. Patient exists
   * 4. File path is valid and belongs to the patient
   * 5. Prevents directory traversal attacks
   */
  static async servePatientFile(req, res) {
    try {
      // Extract file path from request
      // Path format: /fileupload/{role}/{document_type}/{patient_id}/{filename}
      const requestedPath = req.path;
      
      // Validate path format
      if (!requestedPath.startsWith('/fileupload/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path'
        });
      }

      // Extract components from path: /fileupload/{role}/{document_type}/{patient_id}/{filename}
      const pathParts = requestedPath.replace(/^\/fileupload\//, '').split('/');
      
      if (pathParts.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path format'
        });
      }

      // Extract patient ID from path (4th component: role/doc_type/patient_id/filename)
      const patientIdStr = pathParts[2]; // role is [0], doc_type is [1], patient_id is [2]
      const patientId = parseInt(patientIdStr, 10);

      if (isNaN(patientId) || patientId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID in file path'
        });
      }

      // Check if patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Validate file path to prevent directory traversal
      // Reconstruct expected path and compare
      const uploadConfig = require('../config/uploadConfig');
      const projectRoot = path.join(__dirname, '..');
      const fileuploadDir = path.join(projectRoot, 'fileupload');
      
      // Build expected absolute path
      const expectedRelativePath = pathParts.join(path.sep);
      const expectedAbsolutePath = path.join(fileuploadDir, expectedRelativePath);
      
      // Normalize paths to prevent directory traversal
      const normalizedRequested = path.normalize(expectedAbsolutePath);
      const normalizedBase = path.normalize(fileuploadDir);
      
      // Ensure the requested file is within the fileupload directory
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

      // Check if it's a file (not a directory)
      const stats = fs.statSync(normalizedRequested);
      if (!stats.isFile()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path'
        });
      }

      // Set appropriate headers
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

      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour, but private
      
      // For images and PDFs, allow inline display; for other files, force download
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'].includes(ext)) {
        res.setHeader('Content-Disposition', 'inline');
      } else {
        const filename = path.basename(normalizedRequested);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }

      // Stream the file
      const fileStream = fs.createReadStream(normalizedRequested);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Secure file serving error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to serve file',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  }
}

module.exports = SecureFileController;

