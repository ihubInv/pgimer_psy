const path = require('path');

/**
 * Upload Configuration
 * 
 * This file centralizes all upload directory paths.
 * To change upload locations, modify the values below.
 * 
 * All paths are relative to the project root unless specified as absolute paths.
 * Use forward slashes (/) for cross-platform compatibility.
 * 
 * File Structure:
 * /fileupload/{role}/{document_type}/PATIENT_ID_{patient_id}/{files}
 * 
 * Roles: admin, faculty, resident, psychiatric_welfare_officer
 * Document Types: Patient_Details, Walk-in_Clinical_Proforma, Out_Patient_Intake_Record
 */

// Base upload directory (relative to project root)
// Change this to modify where all uploads are stored
const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || 'fileupload';

// Patient file uploads directory
// This is where patient files (documents, images) are stored
const PATIENT_FILES_PATH = process.env.PATIENT_FILES_PATH || UPLOAD_BASE_PATH;

// Legacy patient uploads (for backward compatibility)
const PATIENT_UPLOADS_PATH = process.env.PATIENT_UPLOADS_PATH || `${UPLOAD_BASE_PATH}/legacy`;

// Get absolute path for a relative path
const getAbsolutePath = (relativePath) => {
  // If already absolute, return as-is
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  // Otherwise, resolve relative to project root
  return path.join(__dirname, '..', relativePath);
};

// Get relative URL path for serving files
const getUrlPath = (filePath) => {
  // Convert absolute path to relative URL path
  // Remove project root and normalize slashes
  const projectRoot = path.join(__dirname, '..');
  const relativePath = path.relative(projectRoot, filePath);
  // Use forward slashes for URLs
  return '/' + relativePath.replace(/\\/g, '/');
};

/**
 * Map user role to folder name
 */
const mapRoleToFolder = (role) => {
  if (!role) return 'admin';
  const roleLower = role.trim().toLowerCase();
  
  // Map roles to folder names
  const roleMap = {
    'admin': 'admin',
    'faculty': 'faculty',
    'resident': 'resident',
    'psychiatric welfare officer': 'psychiatric_welfare_officer',
    'psychiatric_welfare_officer': 'psychiatric_welfare_officer',
    'mwo': 'psychiatric_welfare_officer'
  };
  
  return roleMap[roleLower] || roleLower.replace(/\s+/g, '_');
};

/**
 * Format patient ID as PATIENT_ID_{patient_id}
 */
const formatPatientId = (patientId) => {
  const id = String(patientId).padStart(3, '0');
  return `PATIENT_ID_${id}`;
};

/**
 * Get document type from request or default
 */
const getDocumentType = (documentType) => {
  if (!documentType) return 'Patient_Details';
  
  // Normalize document type
  const docType = documentType.trim();
  const validTypes = [
    'Patient_Details',
    'Walk-in_Clinical_Proforma',
    'Out_Patient_Intake_Record'
  ];
  
  // Check if it's a valid type
  if (validTypes.includes(docType)) {
    return docType;
  }
  
  // Map common variations
  const typeMap = {
    'patient_details': 'Patient_Details',
    'patient details': 'Patient_Details',
    'walk-in': 'Walk-in_Clinical_Proforma',
    'walk-in_clinical_proforma': 'Walk-in_Clinical_Proforma',
    'walk-in clinical proforma': 'Walk-in_Clinical_Proforma',
    'clinical_proforma': 'Walk-in_Clinical_Proforma',
    'out_patient': 'Out_Patient_Intake_Record',
    'out_patient_intake_record': 'Out_Patient_Intake_Record',
    'out patient intake record': 'Out_Patient_Intake_Record',
    'intake_record': 'Out_Patient_Intake_Record'
  };
  
  return typeMap[docType.toLowerCase()] || 'Patient_Details';
};

module.exports = {
  // Base paths (relative to project root)
  UPLOAD_BASE_PATH,
  PATIENT_FILES_PATH,
  PATIENT_UPLOADS_PATH,
  
  // Helper functions
  mapRoleToFolder,
  formatPatientId,
  getDocumentType,
  
  // Absolute paths (for file system operations)
  getAbsolutePath,
  getPatientFilesDir: (patientId, role = null, documentType = null) => {
    const baseDir = getAbsolutePath(PATIENT_FILES_PATH);
    const roleFolder = role ? mapRoleToFolder(role) : 'admin';
    const docType = getDocumentType(documentType);
    const patientFolder = formatPatientId(patientId);
    
    // Structure: /fileupload/{role}/{document_type}/PATIENT_ID_{patient_id}/
    return path.join(baseDir, roleFolder, docType, patientFolder);
  },
  
  getPatientUploadsDir: (patientId) => {
    return path.join(getAbsolutePath(PATIENT_UPLOADS_PATH), formatPatientId(patientId));
  },
  
  // URL paths (for serving files)
  getUrlPath,
  getPatientFileUrl: (filePath, role = null, documentType = null) => {
    // If filePath is already a URL path, return as-is
    if (filePath.startsWith('/')) {
      return filePath;
    }
    // Otherwise, convert to URL path
    return getUrlPath(filePath);
  },
  
  // Helper to get base URL path for patient files
  getPatientFilesBaseUrl: (role = null, documentType = null) => {
    const roleFolder = role ? mapRoleToFolder(role) : 'admin';
    const docType = getDocumentType(documentType);
    return `/${PATIENT_FILES_PATH}/${roleFolder}/${docType}`;
  }
};

