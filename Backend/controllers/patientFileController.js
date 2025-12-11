const PatientFile = require('../models/PatientFile');
const Patient = require('../models/Patient');
const path = require('path');
const fs = require('fs');
const uploadConfig = require('../config/uploadConfig');

// Helper function to check if user can edit/delete files
const canEditDelete = (user, patientFile) => {
  if (!user || !patientFile) return false;
  
  const userRole = user.role?.trim();
  const userId = parseInt(user.id, 10);
  
  // Admin and MWO have full access
  if (userRole === 'Admin' || userRole === 'Psychiatric Welfare Officer') {
    return true;
  }
  
  // Faculty and Resident can only edit/delete their own uploads
  if (userRole === 'Faculty' || userRole === 'Resident') {
    const roleArray = Array.isArray(patientFile.role) ? patientFile.role : [];
    return roleArray.some(r => r.id === userId);
  }
  
  return false;
};

/**
 * Resolve file path dynamically using role, module, patient_id, and filename
 * Structure: Backend/fileupload/{role}/{module}/{patient_id}/{filename}
 * 
 * @param {string|number} patientId - Patient ID
 * @param {string} filename - Filename (e.g., "Screenshot_2025-10-09_105918.png")
 * @param {string} role - User role (optional, will use default if not provided)
 * @param {string} module - Module/document type (optional, defaults to "Patient_Details")
 * @returns {string} Absolute file system path
 */
const resolveFilePath = (patientId, filename, role = null, module = null) => {
  if (!patientId || !filename) {
    return null;
  }
  
  // Get role folder (default to 'admin' if not provided)
  const roleFolder = role ? uploadConfig.mapRoleToFolder(role) : 'admin';
  
  // Get module/document type (default to 'Patient_Details')
  const documentType = module ? uploadConfig.getDocumentType(module) : 'Patient_Details';
  
  // Format patient ID
  const patientFolder = uploadConfig.formatPatientId(patientId);
  
  // Get base directory
  const baseDir = uploadConfig.getAbsolutePath(uploadConfig.PATIENT_FILES_PATH);
  
  // Build full path: Backend/fileupload/{role}/{module}/{patient_id}/{filename}
  const filePath = path.join(baseDir, roleFolder, documentType, patientFolder, filename);
  
  return path.normalize(filePath);
};

/**
 * Resolve file path from URL path or relative path
 * Handles various input formats:
 * - /fileupload/psychiatric_welfare_officer/Patient_Details/50/file.png
 * - fileupload/psychiatric_welfare_officer/Patient_Details/50/file.png
 * - Full absolute path
 * 
 * @param {string} filePath - URL path, relative path, or absolute path
 * @returns {string} Absolute file system path
 */
const resolveFilePathFromUrl = (filePath) => {
  if (!filePath) return null;
  
  // If already absolute and exists, return as-is
  if (path.isAbsolute(filePath) && fs.existsSync(filePath)) {
    return path.normalize(filePath);
  }
  
  // Use config helper to convert URL path to absolute path
  const absolutePath = uploadConfig.urlPathToAbsolutePath(filePath);
  
  // If the path exists, return it
  if (absolutePath && fs.existsSync(absolutePath)) {
    return path.normalize(absolutePath);
  }
  
  // Try alternative: direct join with project root
  const projectRoot = path.join(__dirname, '..');
  const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  const altPath = path.join(projectRoot, normalizedPath);
  
  if (fs.existsSync(altPath)) {
    return path.normalize(altPath);
  }
  
  return path.normalize(absolutePath || altPath);
};

/**
 * Delete file from filesystem permanently
 * Tries multiple path resolution strategies to ensure file is found and deleted
 * 
 * @param {string} filePath - File path (URL, relative, or absolute)
 * @param {object} options - Options object with patientId, filename, role, module for dynamic resolution
 * @returns {object} Result object with { success: boolean, deleted: boolean, path: string, error: string }
 */
const deleteFileFromDisk = (filePath, options = {}) => {
  const { patientId, filename, role, module } = options;
  
  let deleted = false;
  let deletedPath = null;
  let error = null;
  
  // Strategy 1: Try resolving from provided filePath
  let absolutePath = resolveFilePathFromUrl(filePath);
  
  if (absolutePath && fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
      deleted = true;
      deletedPath = absolutePath;
      console.log('[deleteFileFromDisk] ✓ File deleted from resolved path:', absolutePath);
      return { success: true, deleted: true, path: deletedPath, error: null };
    } catch (err) {
      error = err.message;
      console.error('[deleteFileFromDisk] ✗ Error deleting from resolved path:', err.message);
    }
  }
  
  // Strategy 2: If we have patientId and filename, try dynamic resolution
  if (patientId && filename && !deleted) {
    absolutePath = resolveFilePath(patientId, filename, role, module);
    
    if (absolutePath && fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
        deleted = true;
        deletedPath = absolutePath;
        console.log('[deleteFileFromDisk] ✓ File deleted from dynamic path:', absolutePath);
        return { success: true, deleted: true, path: deletedPath, error: null };
      } catch (err) {
        error = err.message;
        console.error('[deleteFileFromDisk] ✗ Error deleting from dynamic path:', err.message);
      }
    }
  }
  
  // Strategy 3: Try extracting path components from filePath and reconstructing
  if (!deleted && filePath) {
    // Extract components from path like: /fileupload/role/module/patient_id/filename
    const pathMatch = filePath.match(/fileupload[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)$/);
    if (pathMatch) {
      const [, extractedRole, extractedModule, extractedPatientId, extractedFilename] = pathMatch;
      absolutePath = resolveFilePath(extractedPatientId, extractedFilename, extractedRole, extractedModule);
      
      if (absolutePath && fs.existsSync(absolutePath)) {
        try {
          fs.unlinkSync(absolutePath);
          deleted = true;
          deletedPath = absolutePath;
          console.log('[deleteFileFromDisk] ✓ File deleted from extracted path:', absolutePath);
          return { success: true, deleted: true, path: deletedPath, error: null };
        } catch (err) {
          error = err.message;
          console.error('[deleteFileFromDisk] ✗ Error deleting from extracted path:', err.message);
        }
      }
    }
  }
  
  // If we couldn't delete, return failure
  console.warn('[deleteFileFromDisk] ✗✗✗ Could not delete file:', filePath);
  console.warn('[deleteFileFromDisk] Tried paths:', {
    resolved: resolveFilePathFromUrl(filePath),
    dynamic: patientId && filename ? resolveFilePath(patientId, filename, role, module) : 'N/A'
  });
  
  return { 
    success: false, 
    deleted: false, 
    path: null, 
    error: error || 'File not found or could not be deleted' 
  };
};

class PatientFileController {
  // Get patient files
  static async getPatientFiles(req, res) {
    try {
      const { patient_id } = req.params;
      const patientIdInt = parseInt(patient_id, 10);

      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      // Check if patient exists
      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Get patient files
      const patientFile = await PatientFile.findByPatientId(patientIdInt);

      res.status(200).json({
        success: true,
        data: {
          patient_id: patientIdInt,
          files: patientFile ? patientFile.attachment : [],
          record: patientFile ? patientFile.toJSON() : null,
          can_edit: patientFile ? canEditDelete(req.user, patientFile) : false
        }
      });
    } catch (error) {
      console.error('Get patient files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patient files',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Create/Upload patient files
  static async createPatientFiles(req, res) {
    try {
      console.log('[createPatientFiles] Request received');
      console.log('[createPatientFiles] req.body:', req.body);
      console.log('[createPatientFiles] req.files:', req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 'no files');
      console.log('[createPatientFiles] req.user:', req.user ? { id: req.user.id, role: req.user.role } : 'no user');
      
      const { patient_id, user_id } = req.body;
      const patientIdInt = parseInt(patient_id, 10);
      const userId = parseInt(user_id || req.user?.id, 10);
      
      console.log('[createPatientFiles] Parsed patient_id:', patientIdInt, 'user_id:', userId);

      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        // Clean up uploaded files if patient ID is invalid
        const files = Array.isArray(req.files) ? req.files : [];
        if (files.length > 0) {
          files.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
              } catch (err) {
                console.error('Error cleaning up file:', err);
              }
            }
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      // Check if patient exists
      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        // Clean up uploaded files if patient doesn't exist
        const files = Array.isArray(req.files) ? req.files : [];
        if (files.length > 0) {
          files.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
              } catch (err) {
                console.error('Error cleaning up file:', err);
              }
            }
          });
        }
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Ensure req.files is an array
      const files = Array.isArray(req.files) ? req.files : [];
      
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Get user role for folder structure
      const userRole = req.user?.role?.trim() || 'Admin';
      
      // Get document type from request body or default to Patient_Details
      const documentType = req.body.document_type || req.body.file_type || 'Patient_Details';
      
      console.log('[createPatientFiles] Role:', userRole, 'Document Type:', documentType);
      
      // Check if record exists to get the ID
      let patientFile = await PatientFile.findByPatientId(patientIdInt);
      
      // If no record exists, create it first
      if (!patientFile) {
        // Create empty record first
        patientFile = await PatientFile.create({
          patient_id: patientIdInt,
          attachment: [],
          user_id: userId
        });
      }
      
      // Files are already in the correct location (multer handles it via dynamic storage)
      // Directory structure: /fileupload/{role}/{document_type}/{patient_id}/
      // Just need to get the file paths and store them in database
      const filePaths = [];
      
      for (const file of files) {
        console.log('[createPatientFiles] Processing file:', file.originalname, 'Path:', file.path);
        
        // File is already in the correct directory structure:
        // /fileupload/{role}/{document_type}/{patient_id}/{filename}
        // Just get the URL path for database storage
        const relativePath = uploadConfig.getPatientFileUrl(file.path, userRole, documentType);
        console.log('[createPatientFiles] File saved with URL path:', relativePath);
        filePaths.push(relativePath);
      }

      // Update patient file record with new files
      const updatedFiles = [...(patientFile.attachment || []), ...filePaths];
      patientFile = await PatientFile.update(patientFile.id, {
        attachment: updatedFiles,
        user_id: userId
      });

      res.status(201).json({
        success: true,
        message: `${files.length} file(s) uploaded successfully`,
        data: {
          files: filePaths,
          record: patientFile.toJSON()
        }
      });
    } catch (error) {
      console.error('Create patient files error:', error);
      // Clean up uploaded files on error
      const files = Array.isArray(req.files) ? req.files : [];
      if (files.length > 0) {
        const { patient_id } = req.body;
        const patientIdInt = parseInt(patient_id, 10);
        if (!isNaN(patientIdInt)) {
          files.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
              } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
              }
            }
          });
        }
      }
      res.status(500).json({
        success: false,
        message: 'Failed to upload files',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update patient files (add/remove)
  static async updatePatientFiles(req, res) {
    try {
      console.log('[updatePatientFiles] Request received');
      console.log('[updatePatientFiles] req.params:', req.params);
      console.log('[updatePatientFiles] req.body:', req.body);
      console.log('[updatePatientFiles] req.files:', req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 'no files');
      console.log('[updatePatientFiles] req.user:', req.user ? { id: req.user.id, role: req.user.role } : 'no user');
      
      const { patient_id } = req.params;
      // Handle both files_to_remove and files_to_remove[] formats (FormData can send arrays differently)
      let files_to_remove = req.body.files_to_remove || req.body['files_to_remove[]'] || [];
      if (!Array.isArray(files_to_remove)) {
        if (typeof files_to_remove === 'string') {
          try {
            files_to_remove = JSON.parse(files_to_remove);
          } catch (e) {
            files_to_remove = [files_to_remove];
          }
        } else {
          files_to_remove = [];
        }
      }
      
      const patientIdInt = parseInt(patient_id, 10);
      const userId = parseInt(req.user?.id, 10);
      
      console.log('[updatePatientFiles] Parsed patient_id:', patientIdInt, 'user_id:', userId, 'files_to_remove:', files_to_remove);

      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      // Check if patient exists
      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Get existing record
      const existing = await PatientFile.findByPatientId(patientIdInt);
      
      // Parse files to remove (already parsed above, but ensure it's an array)
      const filesToRemove = files_to_remove || [];
      
      // Check permissions for files being removed (not for adding new files)
      // Users can always add new files, but can only remove files they uploaded
      if (existing && filesToRemove.length > 0) {
        // Check if user has permission to remove the requested files
        const unauthorizedRemovals = filesToRemove.filter(filePath => {
          // If user can't edit/delete the record, they can't remove any files
          if (!canEditDelete(req.user, existing)) {
            return true;
          }
          return false;
        });
        
        if (unauthorizedRemovals.length > 0) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to remove these files. You can only remove files you uploaded.'
          });
        }
      }

      const newFiles = [];

      // Get user role for folder structure
      const userRole = req.user?.role?.trim() || 'Admin';
      
      // Get document type from request body or default to Patient_Details
      const documentType = req.body.document_type || req.body.file_type || 'Patient_Details';
      
      console.log('[updatePatientFiles] Role:', userRole, 'Document Type:', documentType);

      // Get or create record
      let currentRecord = existing;
      if (!currentRecord) {
        currentRecord = await PatientFile.findByPatientId(patientIdInt);
        if (!currentRecord) {
          // Create empty record first
          currentRecord = await PatientFile.create({
            patient_id: patientIdInt,
            attachment: [],
            user_id: userId
          });
        }
      }

      // Handle new file uploads
      const files = Array.isArray(req.files) ? req.files : [];
      if (files.length > 0) {
        console.log('[updatePatientFiles] Processing', files.length, 'new file(s)');
        
        // Get existing files before adding new ones
        let existingFiles = existing ? [...(existing.attachment || [])] : [];
        
        // Files are already in the correct location (multer handles it via dynamic storage)
        // Directory structure: /fileupload/{role}/{document_type}/{patient_id}/
        // Just need to get the file paths and store them in database
        for (const file of files) {
          console.log('[updatePatientFiles] Processing file:', file.originalname, 'Path:', file.path);
          
          // Extract filename to check if a file with the same name already exists
          const filename = file.originalname || path.basename(file.path);
          
          // Check if a file with the same name already exists in the database
          // If so, delete the old file from filesystem before saving the new one
          const existingFileWithSameName = existingFiles.find(existingFile => {
            const existingFilename = path.basename(existingFile);
            return existingFilename === filename || existingFile.endsWith(`/${filename}`);
          });
          
          if (existingFileWithSameName) {
            console.log('[updatePatientFiles] File with same name exists, deleting old file:', existingFileWithSameName);
            
            // Delete the old file from filesystem
            const deleteResult = deleteFileFromDisk(existingFileWithSameName, {
              patientId: patientIdInt,
              filename: filename,
              role: userRole,
              module: documentType
            });
            
            if (deleteResult.deleted) {
              console.log('[updatePatientFiles] ✓ Old file deleted successfully:', deleteResult.path);
            } else {
              console.warn('[updatePatientFiles] Warning: Could not delete old file:', deleteResult.error);
            }
            
            // Remove the old file from the existing files array
            existingFiles = existingFiles.filter(f => f !== existingFileWithSameName);
          }
          
          // File is already in the correct directory structure
          // Just get the URL path for database storage
          const relativePath = uploadConfig.getPatientFileUrl(file.path, userRole, documentType);
          console.log('[updatePatientFiles] File saved with URL path:', relativePath);
          newFiles.push(relativePath);
        }
      }

      // Get existing files (may have been modified if files were replaced)
      let updatedFiles = existing ? [...(existing.attachment || [])] : [];
      
      // If we removed files during replacement, update the array
      if (files.length > 0 && existing) {
        // Rebuild updatedFiles to exclude files that were replaced
        updatedFiles = existing.attachment.filter(existingFile => {
          // Check if this file was replaced by a new upload
          const wasReplaced = files.some(newFile => {
            const newFilename = newFile.originalname || path.basename(newFile.path);
            const existingFilename = path.basename(existingFile);
            return existingFilename === newFilename || existingFile.endsWith(`/${newFilename}`);
          });
          return !wasReplaced; // Keep files that weren't replaced
        });
      }

      // Add new files
      updatedFiles = [...updatedFiles, ...newFiles];

      // Remove specified files
      if (filesToRemove.length > 0) {
        console.log('[updatePatientFiles] Removing', filesToRemove.length, 'file(s)');
        console.log('[updatePatientFiles] Files to remove:', filesToRemove);
        console.log('[updatePatientFiles] Current files in database:', updatedFiles);
        
        // Normalize file paths for comparison
        const normalizeFilePath = (filePath) => {
          if (!filePath) return '';
          let normalized = String(filePath).trim();
          
          // Remove leading/trailing whitespace
          normalized = normalized.trim();
          
          // If it's a full URL, extract the path
          if (normalized.startsWith('http://') || normalized.startsWith('http://')) {
            try {
              const url = new URL(normalized);
              normalized = url.pathname;
            } catch (e) {
              // If URL parsing fails, try to extract path manually
              const match = normalized.match(/\/fileupload\/.*/) || normalized.match(/\/uploads\/.*/);
              if (match) normalized = match[0];
            }
          }
          
          // If it's an absolute file system path, extract relative path
          if (normalized.includes('/fileupload/')) {
            const fileuploadIndex = normalized.indexOf('/fileupload/');
            normalized = normalized.substring(fileuploadIndex);
          } else if (normalized.includes('/uploads/')) {
            const uploadsIndex = normalized.indexOf('/uploads/');
            normalized = normalized.substring(uploadsIndex);
          }
          
          // Ensure it starts with /
          if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
          }
          
          // Normalize path separators (use forward slashes)
          normalized = normalized.replace(/\\/g, '/');
          
          // Remove duplicate slashes
          normalized = normalized.replace(/\/+/g, '/');
          
          return normalized;
        };
        
        // Normalize all files to remove
        const normalizedFilesToRemove = filesToRemove.map(normalizeFilePath).filter(Boolean);
        const filesToRemoveSet = new Set(normalizedFilesToRemove);
        
        console.log('[updatePatientFiles] Normalized files to remove:', Array.from(filesToRemoveSet));
        
        // Track deletion results
        const deletionResults = [];
        
        updatedFiles = updatedFiles.filter(file => {
          const normalizedFile = normalizeFilePath(file);
          const shouldRemove = filesToRemoveSet.has(normalizedFile);
          
          if (shouldRemove) {
            console.log('[updatePatientFiles] Deleting file:', file, '(normalized:', normalizedFile, ')');
            
            // Extract filename from path for dynamic resolution
            let filename = path.basename(normalizedFile);
            if (!filename || filename === '.' || filename === '..') {
              const parts = normalizedFile.split(/[\/\\]/);
              filename = parts[parts.length - 1];
            }
            
            // Delete physical file using helper function
            const deleteResult = deleteFileFromDisk(normalizedFile, {
              patientId: patientIdInt,
              filename: filename,
              role: userRole,
              module: documentType
            });
            
            deletionResults.push({
              file: file,
              deleted: deleteResult.deleted,
              path: deleteResult.path,
              error: deleteResult.error
            });
            
            if (!deleteResult.deleted) {
              console.warn('[updatePatientFiles] Warning: Could not delete physical file:', file, '-', deleteResult.error);
              // Continue with database removal even if physical deletion failed
            }
            
            return false; // Remove from array
          }
          return true; // Keep in array
        });
        
        // Log deletion summary
        const successfulDeletions = deletionResults.filter(r => r.deleted).length;
        const failedDeletions = deletionResults.filter(r => !r.deleted).length;
        console.log('[updatePatientFiles] Deletion summary:', {
          total: deletionResults.length,
          successful: successfulDeletions,
          failed: failedDeletions
        });
        
        console.log('[updatePatientFiles] Files after removal:', updatedFiles);
      }

      // Update or create record
      console.log('[updatePatientFiles] Final file count:', updatedFiles.length);
      console.log('[updatePatientFiles] New files added:', newFiles.length);
      console.log('[updatePatientFiles] Files removed:', filesToRemove.length);
      
      let patientFile;
      if (existing) {
        console.log('[updatePatientFiles] Updating existing record ID:', existing.id);
        patientFile = await PatientFile.update(existing.id, {
          attachment: updatedFiles,
          user_id: userId
        });
        console.log('[updatePatientFiles] Record updated successfully');
      } else if (newFiles.length > 0 || updatedFiles.length > 0) {
        console.log('[updatePatientFiles] Creating new record');
        patientFile = await PatientFile.create({
          patient_id: patientIdInt,
          attachment: updatedFiles,
          user_id: userId
        });
        console.log('[updatePatientFiles] Record created successfully');
      } else {
        console.log('[updatePatientFiles] No files to update');
        return res.status(400).json({
          success: false,
          message: 'No files to update'
        });
      }

      console.log('[updatePatientFiles] Operation completed successfully');
      res.status(200).json({
        success: true,
        message: 'Files updated successfully',
        data: {
          files: updatedFiles,
          record: patientFile.toJSON()
        }
      });
    } catch (error) {
      console.error('Update patient files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update files',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete specific file
  static async deletePatientFile(req, res) {
    try {
      const { patient_id, file_path } = req.params;
      const patientIdInt = parseInt(patient_id, 10);

      if (isNaN(patientIdInt) || patientIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      // Check if patient exists
      const patient = await Patient.findById(patientIdInt);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Get existing record
      const existing = await PatientFile.findByPatientId(patientIdInt);
      
      // Normalize file path for comparison (decode URL encoding if present)
      const normalizedFilePath = decodeURIComponent(file_path);
      
      // Check if file exists in attachment array (if record exists)
      let fileInRecord = null;
      if (existing) {
        fileInRecord = existing.attachment.find(f => {
          const normalized = decodeURIComponent(f);
          return f === file_path || f === normalizedFilePath || normalized === file_path || normalized === normalizedFilePath;
        });
      }

      // If file is in database, check permissions
      if (fileInRecord && existing) {
        if (!canEditDelete(req.user, existing)) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to delete this file. You can only delete files you uploaded.'
          });
        }
      } else if (!fileInRecord && existing) {
        // File not in database but record exists - might be an orphan file
        // Still try to delete from filesystem, but don't update database
        console.log('[deletePatientFile] File not found in database record, attempting to delete orphan file from filesystem');
      } else if (!existing) {
        // No record exists - might be an orphan file
        // Still try to delete from filesystem
        console.log('[deletePatientFile] No patient file record exists, attempting to delete orphan file from filesystem');
      }

      // Extract filename from path
      // file_path could be: /fileupload/role/module/patient_id/filename or just filename
      let filename = path.basename(normalizedFilePath);
      if (!filename || filename === '.' || filename === '..') {
        // If basename extraction failed, try to extract from the full path
        const parts = normalizedFilePath.split(/[\/\\]/);
        filename = parts[parts.length - 1];
      }

      // Get user role and module from request or use defaults
      const userRole = req.user?.role?.trim() || req.body.role || 'Admin';
      const documentType = req.body.document_type || req.body.file_type || req.body.module || 'Patient_Details';

      console.log('[deletePatientFile] Deleting file:', {
        patientId: patientIdInt,
        filename: filename,
        role: userRole,
        module: documentType,
        filePath: normalizedFilePath
      });

      // Delete physical file from disk using helper function
      const deleteResult = deleteFileFromDisk(normalizedFilePath, {
        patientId: patientIdInt,
        filename: filename,
        role: userRole,
        module: documentType
      });

      if (!deleteResult.deleted) {
        console.warn('[deletePatientFile] Warning: Could not delete physical file:', deleteResult.error);
        
        // If file was not found in database and not found on disk, return error
        if (!fileInRecord) {
          return res.status(404).json({
            success: false,
            message: 'File not found in database or filesystem',
            error: deleteResult.error
          });
        }
      }

      // Update database only if file was in the record
      let updatedFiles = [];
      let patientFile = null;
      
      if (fileInRecord && existing) {
        // Remove from database - remove all matching variations
        updatedFiles = existing.attachment.filter(f => {
          const normalized = decodeURIComponent(f);
          return f !== file_path && 
                 f !== normalizedFilePath && 
                 normalized !== file_path && 
                 normalized !== normalizedFilePath;
        });

        const userId = parseInt(req.user?.id, 10);
        patientFile = await PatientFile.update(existing.id, {
          attachment: updatedFiles,
          user_id: userId
        });
      } else if (existing) {
        // File was not in database but record exists - just return success
        updatedFiles = existing.attachment;
        patientFile = existing;
      }

      res.status(200).json({
        success: true,
        message: deleteResult.deleted 
          ? (fileInRecord 
              ? 'File deleted successfully from filesystem and database' 
              : 'Orphan file deleted successfully from filesystem')
          : (fileInRecord
              ? 'File removed from database (physical file may not have been found)'
              : 'Could not delete file from filesystem'),
        data: {
          files: updatedFiles,
          record: patientFile ? patientFile.toJSON() : null,
          file_deleted: deleteResult.deleted,
          deletion_path: deleteResult.path,
          was_orphan: !fileInRecord
        }
      });
    } catch (error) {
      console.error('Delete patient file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get file upload statistics
  static async getFileStats(req, res) {
    try {
      const stats = await PatientFile.getStats();

      res.json({
        success: true,
        data: {
          stats
        }
      });
    } catch (error) {
      console.error('Get file stats error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to get file statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = PatientFileController;