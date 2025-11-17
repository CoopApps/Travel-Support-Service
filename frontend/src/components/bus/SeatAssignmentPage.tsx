import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { WheelchairIcon } from '../icons/BusIcons';

/**
 * Seat Assignment & Bus Layout Module
 *
 * Visual interface for managing bus seating arrangements:
 * - Interactive bus layout with drag-and-drop seat assignment
 * - Wheelchair-accessible seat marking
 * - Seat availability visualization
 * - Multiple layout templates (16-seater, 24-seater, 32-seater)
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
}

interface BusLayout {
  layout_id: number;
  layout_name: string;
  vehicle_capacity: number;
  rows: number;
  seats_per_row: number;
  wheelchair_seats: number;
  configuration: string; // '2-2' or '2-1' or '3-2'
}

const LAYOUT_TEMPLATES: BusLayout[] = [
  {
    layout_id: 1,
    layout_name: '16-Seater Minibus',
    vehicle_capacity: 16,
    rows: 6,
    seats_per_row: 4,
    wheelchair_seats: 2,
    configuration: '2-2' // 2 seats | aisle | 2 seats
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

  const [selectedLayout, setSelectedLayout] = useState<BusLayout>(LAYOUT_TEMPLATES[0]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [timetableId, setTimetableId] = useState<string>('');
  const [availableTimetables, setAvailableTimetables] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate seat layout based on selected template
  useEffect(() => {
    generateSeats(selectedLayout);
  }, [selectedLayout]);

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

  // Load bookings when timetable is selected
  useEffect(() => {
    if (timetableId && tenant?.tenant_id) {
      loadBookingsForTimetable();
    }
  }, [timetableId, tenant?.tenant_id]);

  const loadBookingsForTimetable = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `/api/tenants/${tenant!.tenant_id}/bus-bookings?timetable_id=${timetableId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to load bookings');

      const data = await response.json();
      setBookings(data);

      // Update seat assignments
      const updatedSeats = seats.map(seat => {
        const booking = data.find((b: any) => b.seat_number === seat.seat_number);
        if (booking) {
          return {
            ...seat,
            is_available: false,
            booking_id: booking.booking_id,
            passenger_name: booking.passenger_name,
            passenger_tier: booking.passenger_tier,
          };
        }
        return { ...seat, is_available: true, booking_id: undefined, passenger_name: undefined };
      });

      setSeats(updatedSeats);
    } catch (err: any) {
      console.error('Error loading bookings:', err);
      toast.error('Failed to load seat assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const getSeatColor = (seat: Seat) => {
    if (!seat.is_available) {
      return seat.passenger_tier === 'wheelchair' ? '#8b5cf6' : '#3b82f6'; // Occupied
    }
    if (seat.is_wheelchair_accessible) {
      return '#e0e7ff'; // Wheelchair accessible - light purple
    }
    return '#d1fae5'; // Available - light green
  };

  const getSeatBorderColor = (seat: Seat) => {
    if (selectedSeat?.seat_number === seat.seat_number) {
      return '#f59e0b'; // Selected - orange
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
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          💺 Seat Assignment & Bus Layout
        </h1>
        <p style={{ color: '#6b7280' }}>
          Visual bus layout for managing seat assignments and passenger placement
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 350px', gap: '1.5rem' }}>
        {/* Left Panel - Layout Selection & Stats */}
        <div>
          {/* Layout Template Selector */}
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Bus Layout Template
            </h3>
            {LAYOUT_TEMPLATES.map(layout => (
              <button
                key={layout.layout_id}
                onClick={() => setSelectedLayout(layout)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: selectedLayout.layout_id === layout.layout_id ? '#dbeafe' : '#fff',
                  border: selectedLayout.layout_id === layout.layout_id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{layout.layout_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {layout.vehicle_capacity} seats • {layout.configuration} layout
                </div>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Seat Statistics
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Seats</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#10b981' }}>Available</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{stats.available}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#3b82f6' }}>Occupied</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>{stats.occupied}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#8b5cf6' }}>Wheelchair</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>{stats.wheelchair}</span>
              </div>
            </div>

            {/* Occupancy Progress */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Occupancy: {Math.round((stats.occupied / stats.total) * 100)}%
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(stats.occupied / stats.total) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1.5rem',
            fontSize: '0.75rem'
          }}>
            <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Legend</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '20px', background: '#d1fae5', border: '2px solid #6ee7b7', borderRadius: '4px' }} />
                <span>Available</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '20px', background: '#3b82f6', border: '2px solid #2563eb', borderRadius: '4px' }} />
                <span>Occupied</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '20px', background: '#e0e7ff', border: '2px solid #818cf8', borderRadius: '4px' }} />
                <span>Wheelchair Accessible</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '20px', background: '#fff', border: '3px solid #f59e0b', borderRadius: '4px' }} />
                <span>Selected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Bus Layout Visualization */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '2rem',
          minHeight: '700px'
        }}>
          {/* Bus Front */}
          <div style={{
            background: 'linear-gradient(180deg, #1f2937 0%, #374151 100%)',
            borderRadius: '12px 12px 0 0',
            padding: '1rem',
            color: '#fff',
            textAlign: 'center',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            🚌 FRONT OF BUS (Driver)
          </div>

          {/* Seats Layout */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Array.from({ length: selectedLayout.rows }, (_, i) => i + 1).map(row => {
              const rowSeats = getRowSeats(row);
              return (
                <div key={row} style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
                  {/* Row number */}
                  <div style={{ width: '30px', textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>
                    {row}
                  </div>

                  {/* Left seats */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {rowSeats.left.map(seat => (
                      <button
                        key={seat.seat_number}
                        onClick={() => handleSeatClick(seat)}
                        style={{
                          width: '65px',
                          height: '65px',
                          background: getSeatColor(seat),
                          border: `3px solid ${getSeatBorderColor(seat)}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          position: 'relative'
                        }}
                      >
                        <div style={{ fontSize: '0.875rem' }}>{seat.seat_number}</div>
                        {seat.is_wheelchair_accessible && (
                          <div style={{ fontSize: '1rem' }}>
                            <WheelchairIcon size={16} color="#fff" />
                          </div>
                        )}
                        {!seat.is_available && (
                          <div style={{ fontSize: '0.625rem', color: '#fff', marginTop: '2px', textAlign: 'center', lineHeight: 1.2 }}>
                            {seat.passenger_name?.split(' ')[0]}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Aisle */}
                  <div style={{
                    width: '60px',
                    height: '65px',
                    borderLeft: '2px dashed #d1d5db',
                    borderRight: '2px dashed #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    color: '#9ca3af'
                  }}>
                    AISLE
                  </div>

                  {/* Right seats */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {rowSeats.right.map(seat => (
                      <button
                        key={seat.seat_number}
                        onClick={() => handleSeatClick(seat)}
                        style={{
                          width: '65px',
                          height: '65px',
                          background: getSeatColor(seat),
                          border: `3px solid ${getSeatBorderColor(seat)}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        <div style={{ fontSize: '0.875rem' }}>{seat.seat_number}</div>
                        {!seat.is_available && (
                          <div style={{ fontSize: '0.625rem', color: '#fff', marginTop: '2px', textAlign: 'center', lineHeight: 1.2 }}>
                            {seat.passenger_name?.split(' ')[0]}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Row number (right side) */}
                  <div style={{ width: '30px', textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>
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
            padding: '1rem',
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#6b7280'
          }}>
            REAR OF BUS (Exit/Emergency Door)
          </div>
        </div>

        {/* Right Panel - Seat Details & Actions */}
        <div>
          {selectedSeat ? (
            <div style={{
              background: '#fff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                Seat {selectedSeat.seat_number}
              </h3>

              <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Status</div>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '9999px',
                    background: selectedSeat.is_available ? '#d1fae5' : '#dbeafe',
                    color: selectedSeat.is_available ? '#065f46' : '#1e40af',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    {selectedSeat.is_available ? '✓ Available' : '🎫 Occupied'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Position</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    Row {selectedSeat.row}, {selectedSeat.position === 'left' ? 'Left Side' : 'Right Side'}
                  </div>
                </div>

                {selectedSeat.is_wheelchair_accessible && (
                  <div style={{
                    padding: '0.75rem',
                    background: '#f5f3ff',
                    border: '1px solid #c4b5fd',
                    borderRadius: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6d28d9', fontWeight: 600, fontSize: '0.875rem' }}>
                      <WheelchairIcon size={16} color="#6d28d9" />
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
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Passenger Type</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize' }}>
                        {selectedSeat.passenger_tier?.replace('_', ' ')}
                      </div>
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
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                  onClick={() => {
                    toast.success('Seat cleared (demo)');
                    // In production, call API to remove booking
                  }}
                >
                  Clear Seat Assignment
                </button>
              )}
            </div>
          ) : (
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💺</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Select a Seat
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Click any seat on the bus layout to view details and manage assignments
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
