/**
 * AI Configuration System
 *
 * Central configuration for all AI features in the system.
 * All AI features are OPTIONAL and will gracefully fall back to rule-based systems.
 *
 * Key Principles:
 * 1. AI features are disabled by default
 * 2. System works perfectly without AI
 * 3. All AI calls include fallback mechanisms
 * 4. Budget limits prevent runaway costs
 * 5. Feature flags control granular AI capabilities
 */

import { logger } from '../utils/logger';

export interface AIFeatureConfig {
  enabled: boolean;
  fallbackEnabled: boolean;
  description: string;
}

export interface AIBudgetConfig {
  maxDailyCostUSD: number;
  alertThresholdPercent: number;
  currentDailySpend: number;
  lastResetDate: string;
}

export interface AIConfig {
  globalEnabled: boolean;
  features: {
    routeOptimization: AIFeatureConfig & {
      provider: 'google-or-tools' | 'standard';
      maxComputeTimeMs: number;
    };
    demandForecasting: AIFeatureConfig & {
      historyDays: number;
      forecastDays: number;
    };
    predictiveMaintenance: AIFeatureConfig & {
      minDataPoints: number;
      confidenceThreshold: number;
    };
    noShowPrediction: AIFeatureConfig & {
      riskThreshold: number;
      minHistoricalBookings: number;
    };
  };
  budget: AIBudgetConfig;
  services: {
    pythonAIServiceUrl?: string;
    openAIApiKey?: string;
    googleMapsApiKey?: string;
  };
}

/**
 * Load AI configuration from environment variables
 */
export function loadAIConfig(): AIConfig {
  const config: AIConfig = {
    // Global AI toggle - master switch for all AI features
    globalEnabled: process.env.AI_FEATURES_ENABLED === 'true',

    features: {
      routeOptimization: {
        enabled: process.env.AI_ROUTE_OPTIMIZATION === 'true',
        fallbackEnabled: true, // Always fallback to standard algorithm
        description: 'AI-enhanced route optimization using OR-Tools or similar',
        provider: (process.env.AI_ROUTE_PROVIDER as any) || 'standard',
        maxComputeTimeMs: parseInt(process.env.AI_ROUTE_MAX_COMPUTE_MS || '5000', 10)
      },

      demandForecasting: {
        enabled: process.env.AI_DEMAND_FORECASTING === 'true',
        fallbackEnabled: true, // Fallback to historical averages
        description: 'Predict booking demand patterns using time series analysis',
        historyDays: parseInt(process.env.AI_FORECAST_HISTORY_DAYS || '90', 10),
        forecastDays: parseInt(process.env.AI_FORECAST_DAYS || '30', 10)
      },

      predictiveMaintenance: {
        enabled: process.env.AI_PREDICTIVE_MAINTENANCE === 'true',
        fallbackEnabled: true, // Fallback to scheduled maintenance
        description: 'Predict vehicle maintenance needs using ML',
        minDataPoints: parseInt(process.env.AI_MAINTENANCE_MIN_DATA || '10', 10),
        confidenceThreshold: parseFloat(process.env.AI_MAINTENANCE_CONFIDENCE || '0.7')
      },

      noShowPrediction: {
        enabled: process.env.AI_NOSHOW_PREDICTION === 'true',
        fallbackEnabled: true, // Fallback to simple rule-based check
        description: 'Predict booking no-show likelihood',
        riskThreshold: parseInt(process.env.AI_NOSHOW_THRESHOLD || '70', 10),
        minHistoricalBookings: parseInt(process.env.AI_NOSHOW_MIN_HISTORY || '5', 10)
      }
    },

    budget: {
      maxDailyCostUSD: parseFloat(process.env.AI_MAX_DAILY_COST || '10'),
      alertThresholdPercent: parseFloat(process.env.AI_BUDGET_ALERT_THRESHOLD || '80'),
      currentDailySpend: 0,
      lastResetDate: new Date().toISOString().split('T')[0]
    },

    services: {
      pythonAIServiceUrl: process.env.AI_SERVICE_URL,
      openAIApiKey: process.env.OPENAI_API_KEY,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    }
  };

  // Log AI configuration on startup
  if (config.globalEnabled) {
    logger.info('AI features enabled', {
      routeOptimization: config.features.routeOptimization.enabled,
      demandForecasting: config.features.demandForecasting.enabled,
      predictiveMaintenance: config.features.predictiveMaintenance.enabled,
      noShowPrediction: config.features.noShowPrediction.enabled,
      dailyBudget: config.budget.maxDailyCostUSD
    });
  } else {
    logger.info('AI features disabled - using standard algorithms');
  }

  return config;
}

// Singleton instance
let aiConfigInstance: AIConfig | null = null;

/**
 * Get current AI configuration
 */
export function getAIConfig(): AIConfig {
  if (!aiConfigInstance) {
    aiConfigInstance = loadAIConfig();
  }
  return aiConfigInstance;
}

/**
 * Reload AI configuration (useful for dynamic updates)
 */
export function reloadAIConfig(): AIConfig {
  aiConfigInstance = loadAIConfig();
  return aiConfigInstance;
}

/**
 * Check if a specific AI feature is enabled and available
 */
export function isAIFeatureAvailable(feature: keyof AIConfig['features']): boolean {
  const config = getAIConfig();

  // Global AI must be enabled
  if (!config.globalEnabled) {
    return false;
  }

  // Feature-specific check
  if (!config.features[feature].enabled) {
    return false;
  }

  // Budget check
  if (config.budget.currentDailySpend >= config.budget.maxDailyCostUSD) {
    logger.warn('AI daily budget exceeded', {
      feature,
      spent: config.budget.currentDailySpend,
      limit: config.budget.maxDailyCostUSD
    });
    return false;
  }

  return true;
}

/**
 * Track AI service cost
 * Updates the daily spend and checks against budget
 */
export function trackAICost(costUSD: number, feature: string, details?: any): void {
  const config = getAIConfig();
  const today = new Date().toISOString().split('T')[0];

  // Reset daily spend if it's a new day
  if (config.budget.lastResetDate !== today) {
    config.budget.currentDailySpend = 0;
    config.budget.lastResetDate = today;
    logger.info('AI budget reset for new day', { date: today });
  }

  // Add cost
  config.budget.currentDailySpend += costUSD;

  logger.info('AI cost tracked', {
    feature,
    cost: costUSD,
    dailyTotal: config.budget.currentDailySpend,
    limit: config.budget.maxDailyCostUSD,
    details
  });

  // Alert if approaching budget limit
  const percentUsed = (config.budget.currentDailySpend / config.budget.maxDailyCostUSD) * 100;
  if (percentUsed >= config.budget.alertThresholdPercent) {
    logger.warn('AI budget alert', {
      percentUsed: percentUsed.toFixed(1),
      spent: config.budget.currentDailySpend,
      limit: config.budget.maxDailyCostUSD
    });
  }

  // Hard stop if budget exceeded
  if (config.budget.currentDailySpend >= config.budget.maxDailyCostUSD) {
    logger.error('AI daily budget exceeded - AI features will be disabled', {
      spent: config.budget.currentDailySpend,
      limit: config.budget.maxDailyCostUSD
    });
  }
}

/**
 * Get AI budget status
 */
export function getAIBudgetStatus(): {
  dailySpent: number;
  dailyLimit: number;
  percentUsed: number;
  remaining: number;
  budgetExceeded: boolean;
} {
  const config = getAIConfig();
  const percentUsed = (config.budget.currentDailySpend / config.budget.maxDailyCostUSD) * 100;

  return {
    dailySpent: config.budget.currentDailySpend,
    dailyLimit: config.budget.maxDailyCostUSD,
    percentUsed,
    remaining: Math.max(0, config.budget.maxDailyCostUSD - config.budget.currentDailySpend),
    budgetExceeded: config.budget.currentDailySpend >= config.budget.maxDailyCostUSD
  };
}

/**
 * Health check for AI services
 */
export async function checkAIServicesHealth(): Promise<{
  pythonService: 'available' | 'unavailable' | 'not_configured';
  openAI: 'available' | 'unavailable' | 'not_configured';
  googleMaps: 'available' | 'unavailable' | 'not_configured';
}> {
  const config = getAIConfig();

  return {
    pythonService: config.services.pythonAIServiceUrl
      ? 'unavailable' // TODO: Implement actual health check
      : 'not_configured',
    openAI: config.services.openAIApiKey
      ? 'unavailable' // TODO: Implement actual health check
      : 'not_configured',
    googleMaps: config.services.googleMapsApiKey
      ? 'available' // Already integrated
      : 'not_configured'
  };
}

/**
 * Get AI features summary for admin dashboard
 */
export function getAIFeaturesSummary(): {
  globalStatus: 'enabled' | 'disabled';
  features: Array<{
    name: string;
    enabled: boolean;
    description: string;
    hasValidConfig: boolean;
  }>;
  budget: {
    dailySpent: number;
    dailyLimit: number;
    percentUsed: number;
  };
} {
  const config = getAIConfig();
  const budgetStatus = getAIBudgetStatus();

  return {
    globalStatus: config.globalEnabled ? 'enabled' : 'disabled',
    features: [
      {
        name: 'Route Optimization',
        enabled: config.features.routeOptimization.enabled,
        description: config.features.routeOptimization.description,
        hasValidConfig: true
      },
      {
        name: 'Demand Forecasting',
        enabled: config.features.demandForecasting.enabled,
        description: config.features.demandForecasting.description,
        hasValidConfig: !!config.services.pythonAIServiceUrl
      },
      {
        name: 'Predictive Maintenance',
        enabled: config.features.predictiveMaintenance.enabled,
        description: config.features.predictiveMaintenance.description,
        hasValidConfig: !!config.services.pythonAIServiceUrl
      },
      {
        name: 'No-Show Prediction',
        enabled: config.features.noShowPrediction.enabled,
        description: config.features.noShowPrediction.description,
        hasValidConfig: true
      }
    ],
    budget: {
      dailySpent: budgetStatus.dailySpent,
      dailyLimit: budgetStatus.dailyLimit,
      percentUsed: budgetStatus.percentUsed
    }
  };
}
