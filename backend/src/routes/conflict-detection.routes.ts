import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Enhanced Conflict Detection Route
 *
 * POST /api/tenants/:tenantId/check-conflicts
 *
 * Checks for multiple types of conflicts before trip assignment:
 * - Vehicle MOT expiry
 * - Driver work hours/rest requirements
 * - Customer preferences (preferred/blocked drivers)
 * - Wheelchair requirements vs vehicle capabilities
 * - Time conflicts
 * - Driver certifications/availability
 *
 * Returns:
 * - List of critical conflicts (must prevent trip creation)
 * - List of warnings (should warn user but allow creation)
 */

interface ConflictCheckRequest {
  driverId?: number;
  vehicleId?: number;
  customerId: number;
  tripDate: string;
  pickupTime: string;
  returnTime?: string;
  requiresWheelchair?: boolean;
}

interface Conflict {
  type: 'critical' | 'warning';
  category: 'vehicle' | 'driver' | 'customer' | 'scheduling';
  message: string;
  details?: any;
}

router.post(
  '/tenants/:tenantId/check-conflicts',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const {
      driverId,
      vehicleId,
      customerId,
      tripDate,
      pickupTime,
      returnTime,
      requiresWheelchair
    } = req.body as ConflictCheckRequest;

    const conflicts: Conflict[] = [];

    // 1. Vehicle MOT Expiry Check
    if (vehicleId) {
      const vehicleResult = await query(
        `SELECT
          v.vehicle_id,
          v.registration,
          v.mot_expiry_date,
          v.insurance_expiry_date,
          v.is_active,
          v.wheelchair_accessible,
          v.seats
        FROM tenant_vehicles v
        WHERE v.tenant_id = $1 AND v.vehicle_id = $2`,
        [tenantId, vehicleId]
      );

      if (vehicleResult.length > 0) {
        const vehicle = vehicleResult[0];

        // Check if vehicle is active
        if (!vehicle.is_active) {
          conflicts.push({
            type: 'critical',
            category: 'vehicle',
            message: `Vehicle ${vehicle.registration} is marked as inactive and cannot be assigned.`,
            details: { vehicleId, registration: vehicle.registration }
          });
        }

        // Check MOT expiry
        if (vehicle.mot_expiry_date) {
          const motExpiryDate = new Date(vehicle.mot_expiry_date);
          const tripDateObj = new Date(tripDate);

          if (tripDateObj > motExpiryDate) {
            conflicts.push({
              type: 'critical',
              category: 'vehicle',
              message: `Vehicle ${vehicle.registration} MOT expires on ${motExpiryDate.toISOString().split('T')[0]}. Cannot be used for this trip.`,
              details: { vehicleId, registration: vehicle.registration, motExpiryDate: vehicle.mot_expiry_date }
            });
          } else {
            // Warning if MOT expires within 7 days
            const daysUntilExpiry = Math.floor((motExpiryDate.getTime() - tripDateObj.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 7) {
              conflicts.push({
                type: 'warning',
                category: 'vehicle',
                message: `Vehicle ${vehicle.registration} MOT expires in ${daysUntilExpiry} days (${motExpiryDate.toISOString().split('T')[0]}).`,
                details: { vehicleId, registration: vehicle.registration, motExpiryDate: vehicle.mot_expiry_date, daysUntilExpiry }
              });
            }
          }
        }

        // Check insurance expiry
        if (vehicle.insurance_expiry_date) {
          const insuranceExpiryDate = new Date(vehicle.insurance_expiry_date);
          const tripDateObj = new Date(tripDate);

          if (tripDateObj > insuranceExpiryDate) {
            conflicts.push({
              type: 'critical',
              category: 'vehicle',
              message: `Vehicle ${vehicle.registration} insurance expires on ${insuranceExpiryDate.toISOString().split('T')[0]}. Cannot be used for this trip.`,
              details: { vehicleId, registration: vehicle.registration, insuranceExpiryDate: vehicle.insurance_expiry_date }
            });
          }
        }

        // Check wheelchair accessibility
        if (requiresWheelchair && !vehicle.wheelchair_accessible) {
          conflicts.push({
            type: 'critical',
            category: 'vehicle',
            message: `Customer requires wheelchair access, but vehicle ${vehicle.registration} is not wheelchair accessible.`,
            details: { vehicleId, registration: vehicle.registration, wheelchairAccessible: vehicle.wheelchair_accessible }
          });
        }
      }
    }

    // 2. Driver Availability and Work Hours Check
    if (driverId) {
      const driverResult = await query(
        `SELECT
          d.driver_id,
          d.name,
          d.phone,
          d.is_active,
          d.current_vehicle_id,
          d.license_expiry_date
        FROM tenant_drivers d
        WHERE d.tenant_id = $1 AND d.driver_id = $2`,
        [tenantId, driverId]
      );

      if (driverResult.length > 0) {
        const driver = driverResult[0];

        // Check if driver is active
        if (!driver.is_active) {
          conflicts.push({
            type: 'critical',
            category: 'driver',
            message: `Driver ${driver.name} is marked as inactive and cannot be assigned.`,
            details: { driverId, driverName: driver.name }
          });
        }

        // Check license expiry
        if (driver.license_expiry_date) {
          const licenseExpiryDate = new Date(driver.license_expiry_date);
          const tripDateObj = new Date(tripDate);

          if (tripDateObj > licenseExpiryDate) {
            conflicts.push({
              type: 'critical',
              category: 'driver',
              message: `Driver ${driver.name}'s license expires on ${licenseExpiryDate.toISOString().split('T')[0]}. Cannot be assigned to this trip.`,
              details: { driverId, driverName: driver.name, licenseExpiryDate: driver.license_expiry_date }
            });
          }
        }

        // Check for time conflicts (existing trips)
        const conflictingTripsResult = await query(
          `SELECT
            t.trip_id,
            t.pickup_time,
            t.return_time,
            t.pickup_location,
            t.destination,
            c.first_name || ' ' || c.last_name as customer_name
          FROM tenant_trips t
          LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id
          WHERE t.tenant_id = $1
            AND t.driver_id = $2
            AND t.trip_date = $3
            AND t.status NOT IN ('cancelled', 'completed')
            AND (
              ($4::time BETWEEN t.pickup_time AND COALESCE(t.return_time, (t.pickup_time::time + interval '2 hours')::time))
              OR ($5::time BETWEEN t.pickup_time AND COALESCE(t.return_time, (t.pickup_time::time + interval '2 hours')::time))
              OR (t.pickup_time BETWEEN $4::time AND $5::time)
            )`,
          [tenantId, driverId, tripDate, pickupTime, returnTime || pickupTime]
        );

        if (conflictingTripsResult.length > 0) {
          conflictingTripsResult.forEach((trip: any) => {
            conflicts.push({
              type: 'critical',
              category: 'scheduling',
              message: `Driver ${driver.name} already has a trip scheduled with ${trip.customer_name} from ${trip.pickup_time} to ${trip.return_time || 'TBD'}.`,
              details: {
                driverId,
                driverName: driver.name,
                conflictingTripId: trip.trip_id,
                conflictingTripTime: `${trip.pickup_time} - ${trip.return_time || 'TBD'}`,
                conflictingCustomer: trip.customer_name
              }
            });
          });
        }

        // Check daily work hours (should not exceed 10 hours)
        const dailyHoursResult = await query(
          `SELECT
            COUNT(*) as trip_count,
            SUM(
              EXTRACT(EPOCH FROM (
                COALESCE(t.return_time, (t.pickup_time::time + interval '2 hours')::time) - t.pickup_time::time
              )) / 3600
            ) as total_hours
          FROM tenant_trips t
          WHERE t.tenant_id = $1
            AND t.driver_id = $2
            AND t.trip_date = $3
            AND t.status NOT IN ('cancelled')`,
          [tenantId, driverId, tripDate]
        );

        if (dailyHoursResult.length > 0) {
          const { trip_count, total_hours } = dailyHoursResult[0];

          // Estimate trip duration (if no return time, assume 2 hours)
          const estimatedTripDuration = returnTime
            ? (new Date(`2000-01-01 ${returnTime}`).getTime() - new Date(`2000-01-01 ${pickupTime}`).getTime()) / (1000 * 60 * 60)
            : 2;

          const totalHoursWithNewTrip = (parseFloat(total_hours) || 0) + estimatedTripDuration;

          if (totalHoursWithNewTrip > 10) {
            conflicts.push({
              type: 'warning',
              category: 'driver',
              message: `Driver ${driver.name} will have ${totalHoursWithNewTrip.toFixed(1)} hours of work on ${tripDate}, exceeding the recommended 10-hour limit.`,
              details: {
                driverId,
                driverName: driver.name,
                currentHours: parseFloat(total_hours) || 0,
                newTripHours: estimatedTripDuration,
                totalHours: totalHoursWithNewTrip,
                tripCount: parseInt(trip_count) + 1
              }
            });
          } else if (totalHoursWithNewTrip > 8) {
            conflicts.push({
              type: 'warning',
              category: 'driver',
              message: `Driver ${driver.name} will have ${totalHoursWithNewTrip.toFixed(1)} hours of work on ${tripDate}.`,
              details: {
                driverId,
                driverName: driver.name,
                totalHours: totalHoursWithNewTrip,
                tripCount: parseInt(trip_count) + 1
              }
            });
          }
        }

        // Check if driver has a vehicle assigned
        if (!driver.current_vehicle_id && !vehicleId) {
          conflicts.push({
            type: 'warning',
            category: 'driver',
            message: `Driver ${driver.name} does not have a vehicle assigned. Please assign a vehicle to this trip.`,
            details: { driverId, driverName: driver.name }
          });
        }
      }
    }

    // 3. Customer Preferences Check (if preferences exist)
    const customerResult = await query(
      `SELECT
        c.customer_id,
        c.first_name,
        c.last_name,
        c.mobility_requirements,
        c.preferred_driver_id,
        c.blocked_driver_ids,
        c.notes
      FROM tenant_customers c
      WHERE c.tenant_id = $1 AND c.customer_id = $2`,
      [tenantId, customerId]
    );

    if (customerResult.length > 0) {
      const customer = customerResult[0];
      const customerName = `${customer.first_name} ${customer.last_name}`;

      // Check if customer has wheelchair requirements
      if (customer.mobility_requirements && customer.mobility_requirements.toLowerCase().includes('wheelchair')) {
        if (!requiresWheelchair) {
          conflicts.push({
            type: 'warning',
            category: 'customer',
            message: `${customerName} has wheelchair requirements noted in their profile, but this trip is not marked as requiring wheelchair access.`,
            details: { customerId, customerName, mobilityRequirements: customer.mobility_requirements }
          });
        }
      }

      // Check preferred driver
      if (driverId && customer.preferred_driver_id && customer.preferred_driver_id !== driverId) {
        const preferredDriverResult = await query(
          `SELECT name FROM tenant_drivers WHERE tenant_id = $1 AND driver_id = $2`,
          [tenantId, customer.preferred_driver_id]
        );

        if (preferredDriverResult.length > 0) {
          conflicts.push({
            type: 'warning',
            category: 'customer',
            message: `${customerName} prefers driver ${preferredDriverResult[0].name}, but is being assigned to a different driver.`,
            details: {
              customerId,
              customerName,
              preferredDriverId: customer.preferred_driver_id,
              preferredDriverName: preferredDriverResult[0].name,
              assignedDriverId: driverId
            }
          });
        }
      }

      // Check blocked drivers
      if (driverId && customer.blocked_driver_ids && Array.isArray(customer.blocked_driver_ids)) {
        if (customer.blocked_driver_ids.includes(driverId)) {
          const blockedDriverResult = await query(
            `SELECT name FROM tenant_drivers WHERE tenant_id = $1 AND driver_id = $2`,
            [tenantId, driverId]
          );

          if (blockedDriverResult.length > 0) {
            conflicts.push({
              type: 'critical',
              category: 'customer',
              message: `${customerName} has requested not to be assigned to driver ${blockedDriverResult[0].name}.`,
              details: {
                customerId,
                customerName,
                blockedDriverId: driverId,
                blockedDriverName: blockedDriverResult[0].name
              }
            });
          }
        }
      }
    }

    // 4. Vehicle-Driver Match Check
    if (driverId && vehicleId) {
      const driverVehicleResult = await query(
        `SELECT
          d.current_vehicle_id,
          d.name as driver_name,
          v.registration as current_vehicle_reg
        FROM tenant_drivers d
        LEFT JOIN tenant_vehicles v ON d.current_vehicle_id = v.vehicle_id
        WHERE d.tenant_id = $1 AND d.driver_id = $2`,
        [tenantId, driverId]
      );

      if (driverVehicleResult.length > 0) {
        const driverVehicle = driverVehicleResult[0];

        if (driverVehicle.current_vehicle_id && driverVehicle.current_vehicle_id !== vehicleId) {
          const assignedVehicleResult = await query(
            `SELECT registration FROM tenant_vehicles WHERE tenant_id = $1 AND vehicle_id = $2`,
            [tenantId, vehicleId]
          );

          if (assignedVehicleResult.length > 0) {
            conflicts.push({
              type: 'warning',
              category: 'driver',
              message: `Driver ${driverVehicle.driver_name} is usually assigned to vehicle ${driverVehicle.current_vehicle_reg}, but this trip uses ${assignedVehicleResult[0].registration}.`,
              details: {
                driverId,
                driverName: driverVehicle.driver_name,
                usualVehicleId: driverVehicle.current_vehicle_id,
                usualVehicleReg: driverVehicle.current_vehicle_reg,
                assignedVehicleId: vehicleId,
                assignedVehicleReg: assignedVehicleResult[0].registration
              }
            });
          }
        }
      }
    }

    // Separate critical and warning conflicts
    const criticalConflicts = conflicts.filter(c => c.type === 'critical');
    const warnings = conflicts.filter(c => c.type === 'warning');

    return res.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      hasCriticalConflicts: criticalConflicts.length > 0,
      criticalConflicts,
      warnings,
      canProceed: criticalConflicts.length === 0,
      message: criticalConflicts.length > 0
        ? 'Critical conflicts detected. This trip cannot be created until conflicts are resolved.'
        : warnings.length > 0
        ? 'Warnings detected. Review carefully before proceeding.'
        : 'No conflicts detected. Safe to proceed.'
    });
  })
);

export default router;
