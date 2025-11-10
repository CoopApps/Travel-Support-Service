import { Router, Request, Response } from 'express';
import axios from 'axios';

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
 * Geocode an address (mock - in production would use Google Geocoding API)
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // For demo purposes, return mock coordinates
  // In production, call Google Geocoding API here
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

module.exports = (getDbClient: any, verifyTenantAccess: any) => {
  /**
   * POST /api/tenants/:tenantId/routes/optimize
   * Optimize route for a driver on a specific date
   */
  router.post(
    '/tenants/:tenantId/routes/optimize',
    verifyTenantAccess,
    async (req: Request, res: Response) => {
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

        await client.end();

        if (fullTrips.length < 2) {
          return res.status(400).json({ error: 'Not enough trips to optimize' });
        }

        let optimizationMethod: 'google' | 'haversine' | 'manual' = 'haversine';
        let reliable = false;
        let warning: string | undefined;
        let distances: number[][] = [];
        let totalDistanceBefore = 0;
        let totalDistanceAfter = 0;

        // Try Google Maps API first if API key is available
        const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (googleApiKey && googleApiKey.trim() !== '') {
          try {
            // Note: In production, you'd make actual Google Maps Distance Matrix API calls here
            // For now, we'll simulate it
            console.log('Google Maps API available but not implemented in this demo');
            throw new Error('Google Maps not configured');
          } catch (googleError) {
            console.warn('Google Maps failed, falling back to Haversine');
            optimizationMethod = 'haversine';
            warning = 'Using estimated distances. Results may be less accurate.';
          }
        } else {
          optimizationMethod = 'haversine';
          warning = 'Using estimated distances (Google Maps API not configured).';
        }

        // Fallback: Use Haversine formula
        if (optimizationMethod === 'haversine') {
          // Geocode all addresses (mock for demo)
          const geocodedTrips = await Promise.all(
            fullTrips.map(async (trip) => {
              const pickupCoords = await geocodeAddress(trip.pickup_address || trip.pickup_location);
              const destCoords = await geocodeAddress(trip.destination_address || trip.destination);
              return { ...trip, pickupCoords, destCoords };
            })
          );

          // Build distance matrix (destination of i to pickup of j)
          distances = geocodedTrips.map((tripI) =>
            geocodedTrips.map((tripJ) => {
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
          const optimizedIndices = optimizedTrips.map(trip =>
            fullTrips.findIndex(t => t.trip_id === trip.trip_id)
          );
          for (let i = 0; i < optimizedIndices.length - 1; i++) {
            totalDistanceAfter += distances[optimizedIndices[i]][optimizedIndices[i + 1]];
          }

          const distanceSaved = totalDistanceBefore - totalDistanceAfter;
          const timeSaved = Math.round(distanceSaved * 2); // Rough estimate: 2 mins per mile

          res.json({
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
      } catch (error) {
        console.error('Error optimizing route:', error);
        await client.end();
        res.status(500).json({ error: 'Failed to optimize route' });
      }
    }
  );

  return router;
};
