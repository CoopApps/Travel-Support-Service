import React, { useState, useEffect } from 'react';
import { HolidayRequest } from '../../types/holiday.types';
import { getHolidayCalendar } from '../../services/holidaysApi';
import { useTenant } from '../../context/TenantContext';

interface HolidayCalendarProps {
  onViewRequest: (requestId: number) => void;
}

const HolidayCalendar: React.FC<HolidayCalendarProps> = ({ onViewRequest }) => {
  const { tenantId } = useTenant();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [holidays, setHolidays] = useState<HolidayRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    loadCalendarData();
  }, [currentYear, currentMonth, tenantId]);

  const loadCalendarData = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const data = await getHolidayCalendar(tenantId, currentYear, currentMonth + 1);
      setHolidays((data as any).holidays || data || []);
    } catch {
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const getHolidaysForDate = (date: string): HolidayRequest[] => {
    return holidays.filter(holiday => {
      const holidayStart = new Date(holiday.start_date);
      const holidayEnd = new Date(holiday.end_date);
      const currentDate = new Date(date);

      return currentDate >= holidayStart && currentDate <= holidayEnd;
    });
  };

  const isToday = (year: number, month: number, day: number): boolean => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const getStatusBadgeColor = (status: string): { bg: string; text: string } => {
    const colors: Record<string, { bg: string; text: string }> = {
      approved: { bg: '#28a745', text: '#fff' },
      pending: { bg: '#ffc107', text: '#000' },
      cancelled: { bg: '#6c757d', text: '#fff' },
      rejected: { bg: '#dc3545', text: '#fff' }
    };
    return colors[status] || { bg: '#6c757d', text: '#fff' };
  };

  const getStatusIcon = (status: string): JSX.Element => {
    const icons: Record<string, string> = {
      approved: '',
      pending: '',
      cancelled: '',
      rejected: ''
    };
    return icons[status] || '•';
  };

  const renderCalendarGrid = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          style={{
            background: 'var(--gray-50)',
            padding: '10px',
            minHeight: '100px'
          }}
        />
      );
    }

    // Calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holidaysOnDay = getHolidaysForDate(date);
      const today = isToday(currentYear, currentMonth, day);
      const dayOfWeek = (firstDay + day - 1) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const bgColor = today ? '#e3f2fd' : isWeekend ? 'var(--gray-50)' : 'white';
      const textColor = today ? '#1976d2' : 'var(--gray-900)';
      const fontWeight = today ? 'bold' : 'normal';

      cells.push(
        <div
          key={day}
          style={{
            background: bgColor,
            padding: '10px',
            minHeight: '100px',
            position: 'relative',
            borderRight: '1px solid var(--gray-200)',
            borderBottom: '1px solid var(--gray-200)'
          }}
        >
          <div style={{ fontWeight, marginBottom: '5px', color: textColor }}>
            {day}
          </div>
          <div style={{ fontSize: '11px' }}>
            {holidaysOnDay.map((holiday) => {
              const colors = getStatusBadgeColor(holiday.status);
              const icon = getStatusIcon(holiday.status);
              const name = holiday.driver_name || holiday.customer_name || 'Unknown';

              return (
                <div
                  key={holiday.request_id}
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    padding: '3px 5px',
                    margin: '2px 0',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  onClick={() => onViewRequest(holiday.request_id)}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                  title={`${name} - ${holiday.type || 'Holiday'} (${holiday.status})`}
                >
                  <span style={{ fontSize: '9px' }}>{icon}</span>
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return cells;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Calendar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn btn-sm btn-primary" onClick={() => navigateMonth(-1)}>
          ← Previous
        </button>
        <h3 style={{ margin: 0 }}>
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <button className="btn btn-sm btn-primary" onClick={() => navigateMonth(1)}>
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '1px',
          background: 'var(--gray-300)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        {/* Day Headers */}
        {dayHeaders.map((day) => (
          <div
            key={day}
            style={{
              background: 'var(--gray-100)',
              padding: '12px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: 'var(--gray-700)'
            }}
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {renderCalendarGrid()}
      </div>


    </div>
  );
};

export default HolidayCalendar;
