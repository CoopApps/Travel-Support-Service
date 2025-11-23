import React, { useState, useEffect } from 'react';
import { BusTimetable, BusBooking, busBookingsApi, busRoutesApi, RouteStop, regularPassengersApi, EffectivePassenger } from '../../services/busApi';
import { customerApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { WheelchairIcon, UserIcon, SeatIcon, CalendarIcon } from '../icons/BusIcons';
import { Customer } from '../../types';
import './SeatAssignmentModal.css';

interface SeatAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: BusTimetable | null;
  serviceDate: string;
}

interface SeatOccupant {
  customer_id?: number;
  customer_name: string;
  seat_number: string;
  requires_wheelchair_space: boolean;
  is_regular: boolean;
  booking_id?: number;
}

interface SeatAssignment {
  seatNumber: string;
  occupant?: SeatOccupant;
  isWheelchair: boolean;
}

export default function SeatAssignmentModal({
  isOpen,
  onClose,
  timetable,
  serviceDate
}: SeatAssignmentModalProps) {
  const { tenant } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [effectivePassengers, setEffectivePassengers] = useState<EffectivePassenger[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedCustomer, setDraggedCustomer] = useState<Customer | null>(null);
  const [seats, setSeats] = useState<SeatAssignment[]>([]);

  // Generate seat layout based on timetable capacity
  useEffect(() => {
    if (timetable) {
      const totalSeats = timetable.total_seats || 16;
      const wheelchairSpaces = timetable.wheelchair_spaces || 2;

      const seatLayout: SeatAssignment[] = [];

      // Add wheelchair spaces first (at front of bus)
      for (let i = 1; i <= wheelchairSpaces; i++) {
        seatLayout.push({
          seatNumber: `W${i}`,
          isWheelchair: true
        });
      }

      // Add regular seats
      for (let i = 1; i <= totalSeats - wheelchairSpaces; i++) {
        seatLayout.push({
          seatNumber: `${i}`,
          isWheelchair: false
        });
      }

      setSeats(seatLayout);
    }
  }, [timetable]);

  // Load customers and existing bookings
  useEffect(() => {
    if (isOpen && tenant?.tenant_id && timetable) {
      loadData();
    }
  }, [isOpen, tenant?.tenant_id, timetable, serviceDate]);

  const loadData = async () => {
    if (!tenant?.tenant_id || !timetable) return;

    setLoading(true);
    try {
      const [customersData, passengersData, routeData] = await Promise.all([
        customerApi.getCustomers(tenant.tenant_id, { limit: 500 }),
        regularPassengersApi.getEffectivePassengers(tenant.tenant_id, timetable.timetable_id, serviceDate),
        busRoutesApi.getRoute(tenant.tenant_id, timetable.route_id)
      ]);

      // Handle both CustomerListResponse and Customer[] response types
      const customers = 'customers' in customersData ? customersData.customers : customersData;
      setCustomers(customers || []);
      setEffectivePassengers(passengersData || []);
      setRouteStops(routeData.stops || []);

      // Update seats with effective passengers (regular + one-off)
      setSeats(prev => prev.map(seat => {
        const passenger = passengersData.find((p: EffectivePassenger) => p.seat_number === seat.seatNumber);
        if (passenger) {
          return {
            ...seat,
            occupant: {
              customer_id: passenger.customer_id,
              customer_name: passenger.customer_name,
              seat_number: passenger.seat_number,
              requires_wheelchair_space: passenger.requires_wheelchair_space,
              is_regular: passenger.is_regular,
              booking_id: passenger.booking_id
            }
          };
        }
        return { ...seat, occupant: undefined };
      }));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.first_name?.toLowerCase().includes(search) ||
      customer.last_name?.toLowerCase().includes(search) ||
      customer.phone?.includes(search)
    );
  });

  // Get customers who are already on this service (regular or one-off)
  const assignedCustomerIds = effectivePassengers.map(p => p.customer_id).filter(Boolean);

  // Available customers (not already assigned)
  const availableCustomers = filteredCustomers.filter(
    c => !assignedCustomerIds.includes(c.customer_id)
  );

  const handleDragStart = (e: React.DragEvent, customer: Customer) => {
    setDraggedCustomer(customer);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, seatNumber: string) => {
    e.preventDefault();
    if (!draggedCustomer || !tenant?.tenant_id || !timetable) return;

    const seat = seats.find(s => s.seatNumber === seatNumber);
    if (seat?.occupant) {
      alert('This seat is already occupied. Remove the current passenger first.');
      return;
    }

    // Check wheelchair compatibility
    if (seat?.isWheelchair && !draggedCustomer.requires_wheelchair) {
      const confirm = window.confirm(
        'This is a wheelchair space. Assign a non-wheelchair user here?'
      );
      if (!confirm) return;
    }

    // Get first and last stops for boarding/alighting
    const sortedStops = [...routeStops].sort((a, b) => a.stop_sequence - b.stop_sequence);
    const firstStop = sortedStops[0];
    const lastStop = sortedStops[sortedStops.length - 1];

    if (!firstStop || !lastStop) {
      alert('Route has no stops configured. Please add stops to the route first.');
      return;
    }

    setSaving(true);
    try {
      const booking = await busBookingsApi.createBooking(tenant.tenant_id, {
        timetable_id: timetable.timetable_id,
        customer_id: draggedCustomer.customer_id,
        passenger_name: `${draggedCustomer.first_name} ${draggedCustomer.last_name}`,
        passenger_phone: draggedCustomer.phone,
        service_date: serviceDate,
        seat_number: seatNumber,
        requires_wheelchair_space: draggedCustomer.requires_wheelchair || false,
        booking_status: 'confirmed',
        boarding_stop_id: firstStop.stop_id,
        alighting_stop_id: lastStop.stop_id
      });

      // Update local state
      const newOccupant: SeatOccupant = {
        customer_id: draggedCustomer.customer_id,
        customer_name: `${draggedCustomer.first_name} ${draggedCustomer.last_name}`,
        seat_number: seatNumber,
        requires_wheelchair_space: draggedCustomer.requires_wheelchair || false,
        is_regular: false, // One-off booking
        booking_id: booking.booking_id
      };
      setEffectivePassengers(prev => [...prev, {
        customer_id: draggedCustomer.customer_id,
        customer_name: newOccupant.customer_name,
        seat_number: seatNumber,
        requires_wheelchair_space: newOccupant.requires_wheelchair_space,
        is_regular: false,
        booking_id: booking.booking_id
      }]);
      setSeats(prev => prev.map(s =>
        s.seatNumber === seatNumber ? { ...s, occupant: newOccupant } : s
      ));
    } catch (err: any) {
      console.error('Failed to create booking:', err);
      alert(err.response?.data?.error || 'Failed to assign seat');
    } finally {
      setSaving(false);
      setDraggedCustomer(null);
    }
  };

  const handleRemovePassenger = async (occupant: SeatOccupant) => {
    if (!tenant?.tenant_id) return;

    // Regular passengers can't be removed here - they need to report an absence
    if (occupant.is_regular) {
      alert('This is a regular passenger. To remove them from this journey, they should report an absence through the customer dashboard, or you can add an absence for them.');
      return;
    }

    if (!occupant.booking_id) {
      alert('Cannot remove this passenger - no booking ID found.');
      return;
    }

    if (!window.confirm(`Remove ${occupant.customer_name} from this seat?`)) return;

    setSaving(true);
    try {
      await busBookingsApi.cancelBooking(tenant.tenant_id, occupant.booking_id, 'Removed from seat assignment');

      // Update local state
      setEffectivePassengers(prev => prev.filter(p => p.booking_id !== occupant.booking_id));
      setSeats(prev => prev.map(s =>
        s.occupant?.booking_id === occupant.booking_id ? { ...s, occupant: undefined } : s
      ));
    } catch (err: any) {
      console.error('Failed to remove booking:', err);
      alert(err.response?.data?.error || 'Failed to remove booking');
    } finally {
      setSaving(false);
    }
  };

  const getOccupiedCount = () => seats.filter(s => s.occupant).length;
  const getWheelchairOccupied = () => seats.filter(s => s.isWheelchair && s.occupant).length;
  const getRegularCount = () => effectivePassengers.filter(p => p.is_regular).length;
  const getOneOffCount = () => effectivePassengers.filter(p => !p.is_regular).length;

  if (!isOpen || !timetable) return null;

  return (
    <div className="modal-overlay seat-assignment-overlay" onClick={onClose}>
      <div className="seat-assignment-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-info">
            <h2>Seat Assignment</h2>
            <div className="service-info">
              <span className="route-badge">{timetable.route_number}</span>
              <span className="service-name">{timetable.service_name}</span>
              <span className="service-time">{timetable.departure_time}</span>
              <span className="service-date">{new Date(serviceDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="seat-assignment-content">
          {/* Left Column - Customer Search */}
          <div className="customer-panel">
            <div className="panel-header">
              <h3>Customers</h3>
              <span className="customer-count">{availableCustomers.length} available</span>
            </div>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="customer-list">
              {loading ? (
                <div className="loading-state">Loading customers...</div>
              ) : availableCustomers.length === 0 ? (
                <div className="empty-state">
                  {searchTerm ? 'No matching customers' : 'All customers are booked'}
                </div>
              ) : (
                availableCustomers.map(customer => (
                  <div
                    key={customer.customer_id}
                    className={`customer-card ${customer.requires_wheelchair ? 'wheelchair' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, customer)}
                  >
                    <div className="customer-avatar">
                      {customer.requires_wheelchair ? (
                        <WheelchairIcon size={20} color="#3b82f6" />
                      ) : (
                        <UserIcon size={20} color="#6b7280" />
                      )}
                    </div>
                    <div className="customer-info">
                      <div className="customer-name">
                        {customer.first_name} {customer.last_name}
                      </div>
                      {customer.phone && (
                        <div className="customer-phone">{customer.phone}</div>
                      )}
                    </div>
                    <div className="drag-hint">Drag →</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column - Seat Map */}
          <div className="seat-panel">
            <div className="panel-header">
              <h3>Bus Seats</h3>
              <div className="occupancy-info">
                <span>{getOccupiedCount()}/{timetable.total_seats} seats</span>
                {timetable.wheelchair_spaces > 0 && (
                  <span className="wheelchair-count">
                    <WheelchairIcon size={14} /> {getWheelchairOccupied()}/{timetable.wheelchair_spaces}
                  </span>
                )}
              </div>
            </div>

            <div className="bus-layout">
              <div className="bus-front">
                <div className="driver-area">Driver</div>
              </div>

              {/* Wheelchair spaces */}
              {timetable.wheelchair_spaces > 0 && (
                <div className="wheelchair-section">
                  <div className="section-label">Wheelchair Spaces</div>
                  <div className="seat-row wheelchair-row">
                    {seats.filter(s => s.isWheelchair).map(seat => (
                      <div
                        key={seat.seatNumber}
                        className={`seat wheelchair-seat ${seat.occupant ? 'occupied' : 'available'} ${seat.occupant?.is_regular ? 'regular' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={e => handleDrop(e, seat.seatNumber)}
                      >
                        {seat.occupant ? (
                          <div className="seat-occupied" onClick={() => handleRemovePassenger(seat.occupant!)}>
                            <WheelchairIcon size={16} color="#fff" />
                            <span className="passenger-initials">
                              {seat.occupant.customer_name?.split(' ').map(n => n[0]).join('')}
                            </span>
                            {seat.occupant.is_regular && <span className="regular-badge">R</span>}
                            {!seat.occupant.is_regular && <button className="remove-btn">&times;</button>}
                          </div>
                        ) : (
                          <div className="seat-empty">
                            <WheelchairIcon size={20} color="#9ca3af" />
                            <span>{seat.seatNumber}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular seats in rows of 4 (2+2 typical bus layout) */}
              <div className="seats-section">
                <div className="section-label">Passenger Seats</div>
                <div className="seats-grid">
                  {seats.filter(s => !s.isWheelchair).map(seat => (
                    <div
                      key={seat.seatNumber}
                      className={`seat regular-seat ${seat.occupant ? 'occupied' : 'available'} ${seat.occupant?.is_regular ? 'regular' : ''}`}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, seat.seatNumber)}
                    >
                      {seat.occupant ? (
                        <div className="seat-occupied" onClick={() => handleRemovePassenger(seat.occupant!)}>
                          <span className="passenger-initials">
                            {seat.occupant.customer_name?.split(' ').map(n => n[0]).join('')}
                          </span>
                          <span className="seat-number">{seat.seatNumber}</span>
                          {seat.occupant.is_regular && <span className="regular-badge">R</span>}
                          {!seat.occupant.is_regular && <button className="remove-btn">&times;</button>}
                        </div>
                      ) : (
                        <div className="seat-empty">
                          <SeatIcon size={18} color="#9ca3af" />
                          <span>{seat.seatNumber}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bus-rear">Rear</div>
            </div>

            {/* Legend */}
            <div className="seat-legend">
              <div className="legend-item">
                <div className="legend-seat available"></div>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-seat occupied"></div>
                <span>One-off</span>
              </div>
              <div className="legend-item">
                <div className="legend-seat regular"></div>
                <span>Regular</span>
              </div>
              <div className="legend-item">
                <div className="legend-seat wheelchair"></div>
                <span>Wheelchair</span>
              </div>
            </div>
          </div>
        </div>

        {/* Passengers summary */}
        {effectivePassengers.length > 0 && (
          <div className="bookings-summary">
            <h4>
              Passengers ({effectivePassengers.length})
              <span className="passenger-breakdown">
                {getRegularCount() > 0 && <span className="regular-count">{getRegularCount()} regular</span>}
                {getOneOffCount() > 0 && <span className="oneoff-count">{getOneOffCount()} one-off</span>}
              </span>
            </h4>
            <div className="bookings-list">
              {effectivePassengers.map((passenger, idx) => (
                <div key={passenger.booking_id || `reg-${idx}`} className={`booking-chip ${passenger.is_regular ? 'regular' : ''}`}>
                  <span className="seat-badge">{passenger.seat_number}</span>
                  <span className="passenger-name">{passenger.customer_name}</span>
                  {passenger.is_regular && <CalendarIcon size={12} />}
                  {passenger.requires_wheelchair_space && <WheelchairIcon size={12} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
