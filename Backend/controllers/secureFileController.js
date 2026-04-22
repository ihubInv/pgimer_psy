const path = require('path');
const fs = require('fs');
const Patient = require('../models/Patient');
const ChildPatientRegistration = require('../models/ChildPatientRegistration');
const db = require('../config/database');

/**
 * Secure file serving controller
 * Validates paths and record existence before streaming from /fileupload
 */
class SecureFileController {
  /**
   * Resolve path under Backend/fileupload and ensure it stays within that directory.
   * @param {string[]} pathParts — segments after /fileupload/
   * @returns {string|null} normalized absolute file path or null if invalid
   */
  static _getNormalizedUploadFilePath(pathParts) {
    const projectRoot = path.join(__dirname, '..');
    const fileuploadDir = path.join(projectRoot, 'fileupload');
    const expectedAbsolutePath = path.join(fileuploadDir, pathParts.join(path.sep));
    const normalizedRequested = path.normalize(expectedAbsolutePath);
    const normalizedBase = path.normalize(fileuploadDir);
    if (!normalizedRequested.startsWith(normalizedBase)) {
      return null;
    }
    return normalizedRequested;
  }

  /**
   * Stream a file with appropriate headers (or send JSON error).
   * @returns {boolean} true if response was sent successfully
   */
  static _streamFileResponse(req, res, normalizedRequested) {
    if (!fs.existsSync(normalizedRequested)) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return false;
    }

    const stats = fs.statSync(normalizedRequested);
    if (!stats.isFile()) {
      res.status(400).json({
        success: false,
        message: 'Invalid file path'
      });
      return false;
    }

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
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return true;
    }

    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      const filename = path.basename(normalizedRequested);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    const fileStream = fs.createReadStream(normalizedRequested);
    fileStream.pipe(res);
    return true;
  }

  /**
   * Authorize child registration uploads: numeric folder = child row exists;
   * legacy child_<timestamp> folder = some row still references that path.
   */
  static async _authorizeChildRegistrationPath(folderId) {
    if (!folderId) return false;
    if (/^\d+$/.test(String(folderId))) {
      const c = await ChildPatientRegistration.findById(parseInt(folderId, 10));
      return !!c;
    }
    if (String(folderId).startsWith('child_')) {
      const like = `%/${folderId}/%`;
      const r = await db.query(
        `SELECT 1 FROM child_patient_registrations
         WHERE (photo_path IS NOT NULL AND photo_path LIKE $1)
            OR (documents IS NOT NULL AND documents::text LIKE $2)
         LIMIT 1`,
        [like, like]
      );
      return r.rows.length > 0;
    }
    return false;
  }

  /**
   * Folder on disk was renamed to numeric id after registration, but DB/client URL may still use child_<ts>.
   */
  static async _childNumericIdForLegacyFolder(tempFolderId) {
    if (!tempFolderId || !String(tempFolderId).startsWith('child_')) return null;
    const like = `%/${tempFolderId}/%`;
    const r = await db.query(
      `SELECT id FROM child_patient_registrations
       WHERE (photo_path IS NOT NULL AND photo_path LIKE $1)
          OR (documents IS NOT NULL AND documents::text LIKE $2)
       ORDER BY id DESC
       LIMIT 1`,
      [like, like]
    );
    if (!r.rows.length) return null;
    return r.rows[0].id;
  }

  /**
   * Serve patient files securely
   * - Adult: /fileupload/{role}/{document_type}/{numeric_patient_id}/{filename} → registered_patient
   * - Child registration: /fileupload/{role}/Child_Patient_Registration/{folder}/{filename}
   */
  static async servePatientFile(req, res) {
    try {
      const requestedPath = req.path;

      if (!requestedPath.startsWith('/fileupload/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path'
        });
      }

      const pathParts = requestedPath.replace(/^\/fileupload\//, '').split('/');

      if (pathParts.length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path format'
        });
      }

      const documentTypeRaw = pathParts[1];
      const folderOrPatientId = pathParts[2];
      // Case-insensitive / hyphen vs underscore so requests still hit child logic (avoids adult parseInt → 400)
      const documentTypeNorm = String(documentTypeRaw || '')
        .toLowerCase()
        .replace(/-/g, '_');
      const isChildPatientRegistration =
        documentTypeNorm === 'child_patient_registration';

      if (isChildPatientRegistration) {
        const allowed = await SecureFileController._authorizeChildRegistrationPath(folderOrPatientId);
        if (!allowed) {
          return res.status(404).json({
            success: false,
            message: 'Child patient or file path not found'
          });
        }
        let normalizedRequested = SecureFileController._getNormalizedUploadFilePath(pathParts);
        if (!normalizedRequested) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Invalid file path'
          });
        }
        // After rename, files often live under .../Child_Patient_Registration/<numericId>/ while URLs still say child_<ts>/
        if (
          !fs.existsSync(normalizedRequested) &&
          String(folderOrPatientId).startsWith('child_')
        ) {
          const numericId = await SecureFileController._childNumericIdForLegacyFolder(
            folderOrPatientId
          );
          if (numericId != null) {
            const altParts = [...pathParts];
            altParts[2] = String(numericId);
            const altPath = SecureFileController._getNormalizedUploadFilePath(altParts);
            if (altPath && fs.existsSync(altPath)) {
              normalizedRequested = altPath;
            }
          }
        }
        SecureFileController._streamFileResponse(req, res, normalizedRequested);
        return;
      }

      // Adult registered_patient files
      if (folderOrPatientId === 'temp' || String(folderOrPatientId).toLowerCase() === 'temp') {
        return res.status(404).json({
          success: false,
          message: 'File not found (temporary file)'
        });
      }

      const patientId = parseInt(folderOrPatientId, 10);

      if (isNaN(patientId) || patientId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID in file path'
        });
      }

      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      const normalizedRequested = SecureFileController._getNormalizedUploadFilePath(pathParts);
      if (!normalizedRequested) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Invalid file path'
        });
      }

      SecureFileController._streamFileResponse(req, res, normalizedRequested);
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
