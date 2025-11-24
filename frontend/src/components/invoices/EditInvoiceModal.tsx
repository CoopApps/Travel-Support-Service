import React, { useState, useEffect } from 'react';
import { invoiceApi } from '../../services/api';
import type { InvoiceDetail, InvoiceLineItem } from '../../types/invoice.types';
import { XIcon, EditIcon, PlusIcon, DownloadIcon } from './InvoiceIcons';
import './EditInvoiceModal.css';

interface Props {
  invoiceId: number;
  tenantId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineItemForm {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

export const EditInvoiceModal: React.FC<Props> = ({
  invoiceId,
  tenantId,
  onClose,
  onSuccess
}) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [editingLineItem, setEditingLineItem] = useState<LineItemForm | null>(null);
  const [showAddLineItem, setShowAddLineItem] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId, tenantId]);

  const loadInvoice = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await invoiceApi.getInvoice(tenantId, invoiceId);
      setInvoice(data);
      setEmail(data.customerName); // Assuming email is stored in a field
      setDescription(data.notes || '');
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to load invoice'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!invoice) return;

    setSaving(true);
    setError(null);

    try {
      await invoiceApi.updateInvoice(tenantId, invoiceId, {
        notes: description
      });
      await loadInvoice(); // Reload to get updated data
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to update invoice'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddLineItem = async () => {
    if (!editingLineItem) return;

    setSaving(true);
    setError(null);

    try {
      await invoiceApi.addLineItem(tenantId, invoiceId, {
        description: editingLineItem.description,
        quantity: editingLineItem.quantity,
        unit_price: editingLineItem.unitPrice
      } as any);
      setShowAddLineItem(false);
      setEditingLineItem(null);
      await loadInvoice();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to add line item'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLineItem = async (lineItemId: number) => {
    if (!editingLineItem) return;

    setSaving(true);
    setError(null);

    try {
      await invoiceApi.updateLineItem(tenantId, invoiceId, lineItemId, {
        description: editingLineItem.description,
        quantity: editingLineItem.quantity,
        unit_price: editingLineItem.unitPrice,
        total_price: editingLineItem.quantity * editingLineItem.unitPrice
      });
      setEditingLineItem(null);
      await loadInvoice();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to update line item'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLineItem = async (lineItemId: number) => {
    if (!confirm('Are you sure you want to delete this line item?')) return;

    setSaving(true);
    setError(null);

    try {
      await invoiceApi.deleteLineItem(tenantId, invoiceId, lineItemId);
      await loadInvoice();
    } catch (err: any) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : (err.response?.data?.error?.message || err.message || 'Failed to delete line item'));
    } finally {
      setSaving(false);
    }
  };

  const startEditLineItem = (item: InvoiceLineItem) => {
    setEditingLineItem({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    });
    setShowAddLineItem(false);
  };

  const startAddLineItem = () => {
    setEditingLineItem({
      description: '',
      quantity: 1,
      unitPrice: 0
    });
    setShowAddLineItem(true);
  };

  const cancelEdit = () => {
    setEditingLineItem(null);
    setShowAddLineItem(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content edit-invoice-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            <div className="loading-state">Loading invoice...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content edit-invoice-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Error</h3>
            <button className="modal-close" onClick={onClose}>
              <XIcon size={20} />
            </button>
          </div>
          <div className="modal-body">
            <div className="error-message">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-invoice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <EditIcon size={24} />
            Edit Invoice {invoice.number}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {/* Invoice Details Section */}
          <div className="edit-section">
            <h4>Invoice Details</h4>
            <div className="invoice-summary">
              <div className="summary-row">
                <span className="label">Customer:</span>
                <span className="value">{invoice.customerName}</span>
              </div>
              <div className="summary-row">
                <span className="label">Paying Org:</span>
                <span className="value">{invoice.payingOrg}</span>
              </div>
              <div className="summary-row">
                <span className="label">Period:</span>
                <span className="value">
                  {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                </span>
              </div>
              <div className="summary-row">
                <span className="label">Due Date:</span>
                <span className="value">{formatDate(invoice.dueDate)}</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description / Notes</label>
              <textarea
                id="description"
                className="form-control"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or description for this invoice"
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveDetails}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Details'}
            </button>
          </div>

          {/* Line Items Section */}
          <div className="edit-section">
            <div className="section-header-row">
              <h4>Line Items</h4>
              <button
                className="btn btn-success btn-sm"
                onClick={startAddLineItem}
                disabled={showAddLineItem || editingLineItem !== null}
              >
                <PlusIcon size={16} />
                Add Item
              </button>
            </div>

            <div className="line-items-list">
              {/* Add New Line Item Form */}
              {showAddLineItem && editingLineItem && (
                <div className="line-item-form">
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Description</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingLineItem.description}
                        onChange={(e) => setEditingLineItem({ ...editingLineItem, description: e.target.value })}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        value={editingLineItem.quantity}
                        onChange={(e) => setEditingLineItem({ ...editingLineItem, quantity: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit Price</label>
                      <input
                        type="number"
                        className="form-control"
                        step="0.01"
                        min="0"
                        value={editingLineItem.unitPrice}
                        onChange={(e) => setEditingLineItem({ ...editingLineItem, unitPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Total</label>
                      <div className="form-control-static">
                        {formatCurrency(editingLineItem.quantity * editingLineItem.unitPrice)}
                      </div>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleAddLineItem}
                      disabled={saving || !editingLineItem.description}
                    >
                      Add
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Line Items */}
              {invoice.items.map((item) => (
                <div key={item.id} className="line-item">
                  {editingLineItem && editingLineItem.id === item.id ? (
                    // Edit Mode
                    <div className="line-item-form">
                      <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                          <label>Description</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingLineItem.description}
                            onChange={(e) => setEditingLineItem({ ...editingLineItem, description: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Quantity</label>
                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            value={editingLineItem.quantity}
                            onChange={(e) => setEditingLineItem({ ...editingLineItem, quantity: parseFloat(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Unit Price</label>
                          <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            min="0"
                            value={editingLineItem.unitPrice}
                            onChange={(e) => setEditingLineItem({ ...editingLineItem, unitPrice: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Total</label>
                          <div className="form-control-static">
                            {formatCurrency(editingLineItem.quantity * editingLineItem.unitPrice)}
                          </div>
                        </div>
                      </div>
                      <div className="form-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateLineItem(item.id)}
                          disabled={saving || !editingLineItem.description}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="line-item-content">
                        <div className="line-item-description">
                          <strong>{item.description}</strong>
                          {item.serviceDate && (
                            <span className="service-date">
                              Service Date: {formatDate(item.serviceDate)}
                            </span>
                          )}
                        </div>
                        <div className="line-item-details">
                          <span>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
                          <span className="line-item-total">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                      <div className="line-item-actions">
                        <button
                          className="btn-icon"
                          onClick={() => startEditLineItem(item)}
                          title="Edit Line Item"
                          disabled={editingLineItem !== null || showAddLineItem}
                        >
                          <EditIcon size={16} />
                        </button>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDeleteLineItem(item.id)}
                          title="Delete Line Item"
                          disabled={saving || editingLineItem !== null || showAddLineItem}
                        >
                          <XIcon size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Invoice Totals */}
            <div className="invoice-totals">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="total-row">
                  <span>Tax:</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="total-row total-final">
                <span>Total:</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <>
                  <div className="total-row">
                    <span>Amount Paid:</span>
                    <span className="text-success">{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                  <div className="total-row total-balance">
                    <span>Balance Due:</span>
                    <span className="text-warning">
                      {formatCurrency(invoice.totalAmount - invoice.amountPaid)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSuccess();
              onClose();
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
