import React, { useState, useEffect } from 'react';
import { customerApi } from '../../services/api';
import { Customer } from '../../types';
import { useTenant } from '../../context/TenantContext';
import './PassengerImportPicker.css';

interface PassengerImportPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (passengers: Array<{ name: string; address: string; postcode?: string; customer_id: number }>) => void;
}

/** Sort stops by postcode for optimal routing (UK postcodes) */
function sortByPostcode<T extends { postcode?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const postcodeA = a.postcode?.toUpperCase() || '';
    const postcodeB = b.postcode?.toUpperCase() || '';
    const outwardA = postcodeA.split(' ')[0] || postcodeA;
    const outwardB = postcodeB.split(' ')[0] || postcodeB;
    return outwardA.localeCompare(outwardB);
  });
}

export default function PassengerImportPicker({ isOpen, onClose, onImport }: PassengerImportPickerProps) {
  const { tenant } = useTenant();
  const [passengers, setPassengers] = useState<Customer[]>([]);
  const [selectedPassengers, setSelectedPassengers] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimizeByPostcode, setOptimizeByPostcode] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPassengers();
      setSelectedPassengers(new Set());
      setSearch('');
    }
  }, [isOpen]);

  const loadPassengers = async () => {
    if (!tenant?.tenant_id) return;
    setLoading(true);
    try {
      const response = await customerApi.getCustomers(tenant.tenant_id, { limit: 500 });
      const customerList = Array.isArray(response) ? response : response.customers || [];
      setPassengers(customerList);
    } catch (err) {
      console.error('Failed to load passengers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (customerId: number) => {
    setSelectedPassengers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) newSet.delete(customerId);
      else newSet.add(customerId);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPassengers.size === filteredPassengers.length) {
      setSelectedPassengers(new Set());
    } else {
      setSelectedPassengers(new Set(filteredPassengers.map(p => p.customer_id)));
    }
  };

  const handleImport = () => {
    const selectedCustomers = passengers.filter(p => selectedPassengers.has(p.customer_id));
    let stopsData = selectedCustomers.map(customer => {
      const addressParts = [customer.address, customer.city, customer.postcode].filter(Boolean);
      return {
        name: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        address: addressParts.join(', '),
        postcode: customer.postcode,
        customer_id: customer.customer_id
      };
    });

    if (optimizeByPostcode) {
      stopsData = sortByPostcode(stopsData);
    }

    onImport(stopsData);
    onClose();
  };

  const filteredPassengers = passengers.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = (p.name || `${p.first_name || ''} ${p.last_name || ''}`).toLowerCase();
    return name.includes(s) || (p.postcode || '').toLowerCase().includes(s) || (p.address || '').toLowerCase().includes(s);
  });

  if (!isOpen) return null;

  return (
    <div className="passenger-picker-overlay" onClick={onClose}>
      <div className="passenger-picker" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <h4>Import Passenger Addresses</h4>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="picker-search">
          <input
            type="text"
            placeholder="Search by name, postcode, or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="picker-options">
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={optimizeByPostcode}
              onChange={e => setOptimizeByPostcode(e.target.checked)}
            />
            <span>Optimize route order by postcode</span>
          </label>
          <button className="btn-text btn-sm" onClick={handleSelectAll}>
            {selectedPassengers.size === filteredPassengers.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="picker-list">
          {loading ? (
            <div className="picker-loading">Loading passengers...</div>
          ) : filteredPassengers.length === 0 ? (
            <div className="picker-empty">No passengers found</div>
          ) : (
            filteredPassengers.map(passenger => (
              <label key={passenger.customer_id} className="passenger-item">
                <input
                  type="checkbox"
                  checked={selectedPassengers.has(passenger.customer_id)}
                  onChange={() => handleToggle(passenger.customer_id)}
                />
                <div className="passenger-info">
                  <div className="passenger-name">
                    {passenger.name || `${passenger.first_name || ''} ${passenger.last_name || ''}`.trim()}
                  </div>
                  <div className="passenger-address">
                    {[passenger.address, passenger.city, passenger.postcode].filter(Boolean).join(', ') || 'No address'}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="picker-footer">
          <span className="selected-count">{selectedPassengers.size} selected</span>
          <div className="picker-actions">
            <button className="btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={handleImport}
              disabled={selectedPassengers.size === 0}
            >
              Import {selectedPassengers.size} Stops
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
