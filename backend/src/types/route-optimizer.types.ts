/**
 * Route Optimizer Types
 *
 * TypeScript interfaces for route optimization functionality
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  address: string;
  postcode?: string;
}

export interface TripForOptimization {
  trip_id: number;
  driver_id?: number | null;
  date: string;
  pickup_time?: string;
  pickup_location: string | Location;
  pickup_address?: string;
  destination: string | Location;
  destination_address?: string;
  passengers?: number;
  customer_id?: number;
  customer_name?: string;
}

export interface GeocodedTrip extends TripForOptimization {
  pickupCoords?: Coordinates | null;
  destCoords?: Coordinates | null;
}

export interface DriverForOptimization {
  driver_id: number;
  vehicle_capacity?: number;
  start_location?: Location;
  name?: string;
}

export interface GoogleMapsElement {
  status: string;
  distance?: {
    value: number;
    text: string;
  };
  duration?: {
    value: number;
    text: string;
  };
}

export interface GoogleMapsRow {
  elements: GoogleMapsElement[];
}

export interface GoogleMapsResponse {
  status: string;
  rows: GoogleMapsRow[];
}

export interface OptimizationScore {
  driverId: number | null;
  driverName: string;
  trips: TripForOptimization[];
  totalDistance: number;
  totalDuration: number;
  capacityUsed: number;
  efficiency: number;
}

export interface RouteAnalytics {
  totalTrips: number;
  totalDrivers: number;
  averageTripsPerDriver: number;
  driverUtilization: DriverUtilization[];
  peakHours: PeakHour[];
}

export interface DriverUtilization {
  driverId: number;
  driverName: string;
  tripCount: number;
  utilization: number;
}

export interface PeakHour {
  hour: number;
  tripCount: number;
}

export interface RouteOptimizationStats {
  totalDistance: number;
  originalDistance: number;
  savings: number;
}

export interface CapacityOptimizationResult {
  routes: RouteAssignment[];
  statistics: CapacityStatistics;
}

export interface RouteAssignment {
  driver_id?: number;
  trips: TripForOptimization[];
  capacity_used?: number;
  total_passengers?: number;
}

export interface CapacityStatistics {
  totalPassengers: number;
  averageCapacityUsed: number;
  vehiclesNeeded: number;
}
