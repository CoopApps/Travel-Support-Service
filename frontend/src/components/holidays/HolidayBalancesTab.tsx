import React, { useState } from 'react';
import { HolidayBalance } from '../../types/holiday.types';

interface HolidayBalancesTabProps {
  balances: HolidayBalance[];
  onAdjustBalance: (driverId: number) => void;
  loading?: boolean;
}

const HolidayBalancesTab: React.FC<HolidayBalancesTabProps> = ({
  balances,
  onAdjustBalance,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof HolidayBalance>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'exhausted' | 'available'>('all');

  // Filter balances based on search term
  const filteredBalances = balances.filter(balance => {
    const matchesSearch = balance.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    if (filterStatus === 'exhausted') return balance.remaining_days === 0;
    if (filterStatus === 'low') return balance.remaining_days > 0 && balance.remaining_days < 5;
    if (filterStatus === 'available') return balance.remaining_days >= 5;

    return true;
  });

  // Sort balances
  const sortedBalances = [...filteredBalances].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const handleSort = (field: keyof HolidayBalance) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (balance: HolidayBalance) => {
    if (balance.remaining_days === 0) {
      return <span className="badge badge-danger">Exhausted</span>;
    }
    if (balance.remaining_days < 5) {
      return <span className="badge badge-warning">Low</span>;
    }
    return <span className="badge badge-success">Available</span>;
  };

  const calculateUsagePercentage = (balance: HolidayBalance): number => {
    if (balance.allowance === 0) return 0;
    return Math.round((balance.used_days / balance.allowance) * 100);
  };

  const exportToCSV = () => {
    const headers = ['Driver Name', 'Allowance', 'Used', 'Pending', 'Remaining', 'Carried Over', 'Status'];
    const rows = sortedBalances.map(b => [
      b.name,
      b.allowance,
      b.used_days,
      b.pending_days,
      b.remaining_days,
      b.carried_over || 0,
      b.remaining_days === 0 ? 'Exhausted' : b.remaining_days < 5 ? 'Low' : 'Available'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holiday-balances-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="balances-tab">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading balances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="balances-tab">
      <div className="balances-header">
        <div className="balances-controls">
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="filter-group">
            <label>Filter:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="form-select"
            >
              <option value="all">All Drivers ({balances.length})</option>
              <option value="available">Available (≥5 days)</option>
              <option value="low">Low (&lt;5 days)</option>
              <option value="exhausted">Exhausted (0 days)</option>
            </select>
          </div>

          <button
            className="btn btn-secondary"
            onClick={exportToCSV}
            disabled={sortedBalances.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export CSV
          </button>
        </div>

        <div className="balances-summary">
          <div className="summary-card">
            <div className="summary-label">Total Drivers</div>
            <div className="summary-value">{balances.length}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Days Used</div>
            <div className="summary-value">
              {balances.reduce((sum, b) => sum + b.used_days, 0)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Pending Days</div>
            <div className="summary-value">
              {balances.reduce((sum, b) => sum + b.pending_days, 0)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Avg Usage</div>
            <div className="summary-value">
              {balances.length > 0
                ? Math.round((balances.reduce((sum, b) => sum + b.used_days, 0) / balances.length))
                : 0
              } days
            </div>
          </div>
        </div>
      </div>

      <div className="balances-table-container">
        <table className="data-table balances-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Driver
                {sortField === 'name' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('allowance')} className="sortable">
                Allowance
                {sortField === 'allowance' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('used_days')} className="sortable">
                Used
                {sortField === 'used_days' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('pending_days')} className="sortable">
                Pending
                {sortField === 'pending_days' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('remaining_days')} className="sortable">
                Remaining
                {sortField === 'remaining_days' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th onClick={() => handleSort('carried_over')} className="sortable">
                Carried Over
                {sortField === 'carried_over' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>Usage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedBalances.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-state">
                  {searchTerm || filterStatus !== 'all'
                    ? 'No drivers match your filters'
                    : 'No driver balances available'
                  }
                </td>
              </tr>
            ) : (
              sortedBalances.map(balance => {
                const usagePercentage = calculateUsagePercentage(balance);

                return (
                  <tr key={balance.driver_id}>
                    <td>
                      <div className="driver-info">
                        <strong>{balance.name}</strong>
                        {balance.manual_adjustment !== undefined && balance.manual_adjustment !== 0 && (
                          <span className="adjustment-indicator" title={`Manual adjustment: ${balance.manual_adjustment > 0 ? '+' : ''}${balance.manual_adjustment} days`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>{balance.allowance}</strong> days
                    </td>
                    <td>
                      <span className={balance.used_days > balance.allowance * 0.8 ? 'text-warning' : ''}>
                        {balance.used_days} days
                      </span>
                    </td>
                    <td>
                      {balance.pending_days > 0 ? (
                        <span className="badge badge-info">{balance.pending_days} days</span>
                      ) : (
                        <span className="text-muted">0 days</span>
                      )}
                    </td>
                    <td>
                      <span className={
                        balance.remaining_days === 0 ? 'text-danger' :
                        balance.remaining_days < 5 ? 'text-warning' :
                        'text-success'
                      }>
                        <strong>{balance.remaining_days} days</strong>
                      </span>
                    </td>
                    <td>
                      {balance.carried_over > 0 ? (
                        <span className="badge badge-secondary">+{balance.carried_over}</span>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                    <td>
                      <div className="usage-bar-container">
                        <div className="usage-bar">
                          <div
                            className={`usage-fill ${
                              usagePercentage >= 100 ? 'usage-exhausted' :
                              usagePercentage >= 80 ? 'usage-high' :
                              usagePercentage >= 50 ? 'usage-medium' :
                              'usage-low'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="usage-percentage">{usagePercentage}%</span>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(balance)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-link"
                        onClick={() => onAdjustBalance(balance.driver_id)}
                        title="Manually adjust balance"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedBalances.length > 0 && (
        <div className="balances-footer">
          <p className="text-muted">
            Showing {sortedBalances.length} of {balances.length} drivers
          </p>
        </div>
      )}
    </div>
  );
};

export default HolidayBalancesTab;
