/**
 * Route Optimization Service
 *
 * Uses Google Maps APIs to calculate distances, travel times, and optimize routes
 * for passenger carpooling and ride-sharing recommendations
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface Location {
  address: string;
  postcode?: string;
  lat?: number;
  lng?: number;
}

interface RouteOptimizationResult {
  distance: number; // meters
  duration: number; // seconds
  detourDistance: number; // additional meters when adding passenger
  detourDuration: number; // additional seconds
  feasible: boolean;
}

// Unused interface - kept for future feature development
// interface PassengerMatch {
//   customerId: number;
//   customerName: string;
//   address: string;
//   postcode?: string;
//   destination: string;
//   pickupTime: string;
//   score: number; // 0-100 compatibility score
//   distanceFromDriver: number; // meters
//   sharedDestination: boolean;
//   detourMinutes: number;
//   reasoning: string[];
// }

/**
 * Geocode an address to lat/lng coordinates using Google Geocoding API
 */
export async function geocodeAddress(address: string, postcode?: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    logger.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const searchAddress = postcode ? `${address}, ${postcode}, UK` : `${address}, UK`;
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: searchAddress,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    }

    logger.warn('Geocoding failed', { address, status: response.data.status });
    return null;
  } catch (error: any) {
    logger.error('Geocoding error', { error: error.message, address });
    return null;
  }
}

/**
 * Calculate distance and duration between two addresses using Distance Matrix API
 * Now includes traffic considerations for more accurate ETA
 */
export async function calculateDistance(
  origin: Location,
  destination: Location,
  options?: {
    departureTime?: Date; // For traffic-aware routing
    arrivalTime?: Date;   // For reverse optimization
    trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  }
): Promise<{ distance: number; duration: number; durationInTraffic?: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    logger.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const originStr = origin.postcode || origin.address;
    const destStr = destination.postcode || destination.address;

    const params: any = {
      origins: originStr,
      destinations: destStr,
      key: GOOGLE_MAPS_API_KEY,
      units: 'metric'
    };

    // Add traffic considerations if departure time is provided
    if (options?.departureTime) {
      params.departure_time = Math.floor(options.departureTime.getTime() / 1000);
      params.traffic_model = options.trafficModel || 'best_guess';
    } else if (options?.arrivalTime) {
      params.arrival_time = Math.floor(options.arrivalTime.getTime() / 1000);
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params
    });

    if (response.data.status === 'OK' && response.data.rows.length > 0) {
      const element = response.data.rows[0].elements[0];
      if (element.status === 'OK') {
        return {
          distance: element.distance.value, // meters
          duration: element.duration.value,  // seconds (without traffic)
          durationInTraffic: element.duration_in_traffic?.value // seconds (with traffic)
        };
      }
    }

    logger.warn('Distance calculation failed', {
      origin: originStr,
      destination: destStr,
      status: response.data.status
    });
    return null;
  } catch (error: any) {
    logger.error('Distance calculation error', { error: error.message });
    return null;
  }
}

/**
 * Calculate route optimization with multiple waypoints using Directions API
 * Returns additional distance/time when adding a passenger pickup
 */
export async function calculateRouteWithWaypoint(
  driverLocation: Location,
  passengerLocation: Location,
  destination: Location
): Promise<RouteOptimizationResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    logger.warn('Google Maps API key not configured');
    return null;
  }

  try {
    // Calculate direct route (driver -> destination)
    const directRoute = await calculateDistance(driverLocation, destination);
    if (!directRoute) return null;

    // Calculate route with passenger pickup (driver -> passenger -> destination)
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: driverLocation.address,
        destination: destination.address,
        waypoints: passengerLocation.address,
        key: GOOGLE_MAPS_API_KEY,
        optimize: true // Optimize waypoint order
      }
    });

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];

      const totalDistance = route.legs.reduce((sum: number, l: any) => sum + l.distance.value, 0);
      const totalDuration = route.legs.reduce((sum: number, l: any) => sum + l.duration.value, 0);

      const detourDistance = totalDistance - directRoute.distance;
      const detourDuration = totalDuration - directRoute.duration;

      // Consider feasible if detour is less than 15 minutes or 5 miles
      const feasible = detourDuration < 900 && detourDistance < 8046;

      return {
        distance: totalDistance,
        duration: totalDuration,
        detourDistance,
        detourDuration,
        feasible
      };
    }

    return null;
  } catch (error: any) {
    logger.error('Route optimization error', { error: error.message });
    return null;
  }
}

/**
 * Simple postcode distance estimation (UK postcodes)
 * Uses first part of postcode (outward code) for rough proximity
 */
export function estimatePostcodeProximity(postcode1?: string, postcode2?: string): number {
  if (!postcode1 || !postcode2) return 0;

  // Extract outward code (e.g., "SW1A" from "SW1A 1AA")
  const outward1 = postcode1.split(' ')[0].toUpperCase();
  const outward2 = postcode2.split(' ')[0].toUpperCase();

  // Same full postcode = very close (score 100)
  if (postcode1.replace(/\s/g, '').toUpperCase() === postcode2.replace(/\s/g, '').toUpperCase()) {
    return 100;
  }

  // Same outward code = nearby (score 75)
  if (outward1 === outward2) {
    return 75;
  }

  // Same district (first 1-2 letters) = same area (score 40)
  const district1 = outward1.match(/^[A-Z]+/)?.[0];
  const district2 = outward2.match(/^[A-Z]+/)?.[0];
  if (district1 === district2) {
    return 40;
  }

  // Different areas (score 10)
  return 10;
}

/**
 * Check if two destinations are similar (fuzzy match)
 */
export function destinationsSimilar(dest1: string, dest2: string): boolean {
  const normalize = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const norm1 = normalize(dest1);
  const norm2 = normalize(dest2);

  // Exact match
  if (norm1 === norm2) return true;

  // Contains match (one destination contains the other)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  return false;
}

/**
 * Calculate compatibility score between driver's current trip and potential passenger
 */
export function calculateCompatibilityScore(params: {
  driverLocation: Location;
  passengerLocation: Location;
  driverDestination: string;
  passengerDestination: string;
  driverPickupTime: string; // HH:MM format
  passengerPickupTime: string; // HH:MM format
  routeOptimization?: RouteOptimizationResult;
  postcodeProximity: number;
}): { score: number; reasoning: string[] } {
  const reasoning: string[] = [];
  let score = 0;

  // 1. Destination similarity (0-30 points)
  const sharedDestination = destinationsSimilar(params.driverDestination, params.passengerDestination);
  if (sharedDestination) {
    score += 30;
    reasoning.push('✓ Same destination');
  } else {
    score += 5;
    reasoning.push('✗ Different destinations');
  }

  // 2. Postcode proximity (0-25 points)
  const proximityScore = Math.round(params.postcodeProximity * 0.25);
  score += proximityScore;
  if (params.postcodeProximity > 75) {
    reasoning.push('✓ Very close proximity');
  } else if (params.postcodeProximity > 40) {
    reasoning.push('≈ Same general area');
  } else {
    reasoning.push('✗ Different areas');
  }

  // 3. Time window compatibility (0-25 points)
  const timeDiff = calculateTimeDifference(params.driverPickupTime, params.passengerPickupTime);
  if (timeDiff <= 15) {
    score += 25;
    reasoning.push('✓ Very similar pickup times');
  } else if (timeDiff <= 30) {
    score += 20;
    reasoning.push('≈ Similar pickup times (±30 min)');
  } else if (timeDiff <= 60) {
    score += 10;
    reasoning.push('≈ Pickup times within 1 hour');
  } else {
    score += 0;
    reasoning.push('✗ Different pickup times');
  }

  // 4. Route efficiency (0-20 points)
  if (params.routeOptimization) {
    const detourMinutes = Math.round(params.routeOptimization.detourDuration / 60);
    if (params.routeOptimization.feasible) {
      if (detourMinutes < 5) {
        score += 20;
        reasoning.push(`✓ Minimal detour (+${detourMinutes} min)`);
      } else if (detourMinutes < 10) {
        score += 15;
        reasoning.push(`≈ Small detour (+${detourMinutes} min)`);
      } else {
        score += 10;
        reasoning.push(`≈ Moderate detour (+${detourMinutes} min)`);
      }
    } else {
      score += 0;
      reasoning.push(`✗ Large detour (+${detourMinutes} min)`);
    }
  }

  return { score, reasoning };
}

/**
 * Calculate time difference in minutes between two HH:MM times
 */
function calculateTimeDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);

  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;

  return Math.abs(minutes1 - minutes2);
}

/**
 * Batch Optimize Routes Across Multiple Days
 * Optimizes routes for multiple drivers across a date range
 */
export async function batchOptimizeRoutes(params: {
  trips: Array<{
    trip_id: number;
    driver_id?: number;
    date: string;
    pickup_time: string;
    pickup_location: Location;
    destination: Location;
    passengers?: number;
  }>;
  drivers: Array<{
    driver_id: number;
    vehicle_capacity?: number;
    start_location?: Location;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}): Promise<{
  optimizedAssignments: Array<{
    trip_id: number;
    driver_id: number;
    suggested_time: string;
    sequence_order: number;
  }>;
  savings: {
    totalDistanceSaved: number;
    totalTimeSaved: number;
    efficiency_score: number;
  };
}> {
  const { trips, drivers: _drivers } = params; // TODO: Use drivers for advanced optimization
  const optimizedAssignments: any[] = [];
  let totalDistanceSaved = 0;
  let totalTimeSaved = 0;

  // Group trips by date
  const tripsByDate = trips.reduce((acc, trip) => {
    if (!acc[trip.date]) acc[trip.date] = [];
    acc[trip.date].push(trip);
    return acc;
  }, {} as Record<string, typeof trips>);

  // Optimize each day
  for (const [date, dayTrips] of Object.entries(tripsByDate)) {
    // Group trips by assigned driver
    const tripsByDriver = dayTrips.reduce((acc, trip) => {
      const driverId = trip.driver_id || 'unassigned';
      if (!acc[driverId]) acc[driverId] = [];
      acc[driverId].push(trip);
      return acc;
    }, {} as Record<string | number, typeof dayTrips>);

    // Optimize each driver's route for the day
    for (const [driverId, driverTrips] of Object.entries(tripsByDriver)) {
      if (driverId === 'unassigned' || driverTrips.length < 2) continue;

      // Calculate distances between all trip pairs
      const distances: number[][] = [];
      for (let i = 0; i < driverTrips.length; i++) {
        distances[i] = [];
        for (let j = 0; j < driverTrips.length; j++) {
          if (i === j) {
            distances[i][j] = 0;
          } else {
            const dist = await calculateDistance(
              driverTrips[i].destination,
              driverTrips[j].pickup_location,
              { departureTime: new Date(`${date} ${driverTrips[j].pickup_time}`) }
            );
            distances[i][j] = dist?.distance || 0;
          }
        }
      }

      // Use nearest neighbor to find optimal order
      const visited = new Set<number>();
      const optimized: typeof driverTrips = [];
      let current = 0;

      visited.add(current);
      optimized.push(driverTrips[current]);

      while (visited.size < driverTrips.length) {
        let nearest = -1;
        let nearestDist = Infinity;

        for (let i = 0; i < driverTrips.length; i++) {
          if (!visited.has(i) && distances[current][i] < nearestDist) {
            nearestDist = distances[current][i];
            nearest = i;
          }
        }

        if (nearest !== -1) {
          visited.add(nearest);
          optimized.push(driverTrips[nearest]);
          current = nearest;
        }
      }

      // Calculate time savings
      const originalDistance = distances.reduce((sum, row, i) => {
        if (i < driverTrips.length - 1) {
          return sum + row[i + 1];
        }
        return sum;
      }, 0);

      let optimizedDistance = 0;
      for (let i = 0; i < optimized.length - 1; i++) {
        const origIndex = driverTrips.findIndex(t => t.trip_id === optimized[i].trip_id);
        const nextIndex = driverTrips.findIndex(t => t.trip_id === optimized[i + 1].trip_id);
        optimizedDistance += distances[origIndex][nextIndex];
      }

      const distanceSaved = originalDistance - optimizedDistance;
      totalDistanceSaved += distanceSaved;
      totalTimeSaved += Math.round(distanceSaved / 1000 * 2); // 2 mins per km estimate

      // Generate optimized assignments
      optimized.forEach((trip, index) => {
        optimizedAssignments.push({
          trip_id: trip.trip_id,
          driver_id: parseInt(driverId as string),
          suggested_time: trip.pickup_time, // Could recalculate based on travel time
          sequence_order: index + 1
        });
      });
    }
  }

  const efficiency_score = trips.length > 0
    ? Math.min(100, Math.round((totalDistanceSaved / trips.length) * 10))
    : 100;

  return {
    optimizedAssignments,
    savings: {
      totalDistanceSaved,
      totalTimeSaved,
      efficiency_score
    }
  };
}

/**
 * Check if adding a trip would exceed vehicle capacity
 */
export function checkCapacityConstraint(
  currentLoad: number,
  additionalPassengers: number,
  vehicleCapacity: number
): { feasible: boolean; remainingCapacity: number } {
  const newLoad = currentLoad + additionalPassengers;
  return {
    feasible: newLoad <= vehicleCapacity,
    remainingCapacity: Math.max(0, vehicleCapacity - newLoad)
  };
}

/**
 * Optimize routes with capacity constraints
 * Groups trips that can share vehicles based on capacity
 */
export function optimizeWithCapacity(params: {
  trips: Array<{
    trip_id: number;
    passengers: number;
    pickup_location: Location;
    destination: Location;
    pickup_time: string;
  }>;
  vehicleCapacity: number;
}): Array<{
  route_id: number;
  trips: number[];
  total_passengers: number;
  capacity_used: number;
}> {
  const { trips, vehicleCapacity } = params;
  const routes: Array<{
    route_id: number;
    trips: number[];
    total_passengers: number;
    capacity_used: number;
  }> = [];

  let routeId = 1;
  const assigned = new Set<number>();

  // Sort trips by time
  const sortedTrips = [...trips].sort((a, b) => a.pickup_time.localeCompare(b.pickup_time));

  for (const trip of sortedTrips) {
    if (assigned.has(trip.trip_id)) continue;

    // Start a new route
    const route = {
      route_id: routeId++,
      trips: [trip.trip_id],
      total_passengers: trip.passengers,
      capacity_used: (trip.passengers / vehicleCapacity) * 100
    };

    assigned.add(trip.trip_id);

    // Try to add compatible trips to this route
    for (const otherTrip of sortedTrips) {
      if (assigned.has(otherTrip.trip_id)) continue;

      const capacity = checkCapacityConstraint(
        route.total_passengers,
        otherTrip.passengers,
        vehicleCapacity
      );

      if (capacity.feasible) {
        // Check time compatibility (within 30 minutes)
        const timeDiff = calculateTimeDifference(trip.pickup_time, otherTrip.pickup_time);
        if (timeDiff <= 30) {
          // Check location proximity
          const proximity = estimatePostcodeProximity(
            trip.pickup_location.postcode,
            otherTrip.pickup_location.postcode
          );
          if (proximity > 40) {
            route.trips.push(otherTrip.trip_id);
            route.total_passengers += otherTrip.passengers;
            route.capacity_used = (route.total_passengers / vehicleCapacity) * 100;
            assigned.add(otherTrip.trip_id);
          }
        }
      }
    }

    routes.push(route);
  }

  return routes;
}

/**
 * AI-Enhanced Route Optimization
 * Uses 2-opt algorithm when AI is enabled, falls back to greedy otherwise
 */
export async function optimizeWithCapacityAI(params: {
  trips: Array<{
    trip_id: number;
    passengers: number;
    pickup_location: Location;
    destination: Location;
    pickup_time: string;
  }>;
  vehicleCapacity: number;
  optimizationLevel?: 'quick' | 'standard' | 'thorough';
}): Promise<{
  routes: Array<{
    route_id: number;
    trips: number[];
    total_passengers: number;
    capacity_used: number;
  }>;
  method: 'ai' | 'fallback';
  improvement?: number;
  processingTimeMs: number;
}> {
  const { getRouteOptimizationAI } = await import('./ai/routeOptimization.ai.service');
  const aiService = getRouteOptimizationAI();

  const result = await aiService.execute({
    trips: params.trips,
    vehicleCapacity: params.vehicleCapacity,
    optimizationLevel: params.optimizationLevel
  });

  return {
    routes: result.data.routes,
    method: result.method,
    improvement: result.data.improvement,
    processingTimeMs: result.processingTimeMs
  };
}

export const routeOptimizationService = {
  geocodeAddress,
  calculateDistance,
  calculateRouteWithWaypoint,
  estimatePostcodeProximity,
  destinationsSimilar,
  calculateCompatibilityScore,
  batchOptimizeRoutes,
  checkCapacityConstraint,
  optimizeWithCapacity,
  optimizeWithCapacityAI
};
