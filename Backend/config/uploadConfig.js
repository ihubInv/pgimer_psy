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
 * /fileupload/{role}/{document_type}/{patient_id}/{files}
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
  // If filePath is already a URL path (starts with /), return as-is
  if (filePath.startsWith('/') && !filePath.startsWith('/var/') && !filePath.startsWith('/usr/') && !filePath.startsWith('/home/')) {
    return filePath;
  }
  
  // Convert absolute path to relative URL path
  const projectRoot = path.join(__dirname, '..');
  
  // Normalize paths for comparison
  const normalizedFilePath = path.normalize(filePath);
  const normalizedProjectRoot = path.normalize(projectRoot);
  
  // Check if filePath is within project root
  if (normalizedFilePath.startsWith(normalizedProjectRoot)) {
    // Get relative path from project root
    const relativePath = path.relative(normalizedProjectRoot, normalizedFilePath);
    // Use forward slashes for URLs and ensure it starts with /
    return '/' + relativePath.replace(/\\/g, '/');
  }
  
  // If filePath is an absolute path outside project root, try to extract fileupload path
  // Look for /fileupload/ in the path
  const fileuploadIndex = normalizedFilePath.indexOf('fileupload');
  if (fileuploadIndex !== -1) {
    // Extract everything from fileupload onwards
    const fileuploadPath = normalizedFilePath.substring(fileuploadIndex);
    return '/' + fileuploadPath.replace(/\\/g, '/');
  }
  
  // Fallback: try to extract relative path from common patterns
  // If it contains Backend/fileupload, extract from there
  const backendFileuploadIndex = normalizedFilePath.indexOf('Backend' + path.sep + 'fileupload');
  if (backendFileuploadIndex !== -1) {
    const fileuploadPath = normalizedFilePath.substring(backendFileuploadIndex + 'Backend'.length);
    return fileuploadPath.replace(/\\/g, '/');
  }
  
  // Last resort: return as relative path with forward slashes
  return '/' + normalizedFilePath.replace(/\\/g, '/').replace(/^\/+/, '');
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
 * Format patient ID - return original ID as-is (no PATIENT_ID_ prefix)
 */
const formatPatientId = (patientId) => {
  // Return the original patient ID as-is (e.g., 50 instead of PATIENT_ID_050)
  return String(patientId);
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
    
    // Structure: /fileupload/{role}/{document_type}/{patient_id}/
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
  },
  
  // Convert URL path to absolute file system path
  // Input: /fileupload/psychiatric_welfare_officer/Patient_Details/50/file.png
  // Output: /var/www/pgimer_psy/Backend/fileupload/psychiatric_welfare_officer/Patient_Details/50/file.png
  urlPathToAbsolutePath: (urlPath) => {
    if (!urlPath) return null;
    
    // If already absolute, return as-is
    if (path.isAbsolute(urlPath) && !urlPath.startsWith('/fileupload/') && !urlPath.startsWith('/uploads/')) {
      return urlPath;
    }
    
    // Remove leading slash if present
    let relativePath = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
    
    // If it starts with fileupload or uploads, use it directly
    // Otherwise, it might already be a relative path
    const projectRoot = path.join(__dirname, '..');
    const absolutePath = path.join(projectRoot, relativePath);
    
    return path.normalize(absolutePath);
  }
};

