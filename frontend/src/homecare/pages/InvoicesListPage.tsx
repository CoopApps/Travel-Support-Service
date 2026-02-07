import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { invoiceApi, Invoice, clientApi, Client } from '../services/homecareApi';

function InvoicesListPage() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [tenantId, statusFilter, clientFilter]);

  const loadData = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter !== 'all') params.client_id = parseInt(clientFilter);

      const [invoicesRes, clientsRes] = await Promise.all([
        invoiceApi.list(tenantId, params),
        clientApi.list(tenantId),
      ]);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load invoices');
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
      sent: { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
      paid: { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      overdue: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
      cancelled: { background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' },
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
          Invoices
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/homecare/invoices/new')}
        >
          + Create Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Client Filter */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Client
            </label>
            <select
              className="form-control"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.client_id} value={client.client_id.toString()}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Status
            </label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>No invoices found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Invoice #
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Client
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Date
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Due Date
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Amount
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Balance Due
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => {
                  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled' && new Date(invoice.due_date) < new Date();

                  return (
                    <tr
                      key={invoice.invoice_id}
                      style={{
                        borderBottom: index < invoices.length - 1 ? '1px solid var(--gray-200)' : 'none',
                        background: isOverdue && invoice.status !== 'overdue' ? '#fef2f2' : 'white',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <Link
                          to={`/homecare/invoices/${invoice.invoice_id}`}
                          style={{ color: '#0891b2', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {invoice.client ? (
                          <Link
                            to={`/homecare/clients/${invoice.client_id}`}
                            style={{ color: '#0891b2', textDecoration: 'none' }}
                          >
                            {invoice.client.first_name} {invoice.client.last_name}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--gray-500)' }}>Unknown</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '13px', color: 'var(--gray-600)' }}>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '13px' }}>
                        <span style={{ color: isOverdue ? '#dc2626' : 'var(--gray-600)' }}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '13px', fontWeight: 500 }}>
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '13px' }}>
                        <span style={{
                          fontWeight: 500,
                          color: invoice.balance_due > 0 ? '#dc2626' : '#10b981'
                        }}>
                          {formatCurrency(invoice.balance_due)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            ...getStatusBadge(isOverdue && invoice.status !== 'overdue' ? 'overdue' : invoice.status),
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                          }}
                        >
                          {isOverdue && invoice.status !== 'overdue' && invoice.status !== 'paid' && invoice.status !== 'cancelled' ? 'Overdue' : invoice.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/homecare/invoices/${invoice.invoice_id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {!loading && !error && invoices.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--gray-600)' }}>Total Invoices</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--gray-900)' }}>
                  {invoices.length}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--gray-600)' }}>Total Amount</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--gray-900)' }}>
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--gray-600)' }}>Amount Paid</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#10b981' }}>
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.amount_paid, 0))}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--gray-600)' }}>Outstanding</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#dc2626' }}>
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.balance_due, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoicesListPage;
