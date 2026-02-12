import { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { useAuthStore } from '../../store/authStore';
import './DemoDataManager.css';

interface DemoDataStatus {
  isImported: boolean;
  customerCount: number;
  driverCount: number;
}

/**
 * Demo Data Manager Component
 *
 * Allows importing/removing 150 demo customers and 30 demo drivers for demonstration purposes.
 * Demo data is stored in the same tables as real data but marked with special email domains
 * (@example.com for customers, @demotransport.com for drivers) for easy identification and removal.
 */
export const DemoDataManager: React.FC = () => {
  const { tenant } = useTenant();
  const token = useAuthStore((state) => state.token);
  const [status, setStatus] = useState<DemoDataStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    console.log('DemoDataManager mounted', { tenant: tenant?.tenant_id, hasToken: !!token });
    if (tenant?.tenant_id && token) {
      fetchStatus();
    }
  }, [tenant?.tenant_id, token]);

  const fetchStatus = async () => {
    if (!tenant?.tenant_id || !token) return;

    try {
      setLoading(true);
      const response = await apiClient.get(
        `/tenants/${tenant.tenant_id}/demo-data/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatus(response.data);
    } catch (error: any) {
      console.error('Error fetching demo data status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    console.log('handleImport called', { hasTenant: !!tenant?.tenant_id, hasToken: !!token });

    if (!tenant?.tenant_id || !token) {
      console.warn('Missing tenant or token', { tenant: tenant?.tenant_id, hasToken: !!token });
      return;
    }

    if (!confirm('Import 150 demo customers and 30 demo drivers?\n\nThis will add demonstration data to your system. You can remove it anytime using the "Remove Demo Data" button.')) {
      return;
    }

    try {
      setActionInProgress(true);
      setMessage(null);

      const response = await apiClient.post(
        `/tenants/${tenant.tenant_id}/demo-data/import`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({
        type: 'success',
        text: `Successfully imported ${response.data.customersImported} customers and ${response.data.driversImported} drivers!`
      });

      await fetchStatus();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to import demo data';
      setMessage({
        type: 'error',
        text: errorMsg
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRemove = async () => {
    if (!tenant?.tenant_id || !token) return;

    if (!confirm('Remove all demo data?\n\nThis will permanently delete all demo customers and drivers. This action cannot be undone.')) {
      return;
    }

    try {
      setActionInProgress(true);
      setMessage(null);

      const response = await apiClient.delete(
        `/tenants/${tenant.tenant_id}/demo-data/remove`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({
        type: 'success',
        text: `Successfully removed ${response.data.customersRemoved} customers and ${response.data.driversRemoved} drivers!`
      });

      await fetchStatus();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to remove demo data';
      setMessage({
        type: 'error',
        text: errorMsg
      });
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="demo-data-manager loading">
        <div className="spinner"></div>
        <p>Loading demo data status...</p>
      </div>
    );
  }

  return (
    <div className="demo-data-manager">
      <div className="demo-data-header">
        <div className="demo-data-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="demo-data-title">
          <h3>Demo Data Manager</h3>
          <p>Import or remove demonstration customers and drivers</p>
        </div>
      </div>

      {message && (
        <div className={`demo-data-message ${message.type}`}>
          {message.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="demo-data-status">
        <div className="status-item">
          <div className="status-label">Status</div>
          <div className={`status-value ${status?.isImported ? 'imported' : 'not-imported'}`}>
            {status?.isImported ? 'Imported' : 'Not Imported'}
          </div>
        </div>
        {status?.isImported && (
          <>
            <div className="status-item">
              <div className="status-label">Demo Customers</div>
              <div className="status-value">{status.customerCount}</div>
            </div>
            <div className="status-item">
              <div className="status-label">Demo Drivers</div>
              <div className="status-value">{status.driverCount}</div>
            </div>
          </>
        )}
      </div>

      <div className="demo-data-actions">
        {!status?.isImported ? (
          <button
            onClick={handleImport}
            disabled={actionInProgress}
            className="btn btn-primary"
          >
            {actionInProgress ? (
              <>
                <div className="spinner-small"></div>
                Importing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Import Demo Data
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleRemove}
            disabled={actionInProgress}
            className="btn btn-danger"
          >
            {actionInProgress ? (
              <>
                <div className="spinner-small"></div>
                Removing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Remove Demo Data
              </>
            )}
          </button>
        )}
      </div>

      <div className="demo-data-info">
        <div className="info-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          About Demo Data
        </div>
        <ul>
          <li><strong>150 demo customers</strong> with varied mobility needs and UK addresses</li>
          <li><strong>30 demo drivers</strong> with valid licenses and vehicle assignments</li>
          <li>All demo records use special email domains for easy identification</li>
          <li>Demo data can be safely imported and removed multiple times</li>
          <li>Perfect for testing, training, and demonstrations</li>
        </ul>
      </div>
    </div>
  );
};

export default DemoDataManager;
