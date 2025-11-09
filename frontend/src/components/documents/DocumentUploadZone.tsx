import React, { useState, useCallback } from 'react';

interface DocumentUploadZoneProps {
  tenantId: number;
  module: string;
  entityId: number;
  category: string;
  accept?: string;
  maxSize?: number;
  onUploadComplete?: () => void;
  onUploadError?: (error: string) => void;
}

export function DocumentUploadZone({
  tenantId,
  module,
  entityId,
  category,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx',
  maxSize = 10 * 1024 * 1024, // 10MB default
  onUploadComplete,
  onUploadError
}: DocumentUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(0)}MB)`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());

    if (!allowedExtensions.includes(fileExtension)) {
      return `File type ${fileExtension} is not allowed. Allowed types: ${accept}`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onUploadError?.(validationError);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentCategory', category);
      formData.append('title', file.name);

      const token = localStorage.getItem('token');

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          onUploadComplete?.();
          setUploading(false);
          setUploadProgress(100);
        } else {
          const error = JSON.parse(xhr.responseText);
          onUploadError?.(error.error || 'Upload failed');
          setUploading(false);
        }
      });

      // Handle error
      xhr.addEventListener('error', () => {
        onUploadError?.('Network error during upload');
        setUploading(false);
      });

      // Send request
      xhr.open('POST', `/api/tenants/${tenantId}/${module}/${entityId}/documents`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);

    } catch (error: any) {
      onUploadError?.(error.message || 'Upload failed');
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      uploadFile(file);
    }
  }, [tenantId, module, entityId, category]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadFile(file);
    }
  }, [tenantId, module, entityId, category]);

  return (
    <div style={{ margin: '20px 0' }}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#2563eb' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#eff6ff' : '#f9fafb',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: uploading ? 0.6 : 1
        }}
        onClick={() => {
          if (!uploading) {
            document.getElementById('file-input')?.click();
          }
        }}
      >
        {uploading ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📤</div>
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px'
            }}>
              Uploading... {uploadProgress}%
            </div>
            <div style={{
              width: '100%',
              maxWidth: '300px',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              margin: '0 auto',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#2563eb',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px'
            }}>
              {dragActive ? 'Drop file here' : 'Drag and drop or click to upload'}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Accepted formats: {accept}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Maximum file size: {(maxSize / 1024 / 1024).toFixed(0)}MB
            </div>
          </>
        )}

        <input
          id="file-input"
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
