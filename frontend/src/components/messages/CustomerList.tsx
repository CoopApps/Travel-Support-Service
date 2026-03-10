import React from 'react';
import { Customer, RecipientType } from '../../types/messages.types';

interface CustomerListProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  selectedCustomerIds: number[];
  searchTerm: string;
  loading: boolean;
  showMessageForm: boolean;
  recipientType: RecipientType;
  onCustomerSelect: (customer: Customer) => void;
  onCustomerToggle: (customerId: number) => void;
  onSearchChange: (searchTerm: string) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  selectedCustomer,
  selectedCustomerIds,
  searchTerm,
  loading,
  showMessageForm,
  recipientType,
  onCustomerSelect,
  onCustomerToggle,
  onSearchChange,
}) => {
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      width: '320px',
      borderRight: '1px solid var(--gray-200)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--gray-50)'
    }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', background: 'white' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600 }}>Customer Messages</h2>
        <input
          type="text"
          className="form-control"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ fontSize: '14px' }}
        />
      </div>

      {/* Customer List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
        {showMessageForm ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto' }}></div>
              <p style={{ marginTop: '0.5rem', fontSize: '13px', color: 'var(--gray-600)' }}>Loading...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)', fontSize: '14px' }}>
              No customers found
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const isSelected = recipientType === 'single'
                ? selectedCustomer?.customer_id === customer.customer_id
                : selectedCustomerIds.includes(customer.customer_id);

              return (
                <div
                  key={customer.customer_id}
                  onClick={() => {
                    if (recipientType === 'multiple') {
                      onCustomerToggle(customer.customer_id);
                    } else {
                      onCustomerSelect(customer);
                    }
                  }}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: isSelected ? '#e3f2fd' : 'white',
                    border: isSelected ? '2px solid #2196f3' : '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--gray-100)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  {recipientType === 'multiple' && (
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.includes(customer.customer_id)}
                      onChange={() => onCustomerToggle(customer.customer_id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--gray-900)', marginBottom: '4px' }}>
                      {customer.name}
                    </div>
                    {customer.address && (
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                        {customer.address}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : null}
      </div>
    </div>
  );
};

export default CustomerList;
