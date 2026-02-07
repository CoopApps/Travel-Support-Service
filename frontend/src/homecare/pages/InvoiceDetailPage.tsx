import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { invoiceApi, Invoice, InvoiceItem, clientApi, Client } from '../services/homecareApi';

function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({});
  const [showAddItem, setShowAddItem] = useState(false);

  const isNewInvoice = invoiceId === 'new';

  useEffect(() => {
    if (isNewInvoice) {
      loadClients();
      setIsEditing(true);
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      setFormData({
        invoice_date: today,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'draft',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        amount_paid: 0,
        balance_due: 0,
      });
      setLoading(false);
    } else if (tenantId && invoiceId) {
      loadInvoice();
    }
  }, [tenantId, invoiceId]);

  const loadClients = async () => {
    if (!tenantId) return;
    try {
      const response = await clientApi.list(tenantId);
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadInvoice = async () => {
    if (!tenantId || !invoiceId) return;

    try {
      setLoading(true);
      setError(null);
      const [invoiceRes, clientsRes] = await Promise.all([
        invoiceApi.getById(tenantId, parseInt(invoiceId)),
        clientApi.list(tenantId),
      ]);
      setInvoice(invoiceRes.data);
      setFormData(invoiceRes.data);
      setClients(clientsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load invoice');
      console.error('Failed to load invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    try {
      setError(null);
      if (isNewInvoice) {
        const response = await invoiceApi.create(tenantId, formData);
        navigate(`/homecare/invoices/${response.data.invoice_id}`);
      } else {
        await loadInvoice();
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save invoice');
      console.error('Failed to save invoice:', err);
    }
  };

  const handleAddItem = async () => {
    if (!tenantId || !invoiceId || isNewInvoice) return;

    try {
      setError(null);
      await invoiceApi.addItem(tenantId, parseInt(invoiceId), newItem);
      setNewItem({});
      setShowAddItem(false);
      await loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add item');
      console.error('Failed to add item:', err);
    }
  };

  const handleSend = async () => {
    if (!tenantId || !invoiceId || !window.confirm('Send this invoice to the client?')) return;

    try {
      setError(null);
      await invoiceApi.send(tenantId, parseInt(invoiceId));
      await loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invoice');
      console.error('Failed to send invoice:', err);
    }
  };

  const handleRecordPayment = async () => {
    if (!tenantId || !invoiceId) return;

    const amount = prompt('Enter payment amount:');
    if (!amount) return;

    const paymentDate = prompt('Enter payment date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!paymentDate) return;

    const paymentMethod = prompt('Enter payment method (e.g., Bank Transfer, Cash, Card):');
    if (!paymentMethod) return;

    try {
      setError(null);
      await invoiceApi.recordPayment(tenantId, parseInt(invoiceId), {
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
      });
      await loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record payment');
      console.error('Failed to record payment:', err);
    }
  };

  const handleCancel = async () => {
    if (!tenantId || !invoiceId || !window.confirm('Cancel this invoice?')) return;

    try {
      setError(null);
      await invoiceApi.cancel(tenantId, parseInt(invoiceId));
      await loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel invoice');
      console.error('Failed to cancel invoice:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
        Loading invoice...
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: { background: '#f3f4f6', color: '#374151' },
      sent: { background: '#dbeafe', color: '#1e40af' },
      paid: { background: '#d1fae5', color: '#065f46' },
      overdue: { background: '#fee2e2', color: '#991b1b' },
      cancelled: { background: '#f3f4f6', color: '#6b7280' },
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/homecare/invoices')}>
            � Back
          </button>
          <h1 style={{ margin: 0, color: 'var(--gray-900)', fontSize: '24px', fontWeight: 600 }}>
            {isNewInvoice ? 'New Invoice' : `Invoice ${invoice?.invoice_number}`}
          </h1>
          {!isNewInvoice && invoice && (
            <span
              style={{
                ...getStatusBadge(invoice.status),
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {invoice.status}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isNewInvoice && invoice && (
            <>
              {invoice.status === 'draft' && (
                <button className="btn btn-primary btn-sm" onClick={handleSend}>
                  Send Invoice
                </button>
              )}
              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <button className="btn btn-primary btn-sm" onClick={handleRecordPayment}>
                  Record Payment
                </button>
              )}
              {invoice.status === 'draft' && (
                <button className="btn btn-danger btn-sm" onClick={handleCancel}>
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Invoice Details */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Invoice Information
          </h2>
          {isEditing && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setIsEditing(false);
                if (!isNewInvoice) setFormData(invoice || {});
              }}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                Save
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {/* Client */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Client *
            </label>
            {isEditing ? (
              <select
                className="form-control"
                value={formData.client_id || ''}
                onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
                required
              >
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </select>
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {invoice?.client ? `${invoice.client.first_name} ${invoice.client.last_name}` : 'Unknown'}
              </p>
            )}
          </div>

          {/* Invoice Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Invoice Date *
            </label>
            {isEditing ? (
              <input
                type="date"
                className="form-control"
                value={formData.invoice_date || ''}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                required
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {invoice?.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Due Date *
            </label>
            {isEditing ? (
              <input
                type="date"
                className="form-control"
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>
                {invoice?.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
              </p>
            )}
          </div>

          {/* Payment Terms */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
              Payment Terms
            </label>
            {isEditing ? (
              <input
                type="text"
                className="form-control"
                value={formData.payment_terms || ''}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="e.g., Net 30"
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--gray-900)' }}>{invoice?.payment_terms || '-'}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
            Notes
          </label>
          {isEditing ? (
            <textarea
              className="form-control"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
            />
          ) : (
            <p style={{ margin: 0, color: 'var(--gray-900)' }}>{invoice?.notes || '-'}</p>
          )}
        </div>
      </div>

      {/* Invoice Items */}
      {!isNewInvoice && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
              Line Items
            </h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddItem(!showAddItem)}>
              + Add Item
            </button>
          </div>

          {showAddItem && (
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--gray-50)' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '14px', fontWeight: 600 }}>New Item</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={newItem.quantity || ''}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                    Unit Price
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={newItem.unit_price || ''}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                    Total
                  </label>
                  <p style={{ margin: 0, padding: '0.5rem', color: 'var(--gray-900)', fontWeight: 500 }}>
                    {formatCurrency((newItem.quantity || 0) * (newItem.unit_price || 0))}
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddItem}>
                  Add
                </button>
              </div>
            </div>
          )}

          {invoice?.invoice_items && invoice.invoice_items.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Description
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Quantity
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Unit Price
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items.map((item, index) => (
                    <tr
                      key={item.item_id}
                      style={{
                        borderBottom: index < invoice.invoice_items!.length - 1 ? '1px solid var(--gray-200)' : 'none',
                      }}
                    >
                      <td style={{ padding: '0.75rem', color: 'var(--gray-900)' }}>{item.description}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--gray-600)' }}>{item.quantity}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--gray-600)' }}>
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 500, color: 'var(--gray-900)' }}>
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>No items added yet.</p>
          )}
        </div>
      )}

      {/* Totals */}
      {!isNewInvoice && invoice && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)' }}>
            Summary
          </h2>
          <div style={{ maxWidth: '400px', marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ color: 'var(--gray-600)' }}>Subtotal:</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ color: 'var(--gray-600)' }}>Tax:</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '2px solid var(--gray-300)' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>Total:</span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ color: 'var(--gray-600)' }}>Amount Paid:</span>
              <span style={{ fontWeight: 500, color: '#10b981' }}>{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>Balance Due:</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: invoice.balance_due > 0 ? '#dc2626' : '#10b981' }}>
                {formatCurrency(invoice.balance_due)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceDetailPage;
