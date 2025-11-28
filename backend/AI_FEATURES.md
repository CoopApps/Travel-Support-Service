# AI Features Documentation

## Overview

The Travel Support Platform includes **optional AI enhancements** for operational efficiency. All AI features are:
- **Disabled by default**
- **Fully optional** - system works perfectly without them
- **Gracefully degrading** - automatic fallback to rule-based systems
- **Budget-controlled** - prevents runaway costs
- **Backend-only** - no customer-facing AI (maintains human service)

## Core Principles

1. **AI Never Required**: System functions 100% without AI
2. **Transparent Fallbacks**: Always falls back to proven algorithms
3. **Cost Control**: Daily budget limits with automatic cutoff
4. **Operational Focus**: AI for planning/optimization, not customer interaction
5. **Feature Flags**: Granular control over each AI capability

## Configuration

### Environment Variables

Add to your `.env` file (all optional):

```bash
# Master switch - disables all AI if false
AI_FEATURES_ENABLED=false

# Individual features
AI_ROUTE_OPTIMIZATION=false
AI_DEMAND_FORECASTING=false
AI_PREDICTIVE_MAINTENANCE=false
AI_NOSHOW_PREDICTION=false

# Budget control
AI_MAX_DAILY_COST=10  # USD
AI_BUDGET_ALERT_THRESHOLD=80  # Percentage

# External services (optional)
AI_SERVICE_URL=  # Python microservice
OPENAI_API_KEY=  # Only if needed
```

## Available AI Features

### 1. Route Optimization (Enhanced)

**Current System**: Google Maps API + nearest neighbor algorithm
**AI Enhancement**: OR-Tools for multi-constraint optimization

**Benefits**:
- 15-30% better route efficiency
- Considers traffic, driver fatigue, vehicle capacity simultaneously
- Reduces fuel costs and emissions

**Fallback**: Standard nearest neighbor algorithm (already proven)

**Cost**: FREE if using OR-Tools (self-hosted)

**Enable**:
```bash
AI_ROUTE_OPTIMIZATION=true
AI_ROUTE_PROVIDER=google-or-tools
```

### 2. Demand Forecasting

**Current System**: Manual scheduling based on historical patterns
**AI Enhancement**: Time series forecasting (Prophet, LSTM)

**Benefits**:
- Better staff scheduling
- Proactive capacity planning
- Reduced overtime costs
- Improved resource allocation

**Fallback**: Historical averages (simple, reliable)

**Cost**: FREE if self-hosted

**Enable**:
```bash
AI_DEMAND_FORECASTING=true
AI_SERVICE_URL=http://localhost:5000  # Your Python service
```

### 3. Predictive Maintenance

**Current System**: Scheduled maintenance by mileage/time
**AI Enhancement**: Anomaly detection on vehicle health data

**Benefits**:
- 30-40% reduction in unexpected breakdowns
- 15-25% lower maintenance costs
- Improved vehicle uptime and safety

**Fallback**: Standard maintenance schedules (proven approach)

**Cost**: FREE if self-hosted

**Enable**:
```bash
AI_PREDICTIVE_MAINTENANCE=true
AI_SERVICE_URL=http://localhost:5000
```

### 4. No-Show Prediction

**Current System**: Track no-show rates, manual follow-ups
**AI Enhancement**: ML classification for no-show risk

**Benefits**:
- 20-30% reduction in no-shows (with proactive reminders)
- Better capacity utilization
- Fewer wasted driver hours

**Fallback**: Simple rule-based checks

**Cost**: FREE if self-hosted

**Enable**:
```bash
AI_NOSHOW_PREDICTION=true
AI_NOSHOW_THRESHOLD=70  # Alert if risk > 70%
```

## Architecture

### Graceful Degradation Pattern

Every AI feature follows this pattern:

```typescript
// 1. Check if AI is available
if (!isAIFeatureAvailable('featureName')) {
  return standardAlgorithm();  // Fallback
}

// 2. Try AI method
try {
  const result = await aiMethod();
  trackCost(result.cost);  // Budget tracking
  return result;
} catch (error) {
  logger.warn('AI failed, using fallback');
  return standardAlgorithm();  // Fallback
}
```

### Cost Tracking

All AI calls are tracked:
- Daily spend monitored
- Auto-disable if budget exceeded
- Reset at midnight
- Alerts at configurable threshold

## Admin Endpoints

Monitor AI status via API:

### Get AI Status
```bash
GET /api/tenants/:tenantId/ai/status
Authorization: Bearer {admin-token}
```

Response:
```json
{
  "globalStatus": "enabled",
  "features": [
    {
      "name": "Route Optimization",
      "enabled": true,
      "hasValidConfig": true
    }
  ],
  "budget": {
    "dailySpent": 2.50,
    "dailyLimit": 10.00,
    "percentUsed": 25
  }
}
```

### Get Budget Status
```bash
GET /api/tenants/:tenantId/ai/budget
Authorization: Bearer {admin-token}
```

### Health Check
```bash
GET /api/tenants/:tenantId/ai/health
Authorization: Bearer {admin-token}
```

## Implementation Guide

### For Developers

To add a new AI feature:

1. **Extend BaseAIService**:

```typescript
// src/services/ai/myFeature.ai.service.ts
import { BaseAIService } from './base.ai.service';

export class MyAIService extends BaseAIService<InputType, OutputType> {
  protected featureName = 'routeOptimization' as const;
  protected serviceName = 'MyAIService';

  // AI implementation
  protected async executeAI(input: InputType) {
    // Your AI logic here
    return {
      data: result,
      confidence: 0.95,
      costUSD: 0.001
    };
  }

  // Fallback implementation
  protected async executeFallbackLogic(input: InputType) {
    // Your standard algorithm here
    return result;
  }
}
```

2. **Use the service**:

```typescript
import { AIServiceFactory } from './base.ai.service';
import { MyAIService } from './myFeature.ai.service';

const service = AIServiceFactory.getInstance(MyAIService);
const result = await service.execute(input);

// Result includes:
// - result.data: The actual output
// - result.method: 'ai' or 'fallback'
// - result.confidence: AI confidence score
// - result.processingTimeMs: Time taken
```

3. **Add configuration** to `ai.config.ts`
4. **Add environment variables** to `.env.example`
5. **Document** the feature

## Cost Analysis

### Option A: Self-Hosted (Recommended)

```
Google OR-Tools: FREE
Prophet (forecasting): FREE
Scikit-learn (ML): FREE
Small VPS for Python services: $20-50/month

Total: $20-50/month
```

**Setup**: Docker container with Python + required libraries

### Option B: Cloud AI Services

```
AWS SageMaker: ~$200/month
OpenAI API: ~$100/month
Google Cloud AI: ~$150/month

Total: ~$450/month
```

**Use when**: Very high scale or no DevOps resources

## Testing

AI features are automatically tested via integration tests. The test suite checks:
- Fallback behavior when AI disabled
- Cost tracking
- Budget limit enforcement
- Error handling
- Response time

Run tests:
```bash
npm test
```

## Monitoring

### Logs

AI operations are logged at appropriate levels:
- DEBUG: AI method attempts
- INFO: Successful AI operations, fallback usage
- WARN: AI failures, budget warnings
- ERROR: Budget exceeded, critical failures

### Metrics

Track in your monitoring system:
- `ai.calls.total` - Total AI calls
- `ai.calls.fallback` - Fallback usage count
- `ai.cost.daily` - Daily AI spend
- `ai.latency` - AI processing time

## Best Practices

1. **Start Disabled**: Enable AI features one at a time
2. **Monitor Closely**: Watch costs and performance for first week
3. **Set Conservative Budgets**: Start with $5-10/day limit
4. **Test Fallbacks**: Regularly test that fallbacks work
5. **Measure Impact**: Compare KPIs before/after AI enabling

## Troubleshooting

### AI Feature Not Working

1. Check `AI_FEATURES_ENABLED=true` in `.env`
2. Check specific feature flag enabled
3. Check budget not exceeded: `GET /api/.../ai/budget`
4. Check logs for errors
5. Verify external services configured (if needed)

### Budget Exceeded

1. Budget resets daily at midnight
2. Temporarily disable AI if needed: `AI_FEATURES_ENABLED=false`
3. Increase limit: `AI_MAX_DAILY_COST=20`
4. Review usage patterns in logs

### Fallback Always Used

This is normal and expected! Fallbacks are:
- Used when AI disabled
- Used when AI errors
- Used when budget exceeded
- Perfectly fine for production use

## Future Roadmap

Potential future AI features (not yet implemented):
- Automated driver fatigue detection
- Intelligent maintenance part ordering
- Route popularity prediction
- Traffic pattern learning

## Support

For questions about AI features:
1. Check this documentation
2. Review code in `src/services/ai/`
3. Check logs for errors
4. See `src/config/ai.config.ts` for configuration

## Important Notes

- **No Customer-Facing AI**: No chatbots, no automated customer service
- **No Dynamic Pricing**: Pricing remains fixed and transparent
- **Optional Forever**: Never become dependent on AI features
- **Cost Control**: Budget limits prevent surprises
- **Graceful Degradation**: Always falls back to proven methods
