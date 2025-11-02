import { Customer, WeeklySchedule, DaySchedule } from '../../types';
import './WeeklyScheduleDisplay.css';

interface WeeklyScheduleDisplayProps {
  customer: Customer;
}

/**
 * Weekly Schedule Display - Matching Legacy Design
 *
 * Shows 7-day indicator boxes:
 * - Green: Service with times set
 * - Yellow: Service but times missing
 * - Gray: No service
 */
function WeeklyScheduleDisplay({ customer }: WeeklyScheduleDisplayProps) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayKeys: (keyof WeeklySchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Parse schedule from customer data
  const schedule: WeeklySchedule = (customer.schedule as WeeklySchedule) || {};

  // Count active days
  let activeDays = 0;
  dayKeys.forEach(dayKey => {
    const daySchedule = schedule[dayKey] as DaySchedule;
    if (daySchedule?.enabled) {
      activeDays++;
    }
  });

  return (
    <div className="weekly-schedule">
      <div className="day-indicators">
        {days.map((day, index) => {
          const dayKey = dayKeys[index];
          const daySchedule = schedule[dayKey] as DaySchedule;

          let status = 'no-service'; // Gray
          if (daySchedule?.enabled) {
            if (daySchedule.pickupTime || daySchedule.returnTime) {
              status = 'times-set'; // Green
            } else {
              status = 'times-missing'; // Yellow
            }
          }

          return (
            <div key={index} className={`day-box day-${status}`}>
              {day}
            </div>
          );
        })}
      </div>
      <div className="schedule-summary">
        {activeDays} day{activeDays !== 1 ? 's' : ''}/week
      </div>
      <div className="schedule-legend">
        <span className="legend-item">
          <span className="legend-color legend-green"></span> Times set
        </span>
        <span className="legend-item">
          <span className="legend-color legend-yellow"></span> Times missing
        </span>
      </div>
    </div>
  );
}

export default WeeklyScheduleDisplay;
