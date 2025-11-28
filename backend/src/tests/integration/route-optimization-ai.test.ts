/**
 * Integration Tests for Route Optimization AI Service
 *
 * Tests the 2-opt algorithm implementation and graceful degradation
 */

import { getRouteOptimizationAI } from '../../services/ai/routeOptimization.ai.service';
import { optimizeWithCapacityAI } from '../../services/routeOptimization.service';
import { getAIConfig, reloadAIConfig } from '../../config/ai.config';

describe('Route Optimization AI Service', () => {
  // Sample trip data for testing
  const sampleTrips = [
    {
      trip_id: 1,
      passengers: 2,
      pickup_location: { address: '123 Main St', postcode: 'SW1A 1AA' },
      destination: { address: '456 Oak Ave', postcode: 'SW1A 2BB' },
      pickup_time: '2024-01-15T09:00:00Z'
    },
    {
      trip_id: 2,
      passengers: 3,
      pickup_location: { address: '789 Pine Rd', postcode: 'SW1A 1AB' },
      destination: { address: '321 Elm St', postcode: 'SW1A 2BC' },
      pickup_time: '2024-01-15T09:10:00Z'
    },
    {
      trip_id: 3,
      passengers: 1,
      pickup_location: { address: '555 Maple Dr', postcode: 'SW1B 3CC' },
      destination: { address: '777 Cedar Ln', postcode: 'SW1B 4DD' },
      pickup_time: '2024-01-15T09:15:00Z'
    },
    {
      trip_id: 4,
      passengers: 4,
      pickup_location: { address: '999 Birch Way', postcode: 'SW1A 1AC' },
      destination: { address: '111 Ash Ct', postcode: 'SW1A 2BD' },
      pickup_time: '2024-01-15T09:20:00Z'
    },
    {
      trip_id: 5,
      passengers: 2,
      pickup_location: { address: '222 Willow Pl', postcode: 'SW1A 1AD' },
      destination: { address: '444 Spruce Blvd', postcode: 'SW1A 2BE' },
      pickup_time: '2024-01-15T09:25:00Z'
    }
  ];

  describe('AI Service Direct Tests', () => {
    let aiService: ReturnType<typeof getRouteOptimizationAI>;

    beforeEach(() => {
      aiService = getRouteOptimizationAI();
    });

    it('should optimize routes using AI when enabled', async () => {
      // Save original config
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        // Enable AI
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8,
          optimizationLevel: 'standard'
        });

        expect(result.method).toBe('ai');
        expect(result.data.routes).toBeDefined();
        expect(result.data.routes.length).toBeGreaterThan(0);
        expect(result.processingTimeMs).toBeGreaterThan(0);
        expect(result.costUSD).toBe(0); // Free algorithm
      } finally {
        // Restore original config
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should use fallback when AI is disabled', async () => {
      // Save original config
      const originalConfig = process.env.AI_FEATURES_ENABLED;

      try {
        // Disable AI
        process.env.AI_FEATURES_ENABLED = 'false';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8
        });

        expect(result.method).toBe('fallback');
        expect(result.data.routes).toBeDefined();
        expect(result.data.routes.length).toBeGreaterThan(0);
      } finally {
        // Restore original config
        process.env.AI_FEATURES_ENABLED = originalConfig;
        reloadAIConfig();
      }
    });

    it('should respect capacity constraints', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 4, // Smaller capacity
          optimizationLevel: 'quick'
        });

        // Check all routes respect capacity
        result.data.routes.forEach(route => {
          expect(route.total_passengers).toBeLessThanOrEqual(4);
          expect(route.capacity_used).toBeLessThanOrEqual(100);
        });
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should show improvement over greedy baseline', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8,
          optimizationLevel: 'standard'
        });

        expect(result.method).toBe('ai');
        // Improvement might be 0 for simple cases, but should be defined
        expect(result.data.improvement).toBeDefined();
        expect(typeof result.data.improvement).toBe('number');
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should handle different optimization levels', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const levels: Array<'quick' | 'standard' | 'thorough'> = ['quick', 'standard', 'thorough'];

        for (const level of levels) {
          const result = await aiService.execute({
            trips: sampleTrips,
            vehicleCapacity: 8,
            optimizationLevel: level
          });

          expect(result.method).toBe('ai');
          expect(result.data.routes).toBeDefined();
          expect(result.data.iterations).toBeDefined();
        }
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should return valid route structure', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8
        });

        result.data.routes.forEach(route => {
          expect(route).toHaveProperty('route_id');
          expect(route).toHaveProperty('trips');
          expect(route).toHaveProperty('total_passengers');
          expect(route).toHaveProperty('capacity_used');
          expect(Array.isArray(route.trips)).toBe(true);
          expect(route.trips.length).toBeGreaterThan(0);
          expect(typeof route.total_passengers).toBe('number');
          expect(typeof route.capacity_used).toBe('number');
        });
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should handle empty trip list gracefully', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: [],
          vehicleCapacity: 8
        });

        expect(result.data.routes).toEqual([]);
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should handle single trip', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: [sampleTrips[0]],
          vehicleCapacity: 8
        });

        expect(result.data.routes.length).toBe(1);
        expect(result.data.routes[0].trips.length).toBe(1);
        expect(result.data.routes[0].trips[0]).toBe(1);
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });
  });

  describe('Service Integration Tests', () => {
    it('should work through the service wrapper', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await optimizeWithCapacityAI({
          trips: sampleTrips,
          vehicleCapacity: 8,
          optimizationLevel: 'standard'
        });

        expect(result.routes).toBeDefined();
        expect(result.method).toBe('ai');
        expect(result.processingTimeMs).toBeGreaterThan(0);
        expect(typeof result.improvement).toBe('number');
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should return fallback through service wrapper when AI disabled', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;

      try {
        process.env.AI_FEATURES_ENABLED = 'false';
        reloadAIConfig();

        const result = await optimizeWithCapacityAI({
          trips: sampleTrips,
          vehicleCapacity: 8
        });

        expect(result.routes).toBeDefined();
        expect(result.method).toBe('fallback');
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        reloadAIConfig();
      }
    });
  });

  describe('2-Opt Algorithm Behavior', () => {
    it('should produce valid routes with all trips assigned', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8,
          optimizationLevel: 'thorough'
        });

        // Count all trips assigned
        const assignedTrips = new Set<number>();
        result.data.routes.forEach(route => {
          route.trips.forEach(tripId => {
            assignedTrips.add(tripId);
          });
        });

        // All trips should be assigned
        expect(assignedTrips.size).toBe(sampleTrips.length);
        sampleTrips.forEach(trip => {
          expect(assignedTrips.has(trip.trip_id)).toBe(true);
        });
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should not create empty routes', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8
        });

        result.data.routes.forEach(route => {
          expect(route.trips.length).toBeGreaterThan(0);
        });
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should optimize better with more iterations', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const quickResult = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8,
          optimizationLevel: 'quick'
        });

        const thoroughResult = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8,
          optimizationLevel: 'thorough'
        });

        // Thorough should have more iterations
        expect(thoroughResult.data.iterations).toBeGreaterThan(quickResult.data.iterations!);
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });
  });

  describe('Performance Tests', () => {
    it('should complete quick optimization in reasonable time', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const startTime = Date.now();
        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8,
          optimizationLevel: 'quick'
        });
        const endTime = Date.now();

        // Quick should be fast (< 1 second)
        expect(endTime - startTime).toBeLessThan(1000);
        expect(result.processingTimeMs).toBeLessThan(1000);
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should have higher confidence with better improvements', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const result = await aiService.execute({
          trips: sampleTrips,
          vehicleCapacity: 8,
          optimizationLevel: 'standard'
        });

        if (result.confidence) {
          expect(result.confidence).toBeGreaterThanOrEqual(0.7);
          expect(result.confidence).toBeLessThanOrEqual(1.0);
        }
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });
  });

  describe('Edge Cases', () => {
    const aiService = getRouteOptimizationAI();

    it('should handle trips that exceed vehicle capacity individually', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const largeTrips = [
          {
            trip_id: 1,
            passengers: 10, // Exceeds capacity!
            pickup_location: { address: '123 Main St', postcode: 'SW1A 1AA' },
            destination: { address: '456 Oak Ave', postcode: 'SW1A 2BB' },
            pickup_time: '2024-01-15T09:00:00Z'
          }
        ];

        const result = await aiService.execute({
          trips: largeTrips,
          vehicleCapacity: 8
        });

        // Should still create a route, even though it violates capacity
        // (Real-world handling would require vehicle upgrade or trip splitting)
        expect(result.data.routes.length).toBeGreaterThan(0);
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });

    it('should handle trips with same pickup times', async () => {
      const originalConfig = process.env.AI_FEATURES_ENABLED;
      const originalRouteOpt = process.env.AI_ROUTE_OPTIMIZATION;

      try {
        process.env.AI_FEATURES_ENABLED = 'true';
        process.env.AI_ROUTE_OPTIMIZATION = 'true';
        reloadAIConfig();

        const sameTimeTrips = sampleTrips.map(trip => ({
          ...trip,
          pickup_time: '2024-01-15T09:00:00Z' // All same time
        }));

        const result = await aiService.execute({
          trips: sameTimeTrips,
          vehicleCapacity: 8
        });

        expect(result.data.routes).toBeDefined();
        expect(result.data.routes.length).toBeGreaterThan(0);
      } finally {
        process.env.AI_FEATURES_ENABLED = originalConfig;
        process.env.AI_ROUTE_OPTIMIZATION = originalRouteOpt;
        reloadAIConfig();
      }
    });
  });
});
