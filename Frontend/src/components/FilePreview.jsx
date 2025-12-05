import { useState } from 'react';
import { FiX, FiDownload, FiImage, FiFile, FiFileText } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';

const FilePreview = ({ files = [], onDelete, canDelete = true, baseUrl = '' }) => {
  const [previewFile, setPreviewFile] = useState(null);
  const [previewType, setPreviewType] = useState(null);

  // Get file URL
  const getFileUrl = (filePath) => {
    if (!filePath) {
      console.warn('[FilePreview] Empty file path provided');
      return '';
    }
    
    // If it's already a full URL, return as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Get base URL and remove /api if present
    // For file URLs, we need the backend server URL (not the frontend dev server)
    const apiUrl = baseUrl || import.meta.env.VITE_API_URL || 'http://localhost:2025/api';
    
    // Extract the backend server URL from the API URL
    // API URL format: http://host:port/api -> we need http://host:port
    let baseUrlWithoutApi = apiUrl.replace(/\/api$/, ''); // Remove /api if present
    
    // If the API URL contains a port, use it; otherwise, try to determine backend port
    // In development, frontend is on 8001, backend is on 8002
    // In production, they might be on the same server
    if (!baseUrlWithoutApi || baseUrlWithoutApi === '/' || baseUrlWithoutApi.startsWith('/')) {
      // Extract hostname and port from API URL
      const apiUrlMatch = apiUrl.match(/http[s]?:\/\/([^\/]+)/);
      if (apiUrlMatch) {
        const hostAndPort = apiUrlMatch[1];
        // If API URL doesn't have a port, try to determine backend port
        if (!hostAndPort.includes(':')) {
          // Check if we're in development (frontend on 8001, backend on 8002)
          const currentPort = window.location.port;
          if (currentPort === '8001') {
            // Frontend dev server, backend is on 8002
            baseUrlWithoutApi = `http://${hostAndPort}:8002`;
          } else {
            // Production or other setup, use same host
            baseUrlWithoutApi = `http://${hostAndPort}`;
          }
        } else {
          baseUrlWithoutApi = `http://${hostAndPort}`;
        }
      } else {
        // Fallback: use current hostname with backend port
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const currentPort = window.location.port;
        if (currentPort === '8001') {
          baseUrlWithoutApi = `${protocol}//${hostname}:8002`; // Backend port
        } else {
          baseUrlWithoutApi = `${protocol}//${hostname}${currentPort ? `:${currentPort}` : ''}`;
        }
      }
    }
    
    // Handle absolute file system paths (e.g., /var/www/pgimer_psy/Backend/uploads/...)
    // Extract the relative path from the absolute path
    if (filePath.startsWith('/var/') || filePath.startsWith('/usr/') || filePath.startsWith('/home/') || filePath.includes('/Backend/uploads/')) {
      // Extract the path after /Backend/uploads/ or /uploads/
      let relativePath = filePath;
      
      // Try to extract relative path from absolute path
      const uploadsIndex = filePath.indexOf('/uploads/');
      if (uploadsIndex !== -1) {
        relativePath = filePath.substring(uploadsIndex);
      } else {
        // If it contains Backend/uploads, extract from there
        const backendUploadsIndex = filePath.indexOf('/Backend/uploads/');
        if (backendUploadsIndex !== -1) {
          relativePath = filePath.substring(backendUploadsIndex + '/Backend'.length);
        } else {
          // Fallback: try to find uploads directory
          const lastUploadsIndex = filePath.lastIndexOf('/uploads/');
          if (lastUploadsIndex !== -1) {
            relativePath = filePath.substring(lastUploadsIndex);
          }
        }
      }
      
      const fullUrl = `${baseUrlWithoutApi}${relativePath}`;
      return fullUrl;
    }
    
    // If it starts with /uploads, use it directly (backend serves from /uploads)
    if (filePath.startsWith('/uploads/')) {
      const fullUrl = `${baseUrlWithoutApi}${filePath}`;
      return fullUrl;
    }
    
    // If it's a relative path starting with uploads (no leading slash)
    if (filePath.startsWith('uploads/')) {
      const fullUrl = `${baseUrlWithoutApi}/${filePath}`;
      return fullUrl;
    }
    
    // If it starts with /, check if it's a path that needs /uploads prefix
    if (filePath.startsWith('/')) {
      // If it's already a full path starting with /uploads, use it
      if (filePath.startsWith('/uploads/')) {
        const fullUrl = `${baseUrlWithoutApi}${filePath}`;
        return fullUrl;
      }
      // If it's a patient_files path, it should already include /uploads prefix
      // But if it doesn't, add it
      if (filePath.startsWith('/patient_files/') || filePath.startsWith('/patients/')) {
        // Check if it already has /uploads prefix
        if (!filePath.startsWith('/uploads/')) {
          const fullUrl = `${baseUrlWithoutApi}/uploads${filePath}`;
;
          return fullUrl;
        }
        const fullUrl = `${baseUrlWithoutApi}${filePath}`;
      
        return fullUrl;
      }
      // Otherwise, prepend /uploads
      const fullUrl = `${baseUrlWithoutApi}/uploads${filePath}`;
      return fullUrl;
    }
    
    // Otherwise assume it's a relative path and prepend /uploads
    const fullUrl = `${baseUrlWithoutApi}/uploads/${filePath}`;
    return fullUrl;
  };

  // Get file type
  const getFileType = (filePath) => {
    if (!filePath) return 'unknown';
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return 'image';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    return 'file';
  };

  // Open preview modal
  const openPreview = (filePath) => {
    const fileType = getFileType(filePath);
    setPreviewFile(getFileUrl(filePath));
    setPreviewType(fileType);
  };

  // Close preview modal
  const closePreview = () => {
    setPreviewFile(null);
    setPreviewType(null);
  };

  // Download file
  const downloadFile = (filePath, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const url = getFileUrl(filePath);
    const link = document.createElement('a');
    link.href = url;
    link.download = filePath.split('/').pop();
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete file
  const handleDelete = (filePath, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this file?')) {
      if (onDelete) {
        onDelete(filePath);
      }
    }
  };


  if (!files || files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FiFileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No files uploaded</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {files
          .map((filePath, index) => {
            // Handle both string paths and object with path property
            const actualPath = typeof filePath === 'string' ? filePath : (filePath?.path || filePath?.url || filePath);
            if (!actualPath) {
              console.warn('[FilePreview] Invalid file path at index', index, ':', filePath);
              return null;
            }
            
            const fileType = getFileType(actualPath);
            const fileName = actualPath.split('/').pop();
            const fileUrl = getFileUrl(actualPath);
            return {
              actualPath,
              fileType,
              fileName,
              fileUrl,
              index
            };
          })
          .filter(Boolean)
          .map(({ actualPath, fileType, fileName, fileUrl, index }) => (
            <div
              key={`${actualPath}-${index}`}
              className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => openPreview(actualPath)}
            >
              {/* Image Preview */}
              {fileType === 'image' ? (
                <div className="aspect-square relative bg-gray-100">
                  <img
                    src={fileUrl || ''}
                    alt={fileName || 'Image'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const attemptedUrl = e.target?.src || fileUrl || 'unknown';
                      const errorInfo = {
                        fileUrl: String(fileUrl || ''),
                        originalPath: String(actualPath || ''),
                        fileName: String(fileName || ''),
                        baseUrl: String(baseUrl || import.meta.env.VITE_API_URL || ''),
                        attemptedUrl: String(attemptedUrl)
                      };
                      console.error('[FilePreview] Failed to load image:', errorInfo);
                      // Hide broken image and show error indicator
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      if (parent && !parent.querySelector('.error-indicator')) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'error-indicator w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 p-2';
                        errorDiv.innerHTML = `
                          <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p class="text-xs text-center">Image not found</p>
                          <p class="text-xs text-center text-gray-400 mt-1 truncate w-full px-2" title="${String(fileUrl || attemptedUrl).replace(/"/g, '&quot;').replace(/'/g, '&#39;')}">${String(fileUrl || attemptedUrl).substring(0, 50)}${String(fileUrl || attemptedUrl).length > 50 ? '...' : ''}</p>
                        `;
                        parent.appendChild(errorDiv);
                      }
                    }}
                    onLoad={() => {}}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <FiImage className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ) : (
                /* PDF/File Icon */
                <div className="aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                  {fileType === 'pdf' ? (
                    <FiFileText className="w-12 h-12 text-red-500 mb-2" />
                  ) : (
                    <FiFile className="w-12 h-12 text-blue-500 mb-2" />
                  )}
                  <p className="text-xs text-gray-600 text-center truncate w-full px-2">
                    {fileName}
                  </p>
                </div>
              )}

              {/* File Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-xs text-white truncate">{fileName}</p>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => downloadFile(actualPath, e)}
                  className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Download"
                >
                  <FiDownload className="w-4 h-4" />
                </button>
                {canDelete && onDelete && (
                  <button
                    onClick={(e) => handleDelete(actualPath, e)}
                    className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <Modal
          isOpen={!!previewFile}
          onClose={closePreview}
          title="File Preview"
          size="lg"
        >
          <div className="p-4">
            {previewType === 'image' ? (
              <div className="flex items-center justify-center">
                <img
                  src={previewFile}
                  alt="Preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            ) : previewType === 'pdf' ? (
              <div className="w-full h-[70vh]">
                <iframe
                  src={previewFile}
                  className="w-full h-full border-0 rounded-lg"
                  title="PDF Preview"
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <FiFile className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                <Button onClick={() => {
                  // Extract file path from preview URL
                  const filePath = previewFile.replace(/^.*\/uploads\//, '/uploads/');
                  downloadFile(filePath, null);
                }}>
                  <FiDownload className="w-4 h-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Extract file path from preview URL
                  const filePath = previewFile.replace(/^.*\/uploads\//, '/uploads/');
                  downloadFile(filePath, null);
                }}
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={closePreview}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default FilePreview;

