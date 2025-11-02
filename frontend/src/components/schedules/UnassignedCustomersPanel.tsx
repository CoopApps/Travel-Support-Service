import React from 'react';
import { Customer } from '../../types';
import './UnassignedCustomersPanel.css';

interface UnassignedCustomersPanelProps {
  customers: Customer[];
  schedules: any;
  currentWeek: Date;
}

interface CustomerAssignment {
  [customerId: number]: {
    [dayIndex: number]: {
      morning?: boolean;
      afternoon?: boolean;
    };
  };
}

const UnassignedCustomersPanel: React.FC<UnassignedCustomersPanelProps> = ({
  customers,
  schedules,
  currentWeek
}) => {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Get all assignments from schedules to check which customers are already assigned
  const getAssignedCustomers = (): CustomerAssignment => {
    const assigned: CustomerAssignment = {};

    if (!schedules) return assigned;

    Object.values(schedules).forEach((driverSchedule: any) => {
      Object.keys(driverSchedule).forEach((dayIndex) => {
        const day = driverSchedule[dayIndex];
        if (day) {
          ['morning', 'afternoon'].forEach((period) => {
            if (day[period]) {
              day[period].forEach((assignment: any) => {
                if (!assigned[assignment.customerId]) {
                  assigned[assignment.customerId] = {};
                }
                if (!assigned[assignment.customerId][dayIndex]) {
                  assigned[assignment.customerId][dayIndex] = {};
                }
                assigned[assignment.customerId][dayIndex][period as 'morning' | 'afternoon'] = true;
              });
            }
          });
        }
      });
    });

    return assigned;
  };

  const assignedCustomers = getAssignedCustomers();

  // Get customers who need assignment for each day
  const getCustomersByDay = (dayIndex: number, day: string) => {
    const dayCustomers = customers.filter(c => {
      if (!c.schedule) return false;
      const daySchedule = c.schedule[day];
      // Check if day has a valid schedule entry with a destination
      return daySchedule && daySchedule.destination && daySchedule.destination.trim() !== '';
    });

    // Filter to only unassigned or partially assigned customers
    const unassignedCustomers = dayCustomers.filter(customer => {
      const assignments = assignedCustomers[customer.id || customer.customer_id] || {};
      const dayAssignments = assignments[dayIndex] || {};

      // Customer is unassigned if they don't have both morning AND afternoon assigned
      return !(dayAssignments.morning && dayAssignments.afternoon);
    });

    return unassignedCustomers;
  };

  // Check if customer has morning or afternoon assigned
  const getAssignmentStatus = (customerId: number, dayIndex: number) => {
    const assignments = assignedCustomers[customerId] || {};
    const dayAssignments = assignments[dayIndex] || {};

    return {
      hasMorning: !!dayAssignments.morning,
      hasAfternoon: !!dayAssignments.afternoon
    };
  };

  // Count total unassigned customers
  const totalUnassigned = days.reduce((sum, day, index) => {
    return sum + getCustomersByDay(index, day).length;
  }, 0);

  // Count customers with any schedules (to show panel even with no drivers)
  const totalWithSchedules = customers.filter(c => {
    if (!c.schedule) return false;
    return days.some(day => {
      const daySchedule = c.schedule?.[day];
      // Check if day has a valid schedule entry with a destination
      return daySchedule && daySchedule.destination && daySchedule.destination.trim() !== '';
    });
  }).length;

  // Check if there are any drivers
  const hasDrivers = schedules && Object.keys(schedules).length > 0;

  return (
    <div className="unassigned-customers-panel">
      {/* Header matching schedule grid style */}
      <div style={{
        paddingLeft: '12px',
        marginBottom: '0.5rem',
        opacity: hasDrivers ? 1 : 0.6
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--gray-700)'
        }}>
          Customers Needing Assignment
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--gray-600)',
          marginTop: '2px'
        }}>
          Assign all available customers to their drivers
        </div>
      </div>

      {/* Table structure to match ScheduledTripsGrid exactly */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px',
        opacity: hasDrivers ? 1 : 0.6
      }}>
        <tbody>
          <tr>
            {/* Driver column spacer */}
            <td style={{
              minWidth: '180px',
              background: 'white',
              borderBottom: '1px solid var(--gray-200)'
            }}></td>

            {/* Day columns */}
            {days.map((day, dayIndex) => {
              // Show all customers with schedules when no drivers, otherwise show unassigned
              const dayCustomers = hasDrivers
                ? getCustomersByDay(dayIndex, day)
                : customers.filter(c => {
                    if (!c.schedule) return false;
                    const daySchedule = c.schedule[day];
                    return daySchedule && daySchedule.destination && daySchedule.destination.trim() !== '';
                  });

              return (
                <td key={day} style={{
                  padding: '4px',
                  borderBottom: '1px solid var(--gray-200)',
                  borderLeft: '1px solid var(--gray-200)',
                  background: 'white',
                  verticalAlign: 'top',
                  minWidth: '160px'
                }}>
                  <div style={{
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    {/* Day header */}
                    <div style={{
                      background: 'var(--gray-100)',
                      padding: '6px 8px',
                      borderBottom: '1px solid var(--gray-200)',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--gray-900)',
                        marginBottom: '6px'
                      }}>
                        {dayNames[dayIndex]}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: dayCustomers.length > 0 ? 'var(--gray-600)' : 'var(--gray-500)',
                        fontWeight: dayCustomers.length > 0 ? 400 : 'normal'
                      }}>
                        {dayCustomers.length > 0
                          ? `${dayCustomers.length} need${dayCustomers.length === 1 ? 's' : ''} assignment`
                          : 'No customers scheduled'
                        }
                      </div>
                    </div>

                    {/* Customer list */}
                    <div style={{
                      padding: '6px',
                      minHeight: '60px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      {dayCustomers.length === 0 ? null : (
                        dayCustomers.map(customer => {
                          const customerId = customer.id || customer.customer_id;
                          const { hasMorning, hasAfternoon } = getAssignmentStatus(customerId, dayIndex);
                          const daySchedule = customer.schedule?.[day];
                          const dailyPrice = daySchedule?.dailyPrice || daySchedule?.dailyCost || daySchedule?.price || 0;

                          return (
                            <div key={customerId} style={{
                              background: 'white',
                              border: '1px solid var(--gray-300)',
                              borderLeft: hasMorning || hasAfternoon
                                ? '2px solid #ffc107'
                                : '2px solid #dc3545',
                              borderRadius: '3px',
                              padding: '6px 8px',
                              backgroundColor: hasMorning || hasAfternoon ? '#fffbf0' : '#fff5f5'
                            }}>
                              <div style={{
                                fontWeight: 600,
                                fontSize: '11px',
                                color: 'var(--gray-900)',
                                marginBottom: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {customer.name}
                              </div>

                              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '2px',
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  flex: 1,
                                  textAlign: 'center',
                                  background: hasMorning ? '#e8f5e9' : '#ffebee',
                                  color: hasMorning ? '#2e7d32' : '#c62828'
                                }}>
                                  AM {hasMorning ? '✓' : '✗'}
                                </span>

                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '2px',
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  flex: 1,
                                  textAlign: 'center',
                                  background: hasAfternoon ? '#e8f5e9' : '#ffebee',
                                  color: hasAfternoon ? '#2e7d32' : '#c62828'
                                }}>
                                  PM {hasAfternoon ? '✓' : '✗'}
                                </span>
                              </div>

                              <div style={{
                                fontSize: '10px',
                                color: 'var(--gray-700)',
                                marginBottom: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {daySchedule?.destination}
                              </div>

                              <div style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: 'var(--gray-900)'
                              }}>
                                £{dailyPrice.toFixed(2)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default UnassignedCustomersPanel;
