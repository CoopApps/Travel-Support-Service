import { useState, useEffect } from 'react';
import { Driver } from '../../types';
import { driverApi } from '../../services/api';

interface CustomerAssignmentDisplayProps {
  driver: Driver;
  tenantId: number;
}

/**
 * Customer Assignment Display
 *
 * Shows customer assignments for a driver with details
 */
function CustomerAssignmentDisplay({ driver, tenantId }: CustomerAssignmentDisplayProps) {
  const [assignments, setAssignments] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Fetch customer assignments
   */
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await driverApi.getCustomerAssignments(tenantId, driver.driver_id);
      setAssignments(data);
    } catch (err) {
      console.error('Error fetching customer assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load assignments on mount or when details are shown
   */
  useEffect(() => {
    if (showDetails && !assignments) {
      fetchAssignments();
    }
  }, [showDetails]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Loading...</div>
      </div>
    );
  }

  // Initial collapsed view
  if (!showDetails) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-500)', fontStyle: 'italic' }}>
          {assignments ? `${assignments.totalCustomers} Customer${assignments.totalCustomers !== 1 ? 's' : ''}` : 'Click to view'}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--gray-500)' }}>
          {assignments ? 'Customer assignments' : 'Load assignments'}
        </div>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setShowDetails(true)}
          style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
        >
          {assignments ? 'View Details' : 'Load Assignments'}
        </button>
      </div>
    );
  }

  // No assignments
  if (!assignments || assignments.totalCustomers === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--gray-500)', fontStyle: 'italic' }}>
          No Assignments
        </div>
        <div style={{ fontSize: '10px', color: 'var(--gray-500)' }}>
          No customer assignments
        </div>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setShowDetails(false)}
          style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
        >
          Hide
        </button>
      </div>
    );
  }

  // Has assignments - show details
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
        {assignments.totalCustomers} Customer{assignments.totalCustomers !== 1 ? 's' : ''}
      </div>

      {assignments.assignments.slice(0, 3).map((assignment: any) => (
        <div key={assignment.customerId} style={{
          fontSize: '10px',
          padding: '4px',
          background: 'var(--gray-50)',
          borderRadius: '3px',
          borderLeft: '2px solid var(--success)'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--gray-800)', marginBottom: '2px' }}>
            {assignment.customerName}
          </div>
          <div style={{ color: 'var(--gray-600)' }}>
            {assignment.daysCount} day{assignment.daysCount !== 1 ? 's' : ''}/week
          </div>
          {assignment.assignedDays.slice(0, 2).map((day: any, idx: number) => (
            <div key={idx} style={{ fontSize: '9px', color: 'var(--gray-500)', marginTop: '2px' }}>
              • {day.day}: {day.pickupTime}
            </div>
          ))}
        </div>
      ))}

      {assignments.totalCustomers > 3 && (
        <div style={{ fontSize: '10px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
          +{assignments.totalCustomers - 3} more
        </div>
      )}

      <button
        className="btn btn-sm btn-secondary"
        onClick={() => setShowDetails(false)}
        style={{ fontSize: '10px', padding: '2px 6px', width: 'fit-content' }}
      >
        Hide Details
      </button>
    </div>
  );
}

export default CustomerAssignmentDisplay;
