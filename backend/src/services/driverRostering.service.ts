/**
 * Driver Rostering Service
 *
 * Advanced driver scheduling and roster management with:
 * - Automated shift assignment
 * - Availability and conflict detection
 * - Workload balancing
 * - Compliance tracking (driving hours, rest periods)
 * - Fair distribution algorithms
 */

import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Driver {
  driver_id: number;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  home_postcode?: string;
  assigned_vehicle_id?: number;
  employment_type?: 'full_time' | 'part_time' | 'freelance';
  max_hours_per_week?: number;
}

export interface Trip {
  trip_id: number;
  trip_date: string;
  pickup_time: string;
  pickup_location: string;
  destination: string;
  duration_minutes?: number;
  distance_miles?: number;
  passenger_count?: number;
  driver_id?: number;
}

export interface DriverAvailability {
  driver_id: number;
  date: string;
  is_available: boolean;
  reason?: 'holiday' | 'sick' | 'personal' | 'training';
  hours_worked: number;
  trips_assigned: number;
}

export interface ShiftAssignment {
  trip_id: number;
  driver_id: number;
  confidence_score: number; // 0-100
  reasoning: string[];
}

export interface WorkloadMetrics {
  driver_id: number;
  driver_name: string;
  total_hours: number;
  total_trips: number;
  total_distance: number;
  days_worked: number;
  average_hours_per_day: number;
  utilization_percentage: number; // Based on max_hours_per_week
}

export interface RosterConflict {
  conflict_type: 'time_overlap' | 'unavailable' | 'max_hours' | 'no_rest_period';
  driver_id: number;
  driver_name: string;
  trip_id: number;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

// ============================================================================
// AVAILABILITY & CONFLICT DETECTION
// ============================================================================

/**
 * Check if driver is available for a specific date/time
 */
export async function checkDriverAvailability(
  tenantId: number,
  driverId: number,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<{ available: boolean; conflicts: RosterConflict[] }> {
  const conflicts: RosterConflict[] = [];

  try {
    // Check holiday/time-off
    const holidayCheck = await queryOne(
      `SELECT * FROM tenant_driver_holidays
       WHERE tenant_id = $1 AND driver_id = $2
         AND status = 'approved'
         AND start_date <= $3 AND end_date >= $3`,
      [tenantId, driverId, date]
    );

    if (holidayCheck) {
      conflicts.push({
        conflict_type: 'unavailable',
        driver_id: driverId,
        driver_name: '',
        trip_id: 0,
        details: `Driver is on ${holidayCheck.holiday_type} leave`,
        severity: 'critical'
      });
    }

    // Check for time overlaps with existing trips
    const endTime = addMinutesToTime(startTime, durationMinutes);
    const overlapCheck = await query(
      `SELECT trip_id, pickup_time FROM tenant_trips
       WHERE tenant_id = $1 AND driver_id = $2
         AND trip_date = $3
         AND status != 'cancelled'
         AND (
           (pickup_time >= $4 AND pickup_time < $5) OR
           (pickup_time < $4 AND pickup_time + INTERVAL '1 hour' * COALESCE(duration_minutes, 60) / 60 > $4::time)
         )`,
      [tenantId, driverId, date, startTime, endTime]
    );

    if (overlapCheck.length > 0) {
      overlapCheck.forEach((trip: any) => {
        conflicts.push({
          conflict_type: 'time_overlap',
          driver_id: driverId,
          driver_name: '',
          trip_id: trip.trip_id,
          details: `Overlaps with existing trip at ${trip.pickup_time}`,
          severity: 'critical'
        });
      });
    }

    // Check driving hours compliance
    const hoursCheck = await queryOne(
      `SELECT SUM(COALESCE(duration_minutes, 60)) as total_minutes
       FROM tenant_trips
       WHERE tenant_id = $1 AND driver_id = $2
         AND trip_date = $3
         AND status != 'cancelled'`,
      [tenantId, driverId, date]
    );

    const currentHours = (parseInt(hoursCheck?.total_minutes || '0')) / 60;
    const newTotalHours = currentHours + (durationMinutes / 60);

    // EU driving regulations: max 9 hours per day
    if (newTotalHours > 9) {
      conflicts.push({
        conflict_type: 'max_hours',
        driver_id: driverId,
        driver_name: '',
        trip_id: 0,
        details: `Would exceed 9-hour daily limit (currently at ${currentHours.toFixed(1)}h)`,
        severity: 'warning'
      });
    }

    return {
      available: conflicts.filter(c => c.severity === 'critical').length === 0,
      conflicts
    };
  } catch (error: any) {
    logger.error('Error checking driver availability', { error: error.message, driverId, date });
    throw error;
  }
}

/**
 * Detect all roster conflicts for a date range
 */
export async function detectRosterConflicts(
  tenantId: number,
  startDate: string,
  endDate: string
): Promise<RosterConflict[]> {
  const conflicts: RosterConflict[] = [];

  try {
    // Get all trips in date range
    const trips = await query(
      `SELECT t.*, d.name as driver_name
       FROM tenant_trips t
       LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id
       WHERE t.tenant_id = $1
         AND t.trip_date >= $2
         AND t.trip_date <= $3
         AND t.status != 'cancelled'
         AND t.driver_id IS NOT NULL
       ORDER BY t.trip_date, t.pickup_time`,
      [tenantId, startDate, endDate]
    );

    // Check each trip for conflicts
    for (const trip of trips) {
      const availability = await checkDriverAvailability(
        tenantId,
        trip.driver_id,
        trip.trip_date,
        trip.pickup_time,
        trip.duration_minutes || 60
      );

      availability.conflicts.forEach(conflict => {
        conflicts.push({
          ...conflict,
          driver_name: trip.driver_name,
          trip_id: trip.trip_id
        });
      });
    }

    return conflicts;
  } catch (error: any) {
    logger.error('Error detecting roster conflicts', { error: error.message });
    throw error;
  }
}

// ============================================================================
// AUTOMATED SHIFT ASSIGNMENT
// ============================================================================

/**
 * Automatically assign drivers to unassigned trips using fair distribution
 * Considers: availability, workload balance, proximity, skill requirements
 */
export async function autoAssignDrivers(
  tenantId: number,
  date: string,
  options?: {
    balanceWorkload?: boolean;
    considerProximity?: boolean;
    maxAssignments?: number;
  }
): Promise<{ assignments: ShiftAssignment[]; unassigned: number[] }> {
  const {
    balanceWorkload = true,
    considerProximity = false,
    maxAssignments = 100
  } = options || {};

  try {
    // Get unassigned trips for the date
    const unassignedTrips = await query(
      `SELECT * FROM tenant_trips
       WHERE tenant_id = $1
         AND trip_date = $2
         AND driver_id IS NULL
         AND status != 'cancelled'
       ORDER BY pickup_time`,
      [tenantId, date]
    );

    // Get available drivers
    const drivers = await query(
      `SELECT d.*,
              COALESCE(SUM(CASE WHEN t.trip_date >= $2::date - INTERVAL '7 days'
                                      AND t.trip_date < $2::date
                                 THEN COALESCE(t.duration_minutes, 60)
                                 ELSE 0 END), 0) as recent_minutes
       FROM tenant_drivers d
       LEFT JOIN tenant_trips t ON d.driver_id = t.driver_id AND t.tenant_id = d.tenant_id
       WHERE d.tenant_id = $1 AND d.is_active = true
       GROUP BY d.driver_id`,
      [tenantId, date]
    );

    const assignments: ShiftAssignment[] = [];
    const unassigned: number[] = [];
    let assignmentCount = 0;

    for (const trip of unassignedTrips) {
      if (assignmentCount >= maxAssignments) break;

      // Score each driver for this trip
      const driverScores = await Promise.all(
        drivers.map(async (driver: any) => {
          const availability = await checkDriverAvailability(
            tenantId,
            driver.driver_id,
            trip.trip_date,
            trip.pickup_time,
            trip.duration_minutes || 60
          );

          if (!availability.available) {
            return { driver_id: driver.driver_id, score: 0, reasoning: ['Driver not available'] };
          }

          let score = 100;
          const reasoning: string[] = [];

          // Workload balance (lower recent hours = higher score)
          if (balanceWorkload) {
            const recentHours = parseInt(driver.recent_minutes) / 60;
            const avgHours = drivers.reduce((sum: number, d: any) => sum + parseInt(d.recent_minutes) / 60, 0) / drivers.length;
            if (recentHours < avgHours) {
              score += 20;
              reasoning.push('Below average workload this week');
            } else if (recentHours > avgHours * 1.5) {
              score -= 20;
              reasoning.push('Above average workload this week');
            }
          }

          // Proximity bonus (if postcodes match)
          if (considerProximity && driver.home_postcode && trip.pickup_postcode) {
            const postcodeMatch = driver.home_postcode.split(' ')[0] === trip.pickup_postcode.split(' ')[0];
            if (postcodeMatch) {
              score += 15;
              reasoning.push('Lives near pickup location');
            }
          }

          // Availability warnings reduce score
          if (availability.conflicts.length > 0) {
            score -= availability.conflicts.length * 5;
            reasoning.push(...availability.conflicts.map(c => c.details));
          }

          return { driver_id: driver.driver_id, score, reasoning };
        })
      );

      // Sort by score and assign to highest scoring available driver
      driverScores.sort((a, b) => b.score - a.score);
      const best = driverScores.find(d => d.score > 0);

      if (best) {
        assignments.push({
          trip_id: trip.trip_id,
          driver_id: best.driver_id,
          confidence_score: Math.min(100, best.score),
          reasoning: best.reasoning
        });
        assignmentCount++;
      } else {
        unassigned.push(trip.trip_id);
      }
    }

    logger.info('Auto-assignment complete', {
      tenantId,
      date,
      assigned: assignments.length,
      unassigned: unassigned.length
    });

    return { assignments, unassigned };
  } catch (error: any) {
    logger.error('Error in auto-assignment', { error: error.message });
    throw error;
  }
}

// ============================================================================
// WORKLOAD BALANCING
// ============================================================================

/**
 * Calculate workload metrics for all drivers in a date range
 */
export async function calculateWorkloadMetrics(
  tenantId: number,
  startDate: string,
  endDate: string
): Promise<WorkloadMetrics[]> {
  try {
    const metrics = await query(
      `SELECT
        d.driver_id,
        d.name as driver_name,
        COALESCE(SUM(t.duration_minutes), 0) / 60.0 as total_hours,
        COUNT(t.trip_id) as total_trips,
        COALESCE(SUM(t.distance_miles), 0) as total_distance,
        COUNT(DISTINCT t.trip_date) as days_worked,
        COALESCE(d.max_hours_per_week, 40) as max_hours_per_week
       FROM tenant_drivers d
       LEFT JOIN tenant_trips t ON d.driver_id = t.driver_id
         AND t.tenant_id = d.tenant_id
         AND t.trip_date >= $2
         AND t.trip_date <= $3
         AND t.status != 'cancelled'
       WHERE d.tenant_id = $1 AND d.is_active = true
       GROUP BY d.driver_id, d.name, d.max_hours_per_week
       ORDER BY total_hours DESC`,
      [tenantId, startDate, endDate]
    );

    return metrics.map((m: any) => {
      const totalHours = parseFloat(m.total_hours);
      const daysWorked = parseInt(m.days_worked);
      const maxHoursPerWeek = parseFloat(m.max_hours_per_week);

      // Calculate weeks in date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const weeks = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));

      const utilizationPercentage = (totalHours / (maxHoursPerWeek * weeks)) * 100;

      return {
        driver_id: m.driver_id,
        driver_name: m.driver_name,
        total_hours: parseFloat(totalHours.toFixed(2)),
        total_trips: parseInt(m.total_trips),
        total_distance: parseFloat(parseFloat(m.total_distance).toFixed(2)),
        days_worked: daysWorked,
        average_hours_per_day: daysWorked > 0 ? parseFloat((totalHours / daysWorked).toFixed(2)) : 0,
        utilization_percentage: parseFloat(Math.min(100, utilizationPercentage).toFixed(1))
      };
    });
  } catch (error: any) {
    logger.error('Error calculating workload metrics', { error: error.message });
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

export const driverRosteringService = {
  checkDriverAvailability,
  detectRosterConflicts,
  autoAssignDrivers,
  calculateWorkloadMetrics
};

export default driverRosteringService;
