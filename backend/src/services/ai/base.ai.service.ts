/**
 * Base AI Service
 *
 * Abstract base class for all AI services.
 * Implements the graceful degradation pattern:
 * 1. Try AI-powered method
 * 2. If AI disabled/fails, fall back to standard method
 * 3. Log appropriately
 * 4. Track costs
 */

import { logger } from '../../utils/logger';
import { isAIFeatureAvailable, trackAICost } from '../../config/ai.config';

export interface AIServiceResult<T> {
  data: T;
  method: 'ai' | 'fallback';
  confidence?: number;
  processingTimeMs: number;
  costUSD?: number;
}

export abstract class BaseAIService<TInput, TOutput> {
  protected abstract featureName: keyof import('../../config/ai.config').AIConfig['features'];
  protected abstract serviceName: string;

  /**
   * Main entry point - tries AI, falls back to standard
   */
  public async execute(input: TInput): Promise<AIServiceResult<TOutput>> {
    const startTime = Date.now();

    // Check if AI is available for this feature
    if (!isAIFeatureAvailable(this.featureName)) {
      logger.debug(`${this.serviceName}: AI not available, using fallback`, {
        feature: this.featureName
      });
      return await this.executeFallback(input, startTime);
    }

    // Try AI-powered method
    try {
      logger.debug(`${this.serviceName}: Attempting AI method`, {
        feature: this.featureName
      });
      const result = await this.executeAI(input);
      const processingTime = Date.now() - startTime;

      // Track cost if applicable
      if (result.costUSD) {
        trackAICost(result.costUSD, this.serviceName, {
          feature: this.featureName,
          processingTimeMs: processingTime
        });
      }

      logger.info(`${this.serviceName}: AI method succeeded`, {
        feature: this.featureName,
        processingTimeMs: processingTime,
        confidence: result.confidence,
        costUSD: result.costUSD
      });

      return {
        data: result.data,
        method: 'ai',
        confidence: result.confidence,
        processingTimeMs: processingTime,
        costUSD: result.costUSD
      };
    } catch (error: any) {
      logger.warn(`${this.serviceName}: AI method failed, using fallback`, {
        feature: this.featureName,
        error: error.message,
        stack: error.stack
      });
      return await this.executeFallback(input, startTime);
    }
  }

  /**
   * AI-powered implementation
   * Must be implemented by each AI service
   */
  protected abstract executeAI(input: TInput): Promise<{
    data: TOutput;
    confidence?: number;
    costUSD?: number;
  }>;

  /**
   * Fallback implementation (rule-based/standard algorithm)
   * Must be implemented by each AI service
   */
  protected abstract executeFallbackLogic(input: TInput): Promise<TOutput> | TOutput;

  /**
   * Execute fallback with timing
   */
  private async executeFallback(input: TInput, startTime: number): Promise<AIServiceResult<TOutput>> {
    const data = await this.executeFallbackLogic(input);
    const processingTime = Date.now() - startTime;

    logger.info(`${this.serviceName}: Fallback method completed`, {
      feature: this.featureName,
      processingTimeMs: processingTime
    });

    return {
      data,
      method: 'fallback',
      processingTimeMs: processingTime
    };
  }

  /**
   * Validate input (can be overridden)
   */
  protected validateInput(input: TInput): void {
    if (!input) {
      throw new Error(`${this.serviceName}: Input is required`);
    }
  }

  /**
   * Call external AI service (helper method)
   */
  protected async callExternalAI<TRequest, TResponse>(params: {
    url: string;
    method: 'GET' | 'POST';
    data?: TRequest;
    timeout?: number;
    estimatedCostUSD?: number;
  }): Promise<TResponse> {
    const axios = require('axios');

    try {
      const response = await axios({
        method: params.method,
        url: params.url,
        data: params.data,
        timeout: params.timeout || 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error(`${this.serviceName}: External AI service call failed`, {
        url: params.url,
        error: error.message
      });
      throw new Error(`AI service unavailable: ${error.message}`);
    }
  }
}

/**
 * Example AI Service Implementation
 * Shows how to extend BaseAIService
 */
export class ExampleAIService extends BaseAIService<
  { value: number },
  { result: number; explanation: string }
> {
  protected featureName = 'routeOptimization' as const;
  protected serviceName = 'ExampleAIService';

  protected async executeAI(input: { value: number }) {
    // Example: Call external AI service
    // const response = await this.callExternalAI({
    //   url: 'http://ai-service/predict',
    //   method: 'POST',
    //   data: input,
    //   estimatedCostUSD: 0.001
    // });

    // For demo purposes, simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      data: {
        result: input.value * 2,
        explanation: 'AI-powered calculation'
      },
      confidence: 0.95,
      costUSD: 0.001
    };
  }

  protected async executeFallbackLogic(input: { value: number }) {
    // Simple rule-based calculation
    return {
      result: input.value * 2,
      explanation: 'Rule-based calculation'
    };
  }
}

/**
 * AI Service Factory
 * Centralized way to get AI service instances
 */
export class AIServiceFactory {
  private static instances: Map<string, any> = new Map();

  static getInstance<T extends BaseAIService<any, any>>(
    ServiceClass: new () => T
  ): T {
    const key = ServiceClass.name;
    if (!this.instances.has(key)) {
      this.instances.set(key, new ServiceClass());
    }
    return this.instances.get(key);
  }

  static clearInstances(): void {
    this.instances.clear();
  }
}
