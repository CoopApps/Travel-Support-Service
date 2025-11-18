import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { WheelchairIcon, CheckMarkIcon, TicketIcon, SeatIcon, BusIcon } from '../icons/BusIcons';
import apiClient from '../../services/api';

/**
 * Seat Assignment & Bus Layout Module
 *
 * Interactive interface for managing bus seating arrangements:
 * - Service selection header with date picker
 * - Left sidebar showing passengers signed up for the service
 * - Drag-and-drop seat assignment to confirm passenger placement
 * - Lock feature for regular hired services
 * - Real-time seat status updates
 */

interface Seat {
  seat_number: string;
  row: number;
  position: 'left' | 'right' | 'center';
  is_wheelchair_accessible: boolean;
  is_available: boolean;
  booking_id?: number;
  passenger_name?: string;
  passenger_tier?: string;
  customer_id?: number;
}

interface BusLayout {
  layout_id: number;
  layout_name: string;
  vehicle_capacity: number;
  rows: number;
  seats_per_row: number;
  wheelchair_seats: number;
  configuration: string;
}

interface Timetable {
  timetable_id: number;
  service_name: string;
  departure_time: string;
  route_number: string;
  route_name: string;
  origin_point: string;
  destination_point: string;
  total_seats: number;
  wheelchair_spaces: number;
  vehicle_registration?: string;
  driver_name?: string;
}

interface Booking {
  booking_id: number;
  customer_id?: number;
  passenger_name: string;
  passenger_phone?: string;
  seat_number?: string;
  requires_wheelchair_space: boolean;
  booking_status: string;
  special_requirements?: string;
  boarding_stop_name?: string;
  alighting_stop_name?: string;
}

const LAYOUT_TEMPLATES: BusLayout[] = [
  {
    layout_id: 1,
    layout_name: '16-Seater Minibus',
    vehicle_capacity: 16,
    rows: 6,
    seats_per_row: 4,
    wheelchair_seats: 2,
    configuration: '2-2'
  },
  {
    layout_id: 2,
    layout_name: '24-Seater Standard',
    vehicle_capacity: 24,
    rows: 8,
    seats_per_row: 4,
    wheelchair_seats: 3,
    configuration: '2-2'
  },
  {
    layout_id: 3,
    layout_name: '32-Seater Coach',
    vehicle_capacity: 32,
    rows: 11,
    seats_per_row: 4,
    wheelchair_seats: 2,
    configuration: '2-2'
  }
];

export default function SeatAssignmentPage() {
  const { tenant } = useTenant();
  const toast = useToast();

  // Service selection state
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Layout state
  const [selectedLayout, setSelectedLayout] = useState<BusLayout>(LAYOUT_TEMPLATES[0]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  // Booking/passenger state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  // Drag-and-drop state
  const [draggedPassenger, setDraggedPassenger] = useState<Booking | null>(null);

  // Lock state for regular services
  const [isLocked, setIsLocked] = useState(false);

  // Search filter for passengers
  const [passengerSearch, setPassengerSearch] = useState('');

  // Get selected timetable details
  const selectedTimetable = timetables.find(t => t.timetable_id === selectedTimetableId);

  // Load timetables on mount
  useEffect(() => {
    if (tenant?.tenant_id) {
      loadTimetables();
    }
  }, [tenant?.tenant_id]);

  // Generate seat layout when layout changes or when timetable is selected
  useEffect(() => {
    if (selectedTimetable) {
      // Auto-select layout based on total seats
      const matchingLayout = LAYOUT_TEMPLATES.find(l => l.vehicle_capacity >= selectedTimetable.total_seats) || LAYOUT_TEMPLATES[2];
      setSelectedLayout(matchingLayout);
    }
    generateSeats(selectedLayout);
  }, [selectedLayout, selectedTimetable]);

  // Load bookings when timetable and date are selected
  useEffect(() => {
    if (selectedTimetableId && selectedDate && tenant?.tenant_id) {
      loadBookingsForService();
    }
  }, [selectedTimetableId, selectedDate, tenant?.tenant_id]);

  const loadTimetables = async () => {
    try {
      const response = await apiClient.get(`/tenants/${tenant!.tenant_id}/bus/timetables`);
      setTimetables(response.data || []);
    } catch (err: any) {
      console.error('Error loading timetables:', err);
      toast.error('Failed to load services');
    }
  };

  const loadBookingsForService = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/tenants/${tenant!.tenant_id}/bus/bookings`,
        {
          params: {
            timetable_id: selectedTimetableId,
            service_date: selectedDate
          }
        }
      );

      const loadedBookings = response.data || [];
      setBookings(loadedBookings);

      // Update seats with booking information
      updateSeatsWithBookings(loadedBookings);
    } catch (err: any) {
      console.error('Error loading bookings:', err);
      toast.error('Failed to load passenger bookings');
    } finally {
      setLoading(false);
    }
  };

  const generateSeats = (layout: BusLayout) => {
    const newSeats: Seat[] = [];
    let seatNumber = 1;
    let wheelchairSeatsAdded = 0;

    for (let row = 1; row <= layout.rows; row++) {
      // Left side seats
      for (let i = 0; i < 2; i++) {
        const isWheelchairSeat = row <= 2 && wheelchairSeatsAdded < layout.wheelchair_seats;
        if (isWheelchairSeat) wheelchairSeatsAdded++;

        newSeats.push({
          seat_number: seatNumber.toString(),
          row,
          position: 'left',
          is_wheelchair_accessible: isWheelchairSeat,
          is_available: true,
        });
        seatNumber++;
      }

      // Right side seats
      for (let i = 0; i < 2; i++) {
        newSeats.push({
          seat_number: seatNumber.toString(),
          row,
          position: 'right',
          is_wheelchair_accessible: false,
          is_available: true,
        });
        seatNumber++;
      }
    }

    setSeats(newSeats.slice(0, layout.vehicle_capacity));
  };

  const updateSeatsWithBookings = (bookingList: Booking[]) => {
    setSeats(prevSeats =>
      prevSeats.map(seat => {
        const booking = bookingList.find(b => b.seat_number === seat.seat_number);
        if (booking) {
          return {
            ...seat,
            is_available: false,
            booking_id: booking.booking_id,
            passenger_name: booking.passenger_name,
            passenger_tier: booking.requires_wheelchair_space ? 'wheelchair' : 'standard',
            customer_id: booking.customer_id,
          };
        }
        return { ...seat, is_available: true, booking_id: undefined, passenger_name: undefined, customer_id: undefined };
      })
    );
  };

  // Get unassigned passengers (booked but no seat assigned)
  const unassignedPassengers = bookings.filter(b =>
    !b.seat_number &&
    b.booking_status !== 'cancelled' &&
    b.passenger_name.toLowerCase().includes(passengerSearch.toLowerCase())
  );

  // Get assigned passengers count
  const assignedCount = bookings.filter(b => b.seat_number && b.booking_status !== 'cancelled').length;

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, passenger: Booking) => {
    if (isLocked) {
      e.preventDefault();
      toast.error('Service is locked. Click the lock button to make changes.');
      return;
    }
    setDraggedPassenger(passenger);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, seat: Seat) => {
    e.preventDefault();

    if (isLocked) {
      toast.error('Service is locked. Click the lock button to make changes.');
      return;
    }

    if (!draggedPassenger) return;

    if (!seat.is_available) {
      toast.error('This seat is already occupied');
      return;
    }

    // Check wheelchair requirement
    if (draggedPassenger.requires_wheelchair_space && !seat.is_wheelchair_accessible) {
      toast.error('This passenger requires a wheelchair accessible seat');
      return;
    }

    try {
      // Update seat assignment via API
      await apiClient.patch(
        `/tenants/${tenant!.tenant_id}/bus/bookings/${draggedPassenger.booking_id}/seat`,
        { seat_number: seat.seat_number }
      );

      // Update local state
      const updatedBookings = bookings.map(b =>
        b.booking_id === draggedPassenger.booking_id
          ? { ...b, seat_number: seat.seat_number }
          : b
      );
      setBookings(updatedBookings);
      updateSeatsWithBookings(updatedBookings);

      toast.success(`${draggedPassenger.passenger_name} assigned to seat ${seat.seat_number}`);
    } catch (err: any) {
      console.error('Error assigning seat:', err);
      toast.error('Failed to assign seat. Please try again.');
    }

    setDraggedPassenger(null);
  };

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const handleClearSeat = async (seat: Seat) => {
    if (isLocked) {
      toast.error('Service is locked. Click the lock button to make changes.');
      return;
    }

    if (!seat.booking_id) return;

    try {
      // Clear seat assignment via API
      await apiClient.patch(
        `/tenants/${tenant!.tenant_id}/bus/bookings/${seat.booking_id}/seat`,
        { seat_number: null }
      );

      // Update local state
      const updatedBookings = bookings.map(b =>
        b.booking_id === seat.booking_id
          ? { ...b, seat_number: undefined }
          : b
      );
      setBookings(updatedBookings);
      updateSeatsWithBookings(updatedBookings);
      setSelectedSeat(null);

      toast.success('Seat assignment cleared');
    } catch (err: any) {
      console.error('Error clearing seat:', err);
      toast.error('Failed to clear seat assignment');
    }
  };

  const getSeatColor = (seat: Seat) => {
    if (!seat.is_available) {
      return seat.passenger_tier === 'wheelchair' ? '#8b5cf6' : '#3b82f6';
    }
    if (seat.is_wheelchair_accessible) {
      return '#e0e7ff';
    }
    return '#d1fae5';
  };

  const getSeatBorderColor = (seat: Seat) => {
    if (selectedSeat?.seat_number === seat.seat_number) {
      return '#f59e0b';
    }
    if (!seat.is_available) {
      return seat.passenger_tier === 'wheelchair' ? '#6d28d9' : '#2563eb';
    }
    if (seat.is_wheelchair_accessible) {
      return '#818cf8';
    }
    return '#6ee7b7';
  };

  const getRowSeats = (row: number) => {
    return {
      left: seats.filter(s => s.row === row && s.position === 'left'),
      right: seats.filter(s => s.row === row && s.position === 'right')
    };
  };

  const stats = {
    total: seats.length,
    available: seats.filter(s => s.is_available).length,
    occupied: seats.filter(s => !s.is_available).length,
    wheelchair: seats.filter(s => s.is_wheelchair_accessible).length
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header with Service Selection */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}>
            <SeatIcon size={24} />
            Seat Assignment
          </h1>

          {/* Service Selector */}
          <select
            value={selectedTimetableId || ''}
            onChange={(e) => setSelectedTimetableId(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              minWidth: '250px',
              background: 'white'
            }}
          >
            <option value="">Select a service...</option>
            {timetables.map(t => (
              <option key={t.timetable_id} value={t.timetable_id}>
                {t.service_name} - {t.route_number} ({t.departure_time})
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Lock Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {selectedTimetableId && (
            <>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {isLocked ? 'Locked' : 'Unlocked'}
              </span>
              <button
                onClick={() => setIsLocked(!isLocked)}
                style={{
                  padding: '0.5rem 1rem',
                  background: isLocked ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem'
                }}
              >
                {isLocked ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Unlock
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                    Lock
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Service Info Banner */}
      {selectedTimetable && (
        <div style={{
          padding: '0.75rem 1.5rem',
          background: '#f0f9ff',
          borderBottom: '1px solid #bae6fd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <span><strong>Route:</strong> {selectedTimetable.route_name}</span>
            <span><strong>From:</strong> {selectedTimetable.origin_point}</span>
            <span><strong>To:</strong> {selectedTimetable.destination_point}</span>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {selectedTimetable.vehicle_registration && (
              <span><strong>Vehicle:</strong> {selectedTimetable.vehicle_registration}</span>
            )}
            {selectedTimetable.driver_name && (
              <span><strong>Driver:</strong> {selectedTimetable.driver_name}</span>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!selectedTimetableId ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb'
        }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <BusIcon size={64} color="#9ca3af" />
            <h2 style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>
              Select a Service
            </h2>
            <p>Choose a service and date from the header to manage seat assignments</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar - Passenger List */}
          <div style={{
            width: '320px',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            background: 'white'
          }}>
            {/* Passenger List Header */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
                Passengers ({unassignedPassengers.length} unassigned)
              </h3>
              <input
                type="text"
                placeholder="Search passengers..."
                value={passengerSearch}
                onChange={(e) => setPassengerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Unassigned Passengers List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  Loading passengers...
                </div>
              ) : unassignedPassengers.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                  {bookings.length === 0
                    ? 'No passengers booked for this service'
                    : 'All passengers have been assigned seats'
                  }
                </div>
              ) : (
                unassignedPassengers.map(passenger => (
                  <div
                    key={passenger.booking_id}
                    draggable={!isLocked}
                    onDragStart={(e) => handleDragStart(e, passenger)}
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      background: draggedPassenger?.booking_id === passenger.booking_id ? '#dbeafe' : '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: isLocked ? 'not-allowed' : 'grab',
                      transition: 'all 0.2s',
                      opacity: isLocked ? 0.7 : 1
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      {passenger.passenger_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {passenger.boarding_stop_name} → {passenger.alighting_stop_name}
                    </div>
                    {passenger.requires_wheelchair_space && (
                      <div style={{
                        marginTop: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        background: '#f5f3ff',
                        borderRadius: '4px',
                        fontSize: '0.625rem',
                        color: '#6d28d9',
                        fontWeight: 600
                      }}>
                        <WheelchairIcon size={10} color="#6d28d9" />
                        Wheelchair
                      </div>
                    )}
                    {passenger.special_requirements && (
                      <div style={{
                        marginTop: '0.25rem',
                        fontSize: '0.625rem',
                        color: '#f59e0b',
                        fontStyle: 'italic'
                      }}>
                        Note: {passenger.special_requirements}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Stats Footer */}
            <div style={{
              padding: '1rem',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              fontSize: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Total Booked</span>
                <strong>{bookings.filter(b => b.booking_status !== 'cancelled').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#10b981' }}>Assigned</span>
                <strong style={{ color: '#10b981' }}>{assignedCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f59e0b' }}>Unassigned</span>
                <strong style={{ color: '#f59e0b' }}>{unassignedPassengers.length}</strong>
              </div>
            </div>
          </div>

          {/* Center - Bus Layout */}
          <div style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
            background: '#f9fafb'
          }}>
            <div style={{
              maxWidth: '500px',
              margin: '0 auto',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '1.5rem'
            }}>
              {/* Bus Front */}
              <div style={{
                background: 'linear-gradient(180deg, #1f2937 0%, #374151 100%)',
                borderRadius: '12px 12px 0 0',
                padding: '0.75rem',
                color: '#fff',
                textAlign: 'center',
                marginBottom: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <BusIcon size={16} color="#fff" />
                FRONT OF BUS
              </div>

              {/* Seats Layout */}
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {Array.from({ length: selectedLayout.rows }, (_, i) => i + 1).map(row => {
                  const rowSeats = getRowSeats(row);
                  return (
                    <div key={row} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                      {/* Row number */}
                      <div style={{ width: '24px', textAlign: 'center', fontSize: '0.625rem', color: '#9ca3af', fontWeight: 600 }}>
                        {row}
                      </div>

                      {/* Left seats */}
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {rowSeats.left.map(seat => (
                          <button
                            key={seat.seat_number}
                            onClick={() => handleSeatClick(seat)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, seat)}
                            style={{
                              width: '50px',
                              height: '50px',
                              background: getSeatColor(seat),
                              border: `2px solid ${getSeatBorderColor(seat)}`,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.625rem',
                              fontWeight: 600,
                              position: 'relative'
                            }}
                          >
                            <div style={{ fontSize: '0.75rem' }}>{seat.seat_number}</div>
                            {seat.is_wheelchair_accessible && seat.is_available && (
                              <WheelchairIcon size={12} color="#818cf8" />
                            )}
                            {!seat.is_available && (
                              <div style={{
                                fontSize: '0.5rem',
                                color: '#fff',
                                marginTop: '1px',
                                textAlign: 'center',
                                lineHeight: 1,
                                maxWidth: '44px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {seat.passenger_name?.split(' ')[0]}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Aisle */}
                      <div style={{
                        width: '40px',
                        height: '50px',
                        borderLeft: '1px dashed #d1d5db',
                        borderRight: '1px dashed #d1d5db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.5rem',
                        color: '#d1d5db'
                      }}>
                      </div>

                      {/* Right seats */}
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {rowSeats.right.map(seat => (
                          <button
                            key={seat.seat_number}
                            onClick={() => handleSeatClick(seat)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, seat)}
                            style={{
                              width: '50px',
                              height: '50px',
                              background: getSeatColor(seat),
                              border: `2px solid ${getSeatBorderColor(seat)}`,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.625rem',
                              fontWeight: 600
                            }}
                          >
                            <div style={{ fontSize: '0.75rem' }}>{seat.seat_number}</div>
                            {seat.is_wheelchair_accessible && seat.is_available && (
                              <WheelchairIcon size={12} color="#818cf8" />
                            )}
                            {!seat.is_available && (
                              <div style={{
                                fontSize: '0.5rem',
                                color: '#fff',
                                marginTop: '1px',
                                textAlign: 'center',
                                lineHeight: 1,
                                maxWidth: '44px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {seat.passenger_name?.split(' ')[0]}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Row number (right side) */}
                      <div style={{ width: '24px', textAlign: 'center', fontSize: '0.625rem', color: '#9ca3af', fontWeight: 600 }}>
                        {row}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bus Rear */}
              <div style={{
                background: '#f3f4f6',
                borderRadius: '0 0 12px 12px',
                padding: '0.75rem',
                textAlign: 'center',
                marginTop: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#6b7280'
              }}>
                REAR OF BUS
              </div>

              {/* Legend */}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#f9fafb',
                borderRadius: '6px',
                fontSize: '0.625rem'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '16px', height: '16px', background: '#d1fae5', border: '2px solid #6ee7b7', borderRadius: '3px' }} />
                    <span>Available</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '16px', height: '16px', background: '#3b82f6', border: '2px solid #2563eb', borderRadius: '3px' }} />
                    <span>Occupied</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '16px', height: '16px', background: '#e0e7ff', border: '2px solid #818cf8', borderRadius: '3px' }} />
                    <span>Wheelchair</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '16px', height: '16px', background: '#fff', border: '2px solid #f59e0b', borderRadius: '3px' }} />
                    <span>Selected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Seat Details */}
          <div style={{
            width: '280px',
            borderLeft: '1px solid #e5e7eb',
            padding: '1rem',
            background: 'white',
            overflowY: 'auto'
          }}>
            {selectedSeat ? (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Seat {selectedSeat.seat_number}
                </h3>

                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Status</div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px',
                      background: selectedSeat.is_available ? '#d1fae5' : '#dbeafe',
                      color: selectedSeat.is_available ? '#065f46' : '#1e40af',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {selectedSeat.is_available ? (
                        <>
                          <CheckMarkIcon size={12} color="#065f46" />
                          Available
                        </>
                      ) : (
                        <>
                          <TicketIcon size={12} color="#1e40af" />
                          Occupied
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Position</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Row {selectedSeat.row}, {selectedSeat.position === 'left' ? 'Left' : 'Right'} Side
                    </div>
                  </div>

                  {selectedSeat.is_wheelchair_accessible && (
                    <div style={{
                      padding: '0.5rem',
                      background: '#f5f3ff',
                      border: '1px solid #c4b5fd',
                      borderRadius: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6d28d9', fontWeight: 600, fontSize: '0.75rem' }}>
                        <WheelchairIcon size={14} color="#6d28d9" />
                        Wheelchair Accessible
                      </div>
                    </div>
                  )}

                  {!selectedSeat.is_available && (
                    <>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Passenger</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedSeat.passenger_name}</div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Booking ID</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          #{selectedSeat.booking_id}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {!selectedSeat.is_available && (
                  <button
                    onClick={() => handleClearSeat(selectedSeat)}
                    disabled={isLocked}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: isLocked ? '#d1d5db' : '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    {isLocked ? 'Locked' : 'Clear Seat Assignment'}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <SeatIcon size={40} color="#9ca3af" />
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                  Select a Seat
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Click any seat to view details or drag a passenger to assign
                </p>
              </div>
            )}

            {/* Layout Selector */}
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem', color: '#6b7280' }}>
                Bus Layout
              </h4>
              {LAYOUT_TEMPLATES.map(layout => (
                <button
                  key={layout.layout_id}
                  onClick={() => setSelectedLayout(layout)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    marginBottom: '0.25rem',
                    background: selectedLayout.layout_id === layout.layout_id ? '#dbeafe' : '#fff',
                    border: selectedLayout.layout_id === layout.layout_id ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{layout.layout_name}</div>
                  <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                    {layout.vehicle_capacity} seats
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
