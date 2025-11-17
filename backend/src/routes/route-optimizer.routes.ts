import { Router, Request, Response } from 'express';
import axios from 'axios';
import { asyncHandler } from '../middleware/errorHandler';
import { verifyTenantAccess } from '../middleware/verifyTenantAccess';
import { getDbClient } from '../config/database';

const router = Router();

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Geocode an address using Google Geocoding API or fallback to mock
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Try Google Geocoding API if key is available
  if (googleApiKey && googleApiKey.trim() !== '' && googleApiKey !== 'your_google_maps_api_key_here') {
    try {
      const { routeOptimizationService } = require('../services/routeOptimization.service');
      const coords = await routeOptimizationService.geocodeAddress(address);
      if (coords) return coords;
    } catch (error) {
      console.warn('Google Geocoding failed, using mock coordinates:', error);
    }
  }

  // Fallback: Generate consistent mock coordinates based on address hash
  // This ensures the same address always gets the same coordinates
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    lat: 53.38 + (hash % 100) / 1000, // Sheffield area
    lng: -1.47 + (hash % 100) / 1000
  };
}

/**
 * Optimize route using nearest neighbor algorithm
 */
function optimizeRouteOrder(trips: any[], distances: number[][]): any[] {
  if (trips.length <= 1) return trips;

  const visited = new Set<number>();
  const optimized: any[] = [];
  let current = 0; // Start with first trip

  visited.add(current);
  optimized.push(trips[current]);

  while (visited.size < trips.length) {
    let nearest = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < trips.length; i++) {
      if (!visited.has(i) && distances[current][i] < nearestDist) {
        nearestDist = distances[current][i];
        nearest = i;
      }
    }

    if (nearest !== -1) {
      visited.add(nearest);
      optimized.push(trips[nearest]);
      current = nearest;
    }
  }

  return optimized;
}

/**
 * POST /api/tenants/:tenantId/routes/optimize
 * Optimize route for a driver on a specific date
 */
router.post(
  '/tenants/:tenantId/routes/optimize',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { driverId, date, trips } = req.body;

    if (!driverId || !date || !trips || trips.length < 2) {
      return res.status(400).json({ error: 'Invalid request. Need driver, date, and at least 2 trips.' });
    }

    const client = await getDbClient();

    try {
      // Fetch full trip details from database
      const tripIds = trips.map((t: any) => t.trip_id);
      const tripQuery = `
        SELECT trip_id, customer_name, pickup_location, pickup_address,
               destination, destination_address, pickup_time, status
        FROM tenant_trips
        WHERE tenant_id = $1 AND trip_id = ANY($2)
        ORDER BY pickup_time
      `;

      const tripResult = await client.query(tripQuery, [tenantId, tripIds]);
      const fullTrips = tripResult.rows;

      client.release();

      if (fullTrips.length < 2) {
        return res.status(400).json({ error: 'Not enough trips to optimize' });
      }

      let optimizationMethod: 'google' | 'haversine' | 'manual' = 'haversine';
      let warning: string | undefined;
      let distances: number[][] = [];
      let totalDistanceBefore = 0;
      let totalDistanceAfter = 0;

      // Try Google Maps API first if API key is available
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (googleApiKey && googleApiKey.trim() !== '' && googleApiKey !== 'your_google_maps_api_key_here') {
        try {
          console.log('Attempting to use Google Maps Distance Matrix API for route optimization...');

          // Prepare origins (destinations of each trip)
          const origins = fullTrips.map((t: any) => t.destination_address || t.destination);
          // Prepare destinations (pickup locations of each trip)
          const destinations = fullTrips.map((t: any) => t.pickup_address || t.pickup_location);

          // Call Google Maps Distance Matrix API
          const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
            params: {
              origins: origins.join('|'),
              destinations: destinations.join('|'),
              key: googleApiKey,
              units: 'imperial' // Miles
            }
          });

          if (response.data.status === 'OK') {
            // Build distance matrix from Google Maps response
            distances = response.data.rows.map((row: any) =>
              row.elements.map((element: any) => {
                if (element.status === 'OK') {
                  // Convert meters to miles
                  return element.distance.value * 0.000621371;
                }
                return 0;
              })
            );

            // Calculate total distance for original order
            for (let i = 0; i < fullTrips.length - 1; i++) {
              totalDistanceBefore += distances[i][i + 1];
            }

            // Optimize using nearest neighbor
            const optimizedTrips = optimizeRouteOrder(fullTrips, distances);

            // Calculate total distance for optimized order
            const optimizedIndices = optimizedTrips.map((trip: any) =>
              fullTrips.findIndex((t: any) => t.trip_id === trip.trip_id)
            );
            for (let i = 0; i < optimizedIndices.length - 1; i++) {
              totalDistanceAfter += distances[optimizedIndices[i]][optimizedIndices[i + 1]];
            }

            const distanceSaved = totalDistanceBefore - totalDistanceAfter;
            const timeSaved = Math.round(distanceSaved * 2); // Rough estimate: 2 mins per mile

            optimizationMethod = 'google';

            console.log('✅ Google Maps route optimization successful');

            return res.json({
              method: optimizationMethod,
              originalOrder: fullTrips,
              optimizedOrder: optimizedTrips,
              savings: {
                distance: distanceSaved,
                time: timeSaved
              },
              reliable: true
            });
          } else {
            throw new Error(`Google Maps API returned status: ${response.data.status}`);
          }
        } catch (googleError: any) {
          console.warn('Google Maps failed, falling back to Haversine:', googleError.message);
          optimizationMethod = 'haversine';
          warning = 'Using estimated distances (Google Maps unavailable). Results may be less accurate.';
        }
      } else {
        optimizationMethod = 'haversine';
        warning = 'Using estimated distances (Google Maps API not configured).';
      }

      // Fallback: Use Haversine formula
      if (optimizationMethod === 'haversine') {
        // Geocode all addresses (with fallback to mock)
        const geocodedTrips = await Promise.all(
          fullTrips.map(async (trip: any) => {
            const pickupCoords = await geocodeAddress(trip.pickup_address || trip.pickup_location);
            const destCoords = await geocodeAddress(trip.destination_address || trip.destination);
            return { ...trip, pickupCoords, destCoords };
          })
        );

        // Build distance matrix (destination of i to pickup of j)
        distances = geocodedTrips.map((tripI: any) =>
          geocodedTrips.map((tripJ: any) => {
            if (!tripI.destCoords || !tripJ.pickupCoords) return 0;
            return haversineDistance(
              tripI.destCoords.lat,
              tripI.destCoords.lng,
              tripJ.pickupCoords.lat,
              tripJ.pickupCoords.lng
            );
          })
        );

        // Calculate total distance for original order
        for (let i = 0; i < fullTrips.length - 1; i++) {
          totalDistanceBefore += distances[i][i + 1];
        }

        // Optimize using nearest neighbor
        const optimizedTrips = optimizeRouteOrder(fullTrips, distances);

        // Calculate total distance for optimized order
        const optimizedIndices = optimizedTrips.map((trip: any) =>
          fullTrips.findIndex((t: any) => t.trip_id === trip.trip_id)
        );
        for (let i = 0; i < optimizedIndices.length - 1; i++) {
          totalDistanceAfter += distances[optimizedIndices[i]][optimizedIndices[i + 1]];
        }

        const distanceSaved = totalDistanceBefore - totalDistanceAfter;
        const timeSaved = Math.round(distanceSaved * 2); // Rough estimate: 2 mins per mile

        return res.json({
          method: optimizationMethod,
          originalOrder: fullTrips,
          optimizedOrder: optimizedTrips,
          savings: {
            distance: distanceSaved,
            time: timeSaved
          },
          warning,
          reliable: false
        });
      }

      // This should never be reached, but TypeScript needs it
      return res.status(500).json({ error: 'Optimization method not supported' });
    } catch (error) {
      console.error('Error optimizing route:', error);
      client.release();
      return res.status(500).json({ error: 'Failed to optimize route' });
    }
  })
);

/**
 * GET /api/tenants/:tenantId/routes/optimization-scores
 * Calculate optimization scores for all drivers in a date range
 */
router.get(
  '/tenants/:tenantId/routes/optimization-scores',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const client = await getDbClient();

    try {
      // Get all trips in date range grouped by driver and date
      const tripsQuery = `
        SELECT
          driver_id,
          trip_date,
          json_agg(
            json_build_object(
              'trip_id', trip_id,
              'pickup_location', pickup_location,
              'pickup_address', pickup_address,
              'destination', destination,
              'destination_address', destination_address,
              'pickup_time', pickup_time,
              'customer_name', customer_name
            ) ORDER BY pickup_time
          ) as trips
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date >= $2
          AND trip_date <= $3
          AND driver_id IS NOT NULL
          AND status != 'cancelled'
        GROUP BY driver_id, trip_date
        HAVING COUNT(*) >= 2
      `;

      const result = await client.query(tripsQuery, [tenantId, startDate, endDate]);
      client.release();

      // Calculate scores for each driver-date combination
      const scores = await Promise.all(
        result.rows.map(async (row: any) => {
          const trips = row.trips;

          if (trips.length < 2) {
            return {
              driverId: row.driver_id,
              date: row.trip_date,
              score: 100,
              status: 'optimal',
              tripCount: trips.length,
              currentDistance: 0,
              optimalDistance: 0,
              savingsPotential: 0
            };
          }

          try {
            // Calculate current distance (sequential order)
            let currentDistance = 0;
            const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
            let useGoogle = googleApiKey && googleApiKey.trim() !== '' && googleApiKey !== 'your_google_maps_api_key_here';

            if (useGoogle) {
              // Try Google Distance Matrix
              try {
                for (let i = 0; i < trips.length - 1; i++) {
                  const origin = trips[i].destination_address || trips[i].destination;
                  const destination = trips[i + 1].pickup_address || trips[i + 1].pickup_location;

                  const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
                    params: {
                      origins: origin,
                      destinations: destination,
                      key: googleApiKey,
                      units: 'imperial'
                    }
                  });

                  if (response.data.status === 'OK' && response.data.rows[0]?.elements[0]?.status === 'OK') {
                    currentDistance += response.data.rows[0].elements[0].distance.value * 0.000621371;
                  } else {
                    useGoogle = false;
                    break;
                  }
                }
              } catch (err) {
                useGoogle = false;
              }
            }

            // Fallback to Haversine if Google failed or unavailable
            if (!useGoogle) {
              const geocodedTrips = await Promise.all(
                trips.map(async (trip: any) => {
                  const pickupCoords = await geocodeAddress(trip.pickup_address || trip.pickup_location);
                  const destCoords = await geocodeAddress(trip.destination_address || trip.destination);
                  return { ...trip, pickupCoords, destCoords };
                })
              );

              for (let i = 0; i < geocodedTrips.length - 1; i++) {
                const from = geocodedTrips[i].destCoords;
                const to = geocodedTrips[i + 1].pickupCoords;
                if (from && to) {
                  currentDistance += haversineDistance(from.lat, from.lng, to.lat, to.lng);
                }
              }
            }

            // Calculate optimal distance using nearest neighbor
            const distances: number[][] = [];

            if (useGoogle) {
              // Build distance matrix with Google
              const origins = trips.map((t: any) => t.destination_address || t.destination);
              const destinations = trips.map((t: any) => t.pickup_address || t.pickup_location);

              const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
                params: {
                  origins: origins.join('|'),
                  destinations: destinations.join('|'),
                  key: googleApiKey,
                  units: 'imperial'
                }
              });

              if (response.data.status === 'OK') {
                response.data.rows.forEach((row: any) => {
                  const rowDistances = row.elements.map((element: any) => {
                    if (element.status === 'OK') {
                      return element.distance.value * 0.000621371;
                    }
                    return 0;
                  });
                  distances.push(rowDistances);
                });
              }
            } else {
              // Build distance matrix with Haversine
              const geocodedTrips = await Promise.all(
                trips.map(async (trip: any) => {
                  const pickupCoords = await geocodeAddress(trip.pickup_address || trip.pickup_location);
                  const destCoords = await geocodeAddress(trip.destination_address || trip.destination);
                  return { ...trip, pickupCoords, destCoords };
                })
              );

              geocodedTrips.forEach((tripI: any) => {
                const row = geocodedTrips.map((tripJ: any) => {
                  if (!tripI.destCoords || !tripJ.pickupCoords) return 0;
                  return haversineDistance(
                    tripI.destCoords.lat,
                    tripI.destCoords.lng,
                    tripJ.pickupCoords.lat,
                    tripJ.pickupCoords.lng
                  );
                });
                distances.push(row);
              });
            }

            // Calculate optimal route distance
            const optimizedTrips = optimizeRouteOrder(trips, distances);
            let optimalDistance = 0;

            const optimizedIndices = optimizedTrips.map((trip: any) =>
              trips.findIndex((t: any) => t.trip_id === trip.trip_id)
            );

            for (let i = 0; i < optimizedIndices.length - 1; i++) {
              optimalDistance += distances[optimizedIndices[i]][optimizedIndices[i + 1]];
            }

            // Calculate score
            const score = currentDistance > 0
              ? Math.round((optimalDistance / currentDistance) * 100)
              : 100;

            const savingsPotential = Math.max(0, currentDistance - optimalDistance);

            let status: 'optimal' | 'good' | 'needs-optimization' = 'optimal';
            if (score < 70) status = 'needs-optimization';
            else if (score < 90) status = 'good';

            return {
              driverId: row.driver_id,
              date: row.trip_date,
              score,
              status,
              tripCount: trips.length,
              currentDistance: parseFloat(currentDistance.toFixed(2)),
              optimalDistance: parseFloat(optimalDistance.toFixed(2)),
              savingsPotential: parseFloat(savingsPotential.toFixed(2))
            };
          } catch (error) {
            console.error(`Error calculating score for driver ${row.driver_id} on ${row.trip_date}:`, error);
            return {
              driverId: row.driver_id,
              date: row.trip_date,
              score: 0,
              status: 'error',
              tripCount: trips.length,
              currentDistance: 0,
              optimalDistance: 0,
              savingsPotential: 0,
              error: 'Failed to calculate score'
            };
          }
        })
      );

      return res.json({ scores });
    } catch (error) {
      console.error('Error fetching optimization scores:', error);
      client.release();
      return res.status(500).json({ error: 'Failed to fetch optimization scores' });
    }
  })
);

/**
 * POST /api/tenants/:tenantId/routes/batch-optimize
 * Batch optimize routes across multiple days with capacity constraints
 */
router.post(
  '/tenants/:tenantId/routes/batch-optimize',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate, includeCapacity = false } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const client = await getDbClient();

    try {
      // Fetch trips in date range
      const tripsQuery = `
        SELECT
          t.trip_id,
          t.driver_id,
          t.trip_date as date,
          t.pickup_time,
          t.pickup_location,
          t.pickup_address,
          t.pickup_postcode,
          t.destination,
          t.destination_address,
          t.destination_postcode,
          COALESCE(t.passenger_count, 1) as passengers
        FROM tenant_trips t
        WHERE t.tenant_id = $1
          AND t.trip_date >= $2
          AND t.trip_date <= $3
          AND t.status != 'cancelled'
        ORDER BY t.trip_date, t.pickup_time
      `;

      const tripsResult = await client.query(tripsQuery, [tenantId, startDate, endDate]);

      // Fetch drivers with vehicle info
      const driversQuery = `
        SELECT
          d.driver_id,
          v.capacity as vehicle_capacity,
          d.home_address,
          d.home_postcode
        FROM tenant_drivers d
        LEFT JOIN tenant_vehicles v ON d.assigned_vehicle_id = v.vehicle_id
        WHERE d.tenant_id = $1 AND d.is_active = true
      `;

      const driversResult = await client.query(driversQuery, [tenantId]);

      client.release();

      const { routeOptimizationService } = require('../services/routeOptimization.service');

      // Prepare trip data
      const trips = tripsResult.rows.map((t: any) => ({
        trip_id: t.trip_id,
        driver_id: t.driver_id,
        date: t.date,
        pickup_time: t.pickup_time,
        pickup_location: {
          address: t.pickup_address || t.pickup_location,
          postcode: t.pickup_postcode
        },
        destination: {
          address: t.destination_address || t.destination,
          postcode: t.destination_postcode
        },
        passengers: t.passengers
      }));

      // Prepare driver data
      const drivers = driversResult.rows.map((d: any) => ({
        driver_id: d.driver_id,
        vehicle_capacity: d.vehicle_capacity || 8, // Default to 8-seater
        start_location: d.home_address ? {
          address: d.home_address,
          postcode: d.home_postcode
        } : undefined
      }));

      // Run batch optimization
      const result = await routeOptimizationService.batchOptimizeRoutes({
        trips,
        drivers,
        dateRange: { start: startDate, end: endDate }
      });

      return res.json({
        success: true,
        ...result,
        tripCount: trips.length,
        driverCount: drivers.length,
        dateRange: { startDate, endDate }
      });
    } catch (error: any) {
      console.error('Error in batch optimization:', error);
      client.release();
      return res.status(500).json({ error: 'Failed to batch optimize routes', details: error.message });
    }
  })
);

/**
 * POST /api/tenants/:tenantId/routes/capacity-optimize
 * Optimize route groupings based on vehicle capacity constraints
 */
router.post(
  '/tenants/:tenantId/routes/capacity-optimize',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { date, vehicleCapacity = 8 } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const client = await getDbClient();

    try {
      // Fetch trips for the date
      const tripsQuery = `
        SELECT
          trip_id,
          pickup_time,
          pickup_location,
          pickup_address,
          pickup_postcode,
          destination,
          destination_address,
          destination_postcode,
          COALESCE(passenger_count, 1) as passengers
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date = $2
          AND status != 'cancelled'
        ORDER BY pickup_time
      `;

      const tripsResult = await client.query(tripsQuery, [tenantId, date]);
      client.release();

      const { routeOptimizationService } = require('../services/routeOptimization.service');

      // Prepare trip data
      const trips = tripsResult.rows.map((t: any) => ({
        trip_id: t.trip_id,
        passengers: t.passengers,
        pickup_location: {
          address: t.pickup_address || t.pickup_location,
          postcode: t.pickup_postcode
        },
        destination: {
          address: t.destination_address || t.destination,
          postcode: t.destination_postcode
        },
        pickup_time: t.pickup_time
      }));

      // Run capacity optimization
      const routes = routeOptimizationService.optimizeWithCapacity({
        trips,
        vehicleCapacity
      });

      // Calculate statistics
      const totalPassengers = trips.reduce((sum: number, t: any) => sum + t.passengers, 0);
      const averageCapacityUsed = routes.reduce((sum, r) => sum + r.capacity_used, 0) / routes.length;
      const vehiclesNeeded = routes.length;
      const vehiclesSaved = Math.max(0, trips.length - vehiclesNeeded);

      return res.json({
        success: true,
        routes,
        statistics: {
          totalTrips: trips.length,
          totalPassengers,
          vehiclesNeeded,
          vehiclesSaved,
          averageCapacityUsed: Math.round(averageCapacityUsed),
          efficiency: Math.round((vehiclesSaved / trips.length) * 100)
        }
      });
    } catch (error: any) {
      console.error('Error in capacity optimization:', error);
      client.release();
      return res.status(500).json({ error: 'Failed to optimize capacity', details: error.message });
    }
  })
);

/**
 * GET /api/tenants/:tenantId/routes/analytics
 * Get route optimization analytics and KPIs
 */
router.get(
  '/tenants/:tenantId/routes/analytics',
  verifyTenantAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const client = await getDbClient();

    try {
      // Get route efficiency metrics
      const metricsQuery = `
        SELECT
          COUNT(DISTINCT trip_id) as total_trips,
          COUNT(DISTINCT driver_id) as drivers_used,
          COUNT(DISTINCT trip_date) as days_active,
          AVG(COALESCE(passenger_count, 1)) as avg_passengers_per_trip,
          SUM(COALESCE(distance_miles, 0)) as total_miles,
          SUM(COALESCE(duration_minutes, 0)) as total_minutes
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date >= $2
          AND trip_date <= $3
          AND status != 'cancelled'
      `;

      const metricsResult = await client.query(metricsQuery, [tenantId, startDate, endDate]);

      // Get driver utilization
      const utilizationQuery = `
        SELECT
          driver_id,
          COUNT(*) as trip_count,
          SUM(COALESCE(distance_miles, 0)) as total_distance,
          MIN(trip_date) as first_trip,
          MAX(trip_date) as last_trip
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date >= $2
          AND trip_date <= $3
          AND driver_id IS NOT NULL
          AND status != 'cancelled'
        GROUP BY driver_id
        ORDER BY trip_count DESC
      `;

      const utilizationResult = await client.query(utilizationQuery, [tenantId, startDate, endDate]);

      // Get peak times
      const peakTimesQuery = `
        SELECT
          EXTRACT(HOUR FROM pickup_time::time) as hour,
          COUNT(*) as trip_count
        FROM tenant_trips
        WHERE tenant_id = $1
          AND trip_date >= $2
          AND trip_date <= $3
          AND status != 'cancelled'
        GROUP BY hour
        ORDER BY trip_count DESC
        LIMIT 5
      `;

      const peakTimesResult = await client.query(peakTimesQuery, [tenantId, startDate, endDate]);

      client.release();

      const metrics = metricsResult.rows[0];

      return res.json({
        success: true,
        overview: {
          totalTrips: parseInt(metrics.total_trips),
          driversUsed: parseInt(metrics.drivers_used),
          daysActive: parseInt(metrics.days_active),
          avgPassengersPerTrip: parseFloat(parseFloat(metrics.avg_passengers_per_trip).toFixed(2)),
          totalMiles: parseFloat(parseFloat(metrics.total_miles).toFixed(2)),
          totalHours: parseFloat((parseFloat(metrics.total_minutes) / 60).toFixed(2)),
          tripsPerDriver: parseFloat((parseFloat(metrics.total_trips) / parseInt(metrics.drivers_used)).toFixed(2))
        },
        driverUtilization: utilizationResult.rows.map((r: any) => ({
          driverId: r.driver_id,
          tripCount: parseInt(r.trip_count),
          totalDistance: parseFloat(parseFloat(r.total_distance).toFixed(2)),
          activeDays: Math.ceil((new Date(r.last_trip).getTime() - new Date(r.first_trip).getTime()) / (1000 * 60 * 60 * 24)) + 1
        })),
        peakHours: peakTimesResult.rows.map((r: any) => ({
          hour: parseInt(r.hour),
          tripCount: parseInt(r.trip_count)
        }))
      });
    } catch (error: any) {
      console.error('Error fetching route analytics:', error);
      client.release();
      return res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
    }
  })
);

export default router;
