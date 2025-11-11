import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route GET /api/tenants/:tenantId/capacity-alerts
 * @desc Analyze vehicle capacity usage and identify revenue opportunities
 * @access Protected
 */
router.get(
  '/tenants/:tenantId/capacity-alerts',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { date, driverId } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    logger.info('Analyzing vehicle capacity', { tenantId, date, driverId });

    // Build query to get all trips with vehicle and passenger count
    let queryText = `
      SELECT
        t.trip_id,
        t.driver_id,
        t.vehicle_id,
        t.pickup_time,
        t.destination,
        t.destination_address,
        t.customer_id,
        t.price,
        c.name as customer_name,
        v.registration,
        v.make,
        v.model,
        v.seats as vehicle_capacity,
        v.wheelchair_accessible,
        d.name as driver_name,
        -- Count passengers on this exact trip time/driver/vehicle combination
        (
          SELECT COUNT(DISTINCT t2.customer_id)
          FROM tenant_trips t2
          WHERE t2.tenant_id = t.tenant_id
            AND t2.driver_id = t.driver_id
            AND t2.vehicle_id = t.vehicle_id
            AND t2.trip_date = t.trip_date
            AND t2.pickup_time = t.pickup_time
            AND t2.destination = t.destination
            AND t2.status IN ('scheduled', 'in_progress')
        ) as current_passengers
      FROM tenant_trips t
      LEFT JOIN tenant_customers c ON t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id
      LEFT JOIN tenant_vehicles v ON t.vehicle_id = v.vehicle_id AND t.tenant_id = v.tenant_id
      LEFT JOIN tenant_drivers d ON t.driver_id = d.driver_id AND t.tenant_id = d.tenant_id
      WHERE t.tenant_id = $1
        AND t.trip_date = $2
        AND t.status IN ('scheduled', 'in_progress')
        AND t.vehicle_id IS NOT NULL
    `;

    const params: any[] = [tenantId, date];

    if (driverId) {
      queryText += ` AND t.driver_id = $${params.length + 1}`;
      params.push(driverId);
    }

    queryText += ` ORDER BY t.driver_id, t.pickup_time`;

    const trips = await query(queryText, params);

    // Group by unique trip combination (driver + vehicle + time + destination)
    const tripGroups = new Map<string, any>();

    for (const trip of trips) {
      const key = `${trip.driver_id}_${trip.vehicle_id}_${trip.pickup_time}_${trip.destination}`;

      if (!tripGroups.has(key)) {
        tripGroups.set(key, {
          driver_id: trip.driver_id,
          driver_name: trip.driver_name,
          vehicle_id: trip.vehicle_id,
          vehicle_registration: trip.registration,
          vehicle_make: trip.make,
          vehicle_model: trip.model,
          vehicle_capacity: trip.vehicle_capacity || 0,
          wheelchair_accessible: trip.wheelchair_accessible || false,
          pickup_time: trip.pickup_time,
          destination: trip.destination,
          destination_address: trip.destination_address,
          current_passengers: parseInt(trip.current_passengers) || 1,
          passengers: [],
          trip_ids: [],
          average_price: 0
        });
      }

      const group = tripGroups.get(key);
      group.passengers.push({
        customer_id: trip.customer_id,
        customer_name: trip.customer_name,
        price: trip.price
      });
      group.trip_ids.push(trip.trip_id);

      // Calculate average price
      const totalPrice = group.passengers.reduce((sum: number, p: any) => sum + (parseFloat(p.price) || 0), 0);
      group.average_price = group.passengers.length > 0 ? totalPrice / group.passengers.length : 0;
    }

    // Identify underutilized trips (capacity alerts)
    const alerts: any[] = [];
    const utilizationThreshold = 0.6; // Alert if using < 60% of capacity

    for (const [key, group] of tripGroups.entries()) {
      const emptySeats = group.vehicle_capacity - group.current_passengers;
      const utilization = group.vehicle_capacity > 0 ? group.current_passengers / group.vehicle_capacity : 0;

      // Only alert if there are empty seats and utilization is low
      if (emptySeats > 0 && utilization < utilizationThreshold && group.vehicle_capacity >= 4) {
        // Calculate potential revenue
        const potentialRevenue = emptySeats * group.average_price;

        // Get passenger recommendations for this trip
        let recommendations: any[] = [];
        try {
          // Get unassigned customers for this time slot
          const potentialPassengers = await query(
            `SELECT
              c.customer_id,
              c.name,
              c.address,
              c.postcode,
              c.phone,
              c.schedule,
              c.mobility_requirements
            FROM tenant_customers c
            WHERE c.tenant_id = $1
              AND c.is_active = true
              AND c.customer_id NOT IN (
                SELECT customer_id FROM tenant_trips
                WHERE tenant_id = $1
                  AND trip_date = $2
                  AND status IN ('scheduled', 'in_progress', 'completed')
              )
            LIMIT 20`,
            [tenantId, date]
          );

          // Simple proximity matching
          for (const customer of potentialPassengers) {
            if (!customer.schedule) continue;

            const dayOfWeek = new Date(date as string).getDay();
            const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const dayKey = dayNames[dayOfWeek];
            const daySchedule = customer.schedule[dayKey];

            if (!daySchedule) continue;

            // Check if destination matches
            const customerDest = daySchedule.destination || daySchedule.outbound_destination || '';
            const tripDest = group.destination || '';

            if (customerDest && tripDest &&
                (customerDest.toLowerCase().includes(tripDest.toLowerCase()) ||
                 tripDest.toLowerCase().includes(customerDest.toLowerCase()))) {

              // Check if time is within 30 minutes
              const customerTime = daySchedule.pickup_time || daySchedule.outbound_time || '09:00';
              const tripTime = group.pickup_time || '09:00';

              const [custHour, custMin] = customerTime.split(':').map(Number);
              const [tripHour, tripMin] = tripTime.split(':').map(Number);

              const custMinutes = custHour * 60 + custMin;
              const tripMinutes = tripHour * 60 + tripMin;
              const timeDiff = Math.abs(custMinutes - tripMinutes);

              if (timeDiff <= 30) { // Within 30 minutes
                recommendations.push({
                  customer_id: customer.customer_id,
                  customer_name: customer.name,
                  address: customer.address,
                  postcode: customer.postcode,
                  phone: customer.phone,
                  destination: customerDest,
                  pickup_time: customerTime,
                  time_diff_minutes: timeDiff,
                  mobility_requirements: customer.mobility_requirements
                });
              }
            }
          }

          // Sort by time difference (closest first)
          recommendations.sort((a, b) => a.time_diff_minutes - b.time_diff_minutes);
          recommendations = recommendations.slice(0, 5); // Top 5
        } catch (err) {
          logger.error('Error getting recommendations', { error: err });
        }

        alerts.push({
          trip_group_key: key,
          driver_id: group.driver_id,
          driver_name: group.driver_name,
          vehicle: {
            id: group.vehicle_id,
            registration: group.vehicle_registration,
            make: group.vehicle_make,
            model: group.vehicle_model,
            capacity: group.vehicle_capacity,
            wheelchair_accessible: group.wheelchair_accessible
          },
          trip_details: {
            pickup_time: group.pickup_time,
            destination: group.destination,
            destination_address: group.destination_address,
            trip_ids: group.trip_ids
          },
          capacity: {
            total_seats: group.vehicle_capacity,
            occupied_seats: group.current_passengers,
            empty_seats: emptySeats,
            utilization_percentage: Math.round(utilization * 100)
          },
          revenue: {
            average_trip_price: Math.round(group.average_price * 100) / 100,
            potential_additional_revenue: Math.round(potentialRevenue * 100) / 100
          },
          current_passengers: group.passengers,
          recommended_passengers: recommendations,
          severity: emptySeats >= 4 ? 'high' : emptySeats >= 2 ? 'medium' : 'low'
        });
      }
    }

    // Sort alerts by potential revenue (highest first)
    alerts.sort((a, b) => b.revenue.potential_additional_revenue - a.revenue.potential_additional_revenue);

    // Calculate summary stats
    const totalAlerts = alerts.length;
    const totalEmptySeats = alerts.reduce((sum, alert) => sum + alert.capacity.empty_seats, 0);
    const totalPotentialRevenue = alerts.reduce((sum, alert) => sum + alert.revenue.potential_additional_revenue, 0);

    return res.json({
      success: true,
      date,
      summary: {
        total_alerts: totalAlerts,
        total_empty_seats: totalEmptySeats,
        total_potential_revenue: Math.round(totalPotentialRevenue * 100) / 100,
        average_utilization: trips.length > 0
          ? Math.round((alerts.reduce((sum, a) => sum + a.capacity.utilization_percentage, 0) / totalAlerts) || 0)
          : 100
      },
      alerts
    });
  })
);

export default router;
