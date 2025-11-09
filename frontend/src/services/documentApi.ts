import api from './api';

export interface Document {
  document_id: number;
  tenant_id: number;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_hash?: string;
  module: string;
  entity_type: string;
  entity_id: number;
  document_category: string;
  title: string;
  description?: string;
  issue_date?: string;
  expiry_date?: string;
  is_active: boolean;
  is_confidential: boolean;
  access_level: string;
  tags?: string[];
  notes?: string;
  uploaded_by: number;
  uploaded_at: string;
  updated_by?: number;
  updated_at?: string;
  deleted_by?: number;
  deleted_at?: string;
  uploaded_by_name?: string;
  expiry_status?: 'no_expiry' | 'valid' | 'warning' | 'critical' | 'expired';
  days_until_expiry?: number;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface DocumentStats {
  overall: {
    total_documents: string;
    expired_count: string;
    expiring_soon_count: string;
    total_storage_bytes: string;
    total_storage: string;
  };
  byModule: Array<{
    module: string;
    document_count: string;
    storage_bytes: string;
  }>;
  byCategory: Array<{
    document_category: string;
    document_count: string;
  }>;
  storage: {
    storage_quota_bytes?: string;
    storage_used_bytes?: string;
    max_file_size?: string;
  };
}

export interface EntityDocumentsResponse {
  entity: {
    id: number;
    type: string;
    name: string;
    [key: string]: any;
  };
  documentsByModule: Record<string, Document[]>;
  stats: {
    total: number;
    expiring: number;
    expired: number;
  };
}

export const documentApi = {
  /**
   * Upload a document
   */
  uploadDocument: async (
    tenantId: number,
    module: string,
    entityId: number,
    formData: FormData
  ): Promise<{ message: string; document: Document }> => {
    const response = await api.post(
      `/tenants/${tenantId}/${module}/${entityId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  /**
   * Get documents for a specific entity
   */
  getEntityDocuments: async (
    tenantId: number,
    module: string,
    entityId: number,
    params?: {
      category?: string;
      active?: boolean;
    }
  ): Promise<DocumentsResponse> => {
    const response = await api.get(
      `/tenants/${tenantId}/${module}/${entityId}/documents`,
      { params }
    );
    return response.data;
  },

  /**
   * Get all documents (centralized view)
   */
  getAllDocuments: async (
    tenantId: number,
    params?: {
      page?: number;
      limit?: number;
      module?: string;
      category?: string;
      search?: string;
      expiryStatus?: 'expired' | 'expiring' | 'valid';
      expiryDays?: number;
      uploadedBy?: number;
      fromDate?: string;
      toDate?: string;
      fileType?: string;
      sortBy?: 'uploaded_at' | 'original_filename' | 'file_size' | 'expiry_date';
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<DocumentsResponse> => {
    const response = await api.get(`/tenants/${tenantId}/documents`, { params });
    return response.data;
  },

  /**
   * Get document statistics
   */
  getDocumentStats: async (tenantId: number): Promise<DocumentStats> => {
    const response = await api.get(`/tenants/${tenantId}/documents/stats`);
    return response.data;
  },

  /**
   * Get entity drill-down - all documents for a specific entity across modules
   */
  getEntityAllDocuments: async (
    tenantId: number,
    module: string,
    entityId: number
  ): Promise<EntityDocumentsResponse> => {
    const response = await api.get(
      `/tenants/${tenantId}/documents/entity/${module}/${entityId}`
    );
    return response.data;
  },

  /**
   * Download a document
   */
  downloadDocument: async (
    tenantId: number,
    documentId: number
  ): Promise<Blob> => {
    const response = await api.get(
      `/tenants/${tenantId}/documents/${documentId}/download`,
      {
        responseType: 'blob'
      }
    );
    return response.data;
  },

  /**
   * Update document metadata
   */
  updateDocument: async (
    tenantId: number,
    documentId: number,
    data: Partial<{
      title: string;
      description: string;
      documentCategory: string;
      issueDate: string;
      expiryDate: string;
      isConfidential: boolean;
      accessLevel: string;
      tags: string[];
      notes: string;
    }>
  ): Promise<{ message: string; document: Document }> => {
    const response = await api.patch(
      `/tenants/${tenantId}/documents/${documentId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete/Archive a document
   */
  deleteDocument: async (
    tenantId: number,
    documentId: number,
    permanent = false
  ): Promise<{ message: string }> => {
    const response = await api.delete(
      `/tenants/${tenantId}/documents/${documentId}`,
      {
        params: { permanent }
      }
    );
    return response.data;
  },

  /**
   * Get expiring documents
   */
  getExpiringDocuments: async (
    tenantId: number,
    days = 30
  ): Promise<DocumentsResponse> => {
    const response = await api.get(`/tenants/${tenantId}/documents/expiring`, {
      params: { days }
    });
    return response.data;
  },

  /**
   * Helper function to trigger download in browser
   */
  triggerDownload: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
