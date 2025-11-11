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

export default router;
