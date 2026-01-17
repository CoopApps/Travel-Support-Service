import React, { useState, useEffect } from 'react';
import { invoiceApi } from '../../services/api';
import type { InvoiceFilters, InvoiceStatus, InvoiceType } from '../../types/invoice.types';

interface Props {
  filters: InvoiceFilters;
  onFilterChange: (filters: Partial<InvoiceFilters>) => void;
  tenantId: number;
}

/**
 * Invoice Filters Bar
 * Search and filter controls for invoice list
 */
export const InvoiceFiltersBar: React.FC<Props> = ({ filters, onFilterChange, tenantId }) => {
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    loadProviders();
  }, [tenantId]);

  const loadProviders = async () => {
    try {
      const data = await invoiceApi.getPaymentProviders(tenantId);
      setProviders(data);
    } catch {
      // Error handled silently
    }
  };

  const statusOptions: { value: InvoiceStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const typeOptions: { value: InvoiceType | ''; label: string }[] = [
    { value: '', label: 'All Types' },
    { value: 'standard', label: 'Standard' },
    { value: 'provider', label: 'Provider' },
    { value: 'split', label: 'Split Payment' }
  ];

  // Generate month options for last 12 months
  const getMonthOptions = () => {
    const options = [{ value: '', label: 'All Months' }];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  const handleMonthChange = (monthValue: string) => {
    if (monthValue === '') {
      onFilterChange({ start_date: '', end_date: '' });
    } else {
      const [year, month] = monthValue.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      onFilterChange({ start_date: startDate, end_date: endDate });
    }
  };

  // Determine current month selection
  const getCurrentMonth = () => {
    if (!filters.start_date || !filters.end_date) return '';
    const startDate = new Date(filters.start_date);
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  return (
    <div className="filters-bar">
      <div className="filters-row">
        {/* Search */}
        <div className="filter-group" style={{ flex: 2 }}>
          <input
            type="text"
            placeholder="Search invoices..."
            className="form-input"
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
          />
        </div>

        {/* Status Filter */}
        <div className="filter-group">
          <select
            className="form-select"
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ status: e.target.value as InvoiceStatus | '' })}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="filter-group">
          <select
            className="form-select"
            value={filters.type || ''}
            onChange={(e) => onFilterChange({ type: e.target.value as InvoiceType | '' })}
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Provider Filter */}
        <div className="filter-group">
          <select
            className="form-select"
            value={filters.provider || ''}
            onChange={(e) => onFilterChange({ provider: e.target.value })}
          >
            <option value="">All Providers</option>
            {providers.map(provider => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div className="filter-group">
          <select
            className="form-select"
            value={getCurrentMonth()}
            onChange={(e) => handleMonthChange(e.target.value)}
          >
            {getMonthOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range - Custom */}
        <div className="filter-group">
          <input
            type="date"
            className="form-input"
            placeholder="Start Date"
            value={filters.start_date || ''}
            onChange={(e) => onFilterChange({ start_date: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <input
            type="date"
            className="form-input"
            placeholder="End Date"
            value={filters.end_date || ''}
            onChange={(e) => onFilterChange({ end_date: e.target.value })}
          />
        </div>

        {/* Clear Filters */}
        <button
          className="btn btn-outline"
          onClick={() => onFilterChange({
            status: '',
            type: '',
            provider: '',
            start_date: '',
            end_date: '',
            search: ''
          })}
        >
          Clear
        </button>
      </div>
    </div>
  );
};
