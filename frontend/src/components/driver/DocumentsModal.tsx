import { useState } from 'react';

interface DocumentsModalProps {
  tenantId: number;
  onClose: () => void;
}

/**
 * Documents Access Modal
 *
 * View company policies, procedures, and route maps
 * Quick access to important documentation
 */
function DocumentsModal({ tenantId, onClose }: DocumentsModalProps) {
  // Mock documents for now - in real implementation, fetch from API
  const [documents] = useState([
    {
      id: 1,
      title: 'Driver Handbook',
      description: 'Complete guide for drivers including policies and procedures',
      category: 'Policy',
      fileType: 'PDF',
      fileSize: '2.4 MB',
      lastUpdated: '2024-10-15',
      url: '#'
    },
    {
      id: 2,
      title: 'Vehicle Safety Checklist',
      description: 'Daily pre-trip inspection checklist',
      category: 'Safety',
      fileType: 'PDF',
      fileSize: '245 KB',
      lastUpdated: '2024-10-20',
      url: '#'
    },
    {
      id: 3,
      title: 'Route Maps - North District',
      description: 'Common routes and customer locations',
      category: 'Routes',
      fileType: 'PDF',
      fileSize: '1.8 MB',
      lastUpdated: '2024-10-10',
      url: '#'
    },
    {
      id: 4,
      title: 'Emergency Procedures',
      description: 'Step-by-step guide for emergency situations',
      category: 'Safety',
      fileType: 'PDF',
      fileSize: '890 KB',
      lastUpdated: '2024-09-25',
      url: '#'
    },
    {
      id: 5,
      title: 'Customer Service Guidelines',
      description: 'Best practices for customer interactions',
      category: 'Policy',
      fileType: 'PDF',
      fileSize: '550 KB',
      lastUpdated: '2024-09-30',
      url: '#'
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Policy', 'Safety', 'Routes', 'Training'];

  const filteredDocuments = selectedCategory === 'All'
    ? documents
    : documents.filter(doc => doc.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Policy': return '#3b82f6';
      case 'Safety': return '#dc3545';
      case 'Routes': return '#10b981';
      case 'Training': return '#f59e0b';
      default: return '#6c757d';
    }
  };

  const getFileIcon = (fileType: string) => {
    // File icon SVG path
    return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8';
  };

  const handleDocumentClick = (doc: any) => {
    // In real implementation, this would open the PDF or download it
    alert(`Opening: ${doc.title}\n\nIn a production environment, this would open the PDF document or prompt for download.`);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Document Library
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--gray-600)' }}>
            Company policies, procedures, and route maps
          </p>
        </div>

        {/* Category Filter */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '0.375rem 0.75rem',
                background: selectedCategory === category ? 'var(--primary)' : 'white',
                color: selectedCategory === category ? 'white' : 'var(--gray-700)',
                border: selectedCategory === category ? 'none' : '1px solid var(--gray-300)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.background = 'var(--gray-100)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Documents List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem 1.5rem'
        }}>
          {filteredDocuments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-600)' }}>
              No documents found in this category
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc)}
                  style={{
                    background: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--gray-200)';
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* File Icon */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: `${getCategoryColor(doc.category)}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" style={{
                        width: '24px',
                        height: '24px',
                        stroke: getCategoryColor(doc.category),
                        fill: 'none',
                        strokeWidth: 2
                      }}>
                        <path d={getFileIcon(doc.fileType)} />
                      </svg>
                    </div>

                    {/* Document Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)' }}>
                          {doc.title}
                        </div>
                        <div style={{
                          display: 'inline-flex',
                          padding: '2px 8px',
                          background: `${getCategoryColor(doc.category)}20`,
                          color: getCategoryColor(doc.category),
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          marginLeft: '0.5rem'
                        }}>
                          {doc.category}
                        </div>
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                        {doc.description}
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', fontSize: '12px', color: 'var(--gray-500)' }}>
                        <span>{doc.fileType} • {doc.fileSize}</span>
                        <span>Updated: {new Date(doc.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Download Icon */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--gray-100)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      alignSelf: 'center'
                    }}>
                      <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'var(--gray-600)', fill: 'none', strokeWidth: 2 }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentsModal;
