import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { FiX, FiDownload, FiImage, FiFile, FiFileText } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';
import { selectCurrentToken } from '../features/auth/authSlice';
import { toast } from 'react-toastify';

// Component to load images with authentication
const AuthenticatedImage = ({ src, urlPath, baseUrl, token, alt, className, onError, onLoad }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!urlPath || !baseUrl) {
      setImageSrc(src);
      setIsLoading(false);
      return;
    }

    // If we have a token, fetch with authentication
    if (token) {
      const fullUrl = `${baseUrl}${urlPath}`;
     
      
      fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })
        .then(response => {
        
          if (!response.ok) {
            // Try to get error message from response
            return response.text().then(text => {
              let errorMessage = `HTTP ${response.status}`;
              try {
                const json = JSON.parse(text);
                errorMessage = json.message || errorMessage;
              } catch {
                errorMessage = text || errorMessage;
              }
              throw new Error(errorMessage);
            });
          }
          return response.blob();
        })
        .then(blob => {
         
          const blobUrl = URL.createObjectURL(blob);
          setImageSrc(blobUrl);
          setIsLoading(false);
          setHasError(false);
        })
        .catch(error => {
        
          setHasError(true);
          setIsLoading(false);
          // Don't fallback to src if it's the same URL that failed
          // Instead, set a placeholder or let the error handler show the error
          setImageSrc(null);
        });
    } else {
      // No token, use direct URL
    
      setImageSrc(src);
      setIsLoading(false);
    }

    // Cleanup blob URL on unmount
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [urlPath, baseUrl, token, src]);

  if (hasError && !imageSrc) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', minHeight: '100%' }}>
        <div className="text-center p-2">
          <FiImage className="w-8 h-8 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Failed to load</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', minHeight: '100%' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc || src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => {
       
        if (onError) {
          onError(e);
        }
      }}
      onLoad={(e) => {
       
        if (onLoad) {
          onLoad(e);
        }
      }}
      style={{ display: 'block' }}
    />
  );
};

const FilePreview = ({ 
  files = [], 
  onDelete, 
  canDelete = true,
  baseUrl = '',
  patient_id = null,
  onFileDeleted = null, // Optional callback after successful deletion
  refetchFiles = null // Optional function to refetch files after deletion
}) => {
  const [previewFile, setPreviewFile] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [blobUrls, setBlobUrls] = useState(new Map()); // Cache blob URLs
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const reduxToken = useSelector(selectCurrentToken);
  
  // Get token from Redux or localStorage as fallback
  const token = useMemo(() => {
    if (reduxToken) return reduxToken;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.token || localStorage.getItem('token') || null;
    } catch {
      return localStorage.getItem('token') || null;
    }
  }, [reduxToken]);

  // Get base URL without /api
  const baseUrlWithoutApi = useMemo(() => {
    const apiUrl = baseUrl || import.meta.env.VITE_API_URL || 'http://122.186.76.102:8002/api';
    let url = apiUrl.replace(/\/api$/, '');
    
    if (!url || url === '/' || url.startsWith('/')) {
      const apiUrlMatch = apiUrl.match(/http[s]?:\/\/([^\/]+)/);
      if (apiUrlMatch) {
        const hostAndPort = apiUrlMatch[1];
        if (!hostAndPort.includes(':')) {
          const currentPort = window.location.port;
          if (currentPort === '8001') {
            url = `http://${hostAndPort}:8002`;
          } else {
            url = `http://${hostAndPort}`;
          }
        } else {
          url = `http://${hostAndPort}`;
        }
      } else {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const currentPort = window.location.port;
        if (currentPort === '8001') {
          url = `${protocol}//${hostname}:8002`;
        } else {
          url = `${protocol}//${hostname}${currentPort ? `:${currentPort}` : ''}`;
        }
      }
    }
    return url;
  }, [baseUrl]);

  // Get file URL path (relative path for authenticated fetch)
  const getFileUrlPath = (filePath) => {
    if (!filePath) return '';
    
    // If it's already a full URL, extract the path
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      try {
        const url = new URL(filePath);
        return url.pathname;
      } catch {
        return '';
      }
    }
    
    // Handle absolute file system paths
    if (filePath.startsWith('/var/') || filePath.startsWith('/usr/') || filePath.startsWith('/home/') || 
        filePath.includes('/Backend/fileupload/') || filePath.includes('/Backend/uploads/')) {
      let relativePath = filePath;
      
      const fileuploadIndex = filePath.indexOf('/fileupload/');
      if (fileuploadIndex !== -1) {
        relativePath = filePath.substring(fileuploadIndex);
      } else {
        const backendFileuploadIndex = filePath.indexOf('/Backend/fileupload/');
        if (backendFileuploadIndex !== -1) {
          relativePath = filePath.substring(backendFileuploadIndex + '/Backend'.length);
        } else {
          const uploadsIndex = filePath.indexOf('/uploads/');
          if (uploadsIndex !== -1) {
            relativePath = filePath.substring(uploadsIndex);
          } else {
            const backendUploadsIndex = filePath.indexOf('/Backend/uploads/');
            if (backendUploadsIndex !== -1) {
              relativePath = filePath.substring(backendUploadsIndex + '/Backend'.length);
            }
          }
        }
      }
      return relativePath;
    }
    
    // Handle /uploads/patient_files/ paths (legacy format) and convert to /fileupload/
    // Format: /uploads/patient_files/{role}/{patient_id}/{filename}
    // Should be: /fileupload/{role}/Patient_Details/{patient_id}/{filename}
    if (filePath.startsWith('/uploads/patient_files/')) {
      const pathParts = filePath.replace('/uploads/patient_files/', '').split('/');
      if (pathParts.length >= 2) {
        const role = pathParts[0].toLowerCase().replace(/\s+/g, '_');
        const patientId = pathParts[1];
        const filename = pathParts.slice(2).join('/');
        // Convert to correct format: /fileupload/{role}/Patient_Details/{patient_id}/{filename}
        return `/fileupload/${role}/Patient_Details/${patientId}${filename ? '/' + filename : ''}`;
      }
    }
    
    // If it starts with /fileupload, use it directly
    if (filePath.startsWith('/fileupload/')) {
      return filePath;
    }
    
    // If it starts with /uploads/ (other formats), try to convert
    if (filePath.startsWith('/uploads/')) {
      // Try to extract the path after /uploads/ and convert to /fileupload/
      const pathAfterUploads = filePath.replace('/uploads/', '');
      // If it looks like a patient file path, convert it
      if (pathAfterUploads.includes('patient_files') || pathAfterUploads.match(/^[^\/]+\/\d+\//)) {
        const parts = pathAfterUploads.split('/');
        if (parts.length >= 2) {
          const role = parts[0].toLowerCase().replace(/\s+/g, '_');
          const patientId = parts[1];
          const filename = parts.slice(2).join('/');
          return `/fileupload/${role}/Patient_Details/${patientId}${filename ? '/' + filename : ''}`;
        }
      }
      // Otherwise, just convert /uploads/ to /fileupload/
      return filePath.replace('/uploads/', '/fileupload/');
    }
    
    // If it's a relative path starting with fileupload or uploads
    if (filePath.startsWith('fileupload/')) {
      return `/${filePath}`;
    }
    if (filePath.startsWith('uploads/')) {
      // Convert uploads/ to fileupload/
      return `/${filePath.replace('uploads/', 'fileupload/')}`;
    }
    
    // Otherwise prepend /fileupload
    if (filePath.startsWith('/')) {
      return `/fileupload${filePath}`;
    }
    
    return `/fileupload/${filePath}`;
  };

  // Get authenticated file URL (creates blob URL if needed)
  const getFileUrl = async (filePath) => {
    if (!filePath) {
      return '';
    }
    
    // If we already have a blob URL cached, return it
    if (blobUrls.has(filePath)) {
      return blobUrls.get(filePath);
    }
    
    const urlPath = getFileUrlPath(filePath);
    if (!urlPath) {
      console.warn('[FilePreview] Could not determine URL path for:', filePath);
      return '';
    }
    
    const fullUrl = `${baseUrlWithoutApi}${urlPath}`;
    
    // If no token, return the URL (will fail with 401, but that's expected)
    if (!token) {
      console.warn('[FilePreview] No token available, using direct URL');
      return fullUrl;
    }
    
    // Fetch file with authentication and create blob URL
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error('[FilePreview] Failed to fetch file:', {
          status: response.status,
          statusText: response.statusText,
          url: fullUrl,
          urlPath: urlPath,
          originalPath: filePath
        });
        // Don't fallback to direct URL if it's a 404 or 403 - file doesn't exist or no permission
        if (response.status === 404 || response.status === 403) {
          return null; // Return null to trigger error handling
        }
        return fullUrl; // Fallback to direct URL for other errors
      }
      
      const blob = await response.blob();
      
      // Check if blob is valid
      if (blob.size === 0) {
        console.error('[FilePreview] Received empty blob for:', fullUrl);
        return null;
      }
      
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache the blob URL
      setBlobUrls(prev => new Map(prev).set(filePath, blobUrl));
      
      return blobUrl;
    } catch (error) {
      console.error('[FilePreview] Error fetching file:', {
        error: error.message,
        url: fullUrl,
        urlPath: urlPath,
        originalPath: filePath
      });
      return fullUrl; // Fallback to direct URL
    }
  };

  // Clear blob cache when files change (to reload newly uploaded files)
  useEffect(() => {
    // Clear all cached blob URLs when files array changes
    // This ensures newly uploaded files are fetched fresh
    blobUrls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setBlobUrls(new Map());
  }, [files]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [blobUrls]);

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
  const openPreview = async (filePath) => {
    const fileType = getFileType(filePath);
    const url = await getFileUrl(filePath);
    setPreviewFile(url);
    setPreviewType(fileType);
  };

  // Close preview modal
  const closePreview = () => {
    setPreviewFile(null);
    setPreviewType(null);
  };

  // Download file
  const downloadFile = async (filePath, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const urlPath = getFileUrlPath(filePath);
    if (!urlPath) return;
    
    const fullUrl = `${baseUrlWithoutApi}${urlPath}`;
    const fileName = filePath.split('/').pop();
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error('[FilePreview] Failed to download file:', response.status);
        return;
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('[FilePreview] Error downloading file:', error);
    }
  };

  // Extract file identifier from file path/object
  // Backend will handle all path resolution, we just need to pass the file identifier
  const getFileIdentifier = (filePath) => {
    if (!filePath) return '';
    
    // Handle if filePath is an object with path/url property
    if (typeof filePath === 'object' && filePath !== null) {
      return filePath.path || filePath.url || filePath.filePath || String(filePath);
    }
    
    // Return as-is - backend will handle path resolution
    return String(filePath);
  };

  // Delete file - backend handles all path resolution
  // Frontend just passes patient_id and file identifier
  // Using direct fetch to ensure correct endpoint is called
  const handleDelete = async (filePath, e) => {
    e.stopPropagation();
    
    // if (!window.confirm('Are you sure you want to delete this file?')) {
    //   return;
    // }

    // Validate patient_id is provided
    if (!patient_id) {
      console.error('[FilePreview] Patient ID is missing');
      toast.error('Patient ID is required to delete file');
      if (onDelete) {
        onDelete(filePath);
      }
      return;
    }

    // Get file identifier - backend will handle path resolution
    const fileIdentifier = getFileIdentifier(filePath);
    if (!fileIdentifier) {
      console.error('[FilePreview] File identifier is missing');
      toast.error('File identifier is required');
      return;
    }

    try {
      setIsDeletingFile(true);
      
      const patientIdStr = String(patient_id);
      
      // Validate patient_id is not undefined/null
      if (!patientIdStr || patientIdStr === 'undefined' || patientIdStr === 'null') {
        console.error('[FilePreview] Invalid patient ID:', patient_id);
        toast.error('Invalid patient ID');
        setIsDeletingFile(false);
        return;
      }
      
      console.log('[FilePreview] Deleting file - backend will handle path resolution:', {
        patient_id: patientIdStr,
        file_identifier: fileIdentifier
      });

      // Use direct fetch to ensure correct endpoint: /api/patient-files/delete/{patient_id}/{file_path}
      // Backend handles all path resolution using req.user.role and module
      const baseUrl = import.meta.env.VITE_API_URL || 'http://122.186.76.102:8002/api';
      const apiToken = JSON.parse(localStorage.getItem('user'))?.token || localStorage.getItem('token');
      
      // Construct the correct URL
      const encodedFilePath = encodeURIComponent(fileIdentifier);
      const deleteUrl = `${baseUrl}/patient-files/delete/${patientIdStr}/${encodedFilePath}`;
      
    
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw { data: result, status: response.status };
      }

 
      
      // Show success message
      toast.success(result?.message || 'File deleted successfully');

      // Refetch files if callback provided
      if (refetchFiles) {
        await refetchFiles();
      }

      // Call optional callback if provided
      if (onFileDeleted) {
        onFileDeleted(filePath, fileIdentifier);
      }

      // Also call onDelete callback if provided (for backward compatibility)
      if (onDelete) {
        onDelete(filePath);
      }

      // Remove blob URL from cache if it exists
      if (blobUrls.has(filePath)) {
        const blobUrl = blobUrls.get(filePath);
        URL.revokeObjectURL(blobUrl);
        setBlobUrls(prev => {
          const newMap = new Map(prev);
          newMap.delete(filePath);
          return newMap;
        });
      }
    } catch (error) {
      console.error('[FilePreview] Error deleting file:', error);
      toast.error(
        error?.data?.message || 
        error?.data?.error || 
        error?.message ||
        'Failed to delete file. Please try again.'
      );
    } finally {
      setIsDeletingFile(false);
    }
  };


  // Empty state
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
          .filter((filePath) => {
            // Filter out temporary files (files with "temp" in the path)
            const actualPath = typeof filePath === 'string' ? filePath : (filePath?.path || filePath?.url || filePath);
            if (!actualPath) return false;
            // Skip files with "temp" in the path (temporary uploads that haven't been assigned to a patient yet)
            if (actualPath.includes('/temp/') || actualPath.includes('\\temp\\') || 
                actualPath.match(/\/temp\/|\/temp$|\\temp\\|\\temp$/i)) {
              return false;
            }
            return true;
          })
          .map((filePath, index) => {
            // Handle both string paths and object with path property
            const actualPath = typeof filePath === 'string' ? filePath : (filePath?.path || filePath?.url || filePath);
            if (!actualPath) {
              console.warn('[FilePreview] Invalid file path at index', index, ':', filePath);
              return null;
            }
            
            const fileType = getFileType(actualPath);
            const fileName = actualPath.split('/').pop();
            const urlPath = getFileUrlPath(actualPath);
            const fileUrl = urlPath ? `${baseUrlWithoutApi}${urlPath}` : '';
            
            return {
              actualPath,
              fileType,
              fileName,
              fileUrl,
              urlPath,
              index
            };
          })
          .filter(Boolean)
          .map(({ actualPath, fileType, fileName, fileUrl, urlPath, index }) => {
            // Use cached blob URL if available, otherwise use direct URL
            const cachedBlobUrl = blobUrls.get(actualPath);
            const displayUrl = cachedBlobUrl || fileUrl;
            
            return (
            <div
              key={`${actualPath}-${index}`}
              className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => openPreview(actualPath)}
            >
              {/* Image Preview */}
              {fileType === 'image' ? (
                <div className="aspect-square relative bg-gray-100">
                  <AuthenticatedImage
                    src={displayUrl}
                    urlPath={urlPath}
                    baseUrl={baseUrlWithoutApi}
                    token={token}
                    alt={fileName || 'Image'}
                    className="w-full h-full object-cover"
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
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <FiImage className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

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
                {canDelete && patient_id && (
                  <button
                    onClick={(e) => handleDelete(actualPath, e)}
                    disabled={isDeletingFile}
                    className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isDeletingFile ? "Deleting..." : "Delete"}
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
                {canDelete && !patient_id && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // if (window.confirm('Are you sure you want to delete this file?')) {
                        onDelete(actualPath);
                        
                      // }
                    }}
                    className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            );
          })}
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

