import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific file
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

// Load base .env first, then environment-specific overrides
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

export const config = {
  env,
  port: parseInt(process.env.PORT || '3001', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'travel_support',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRATION || '24h',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY!,
  },

  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
    },
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  ai: {
    enabled: process.env.AI_FEATURES_ENABLED === 'true',
    routeOptimization: process.env.AI_ROUTE_OPTIMIZATION === 'true',
    provider: process.env.AI_ROUTE_PROVIDER || 'standard',
    serviceUrl: process.env.AI_SERVICE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
    maxDailyCost: parseFloat(process.env.AI_MAX_DAILY_COST || '10'),
    budgetAlertThreshold: parseInt(process.env.AI_BUDGET_ALERT_THRESHOLD || '80', 10),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  timezone: process.env.SYSTEM_TIMEZONE || 'Europe/London',
};

// Validate required environment variables
const required = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DB_PASSWORD'];
const missing: string[] = [];

for (const key of required) {
  if (!process.env[key]) {
    missing.push(key);
  }
}

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\n` +
    `Please ensure these are set in your .env file or environment.`
  );
}

// Validate encryption key length (should be 64 hex characters = 32 bytes)
if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)\n' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

// Log configuration (without sensitive data)
if (env === 'development') {
  console.log('Configuration loaded:', {
    env,
    port: config.port,
    database: {
      host: config.database.host,
      port: config.database.port,
      name: config.database.name,
      ssl: config.database.ssl,
    },
    ai: {
      enabled: config.ai.enabled,
      routeOptimization: config.ai.routeOptimization,
    },
    timezone: config.timezone,
  });
}

export default config;
