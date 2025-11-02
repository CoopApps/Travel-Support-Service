/**
 * Environment Variables Validation
 *
 * Validates that all required environment variables are present and correctly formatted.
 * This prevents the server from starting with invalid configuration.
 */

interface EnvVar {
  key: string;
  required: boolean;
  validator?: (value: string) => boolean;
  errorMessage?: string;
}

const ENV_VARS: EnvVar[] = [
  // Database
  {
    key: 'DB_HOST',
    required: true,
  },
  {
    key: 'DB_PORT',
    required: true,
    validator: (value) => !isNaN(parseInt(value)),
    errorMessage: 'DB_PORT must be a valid number',
  },
  {
    key: 'DB_NAME',
    required: true,
  },
  {
    key: 'DB_USER',
    required: true,
  },
  {
    key: 'DB_PASSWORD',
    required: true,
  },
  // Security
  {
    key: 'JWT_SECRET',
    required: true,
    validator: (value) => value.length >= 32,
    errorMessage: 'JWT_SECRET must be at least 32 characters for security',
  },
  // Server
  {
    key: 'PORT',
    required: false,
    validator: (value) => !isNaN(parseInt(value)),
    errorMessage: 'PORT must be a valid number',
  },
  {
    key: 'NODE_ENV',
    required: false,
    validator: (value) => ['development', 'production', 'test'].includes(value),
    errorMessage: 'NODE_ENV must be development, production, or test',
  },
];

export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('\n🔍 Validating environment variables...\n');

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.key];

    // Check if required variable is missing
    if (envVar.required && !value) {
      errors.push(`❌ Missing required environment variable: ${envVar.key}`);
      continue;
    }

    // Skip validation if variable is not set and not required
    if (!value) {
      if (!envVar.required) {
        warnings.push(`⚠️  Optional environment variable not set: ${envVar.key}`);
      }
      continue;
    }

    // Run custom validator if provided
    if (envVar.validator && !envVar.validator(value)) {
      errors.push(
        `❌ Invalid value for ${envVar.key}: ${envVar.errorMessage || 'Validation failed'}`
      );
    } else {
      console.log(`✅ ${envVar.key}: ${maskSensitive(envVar.key, value)}`);
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach((warning) => console.log(`   ${warning}`));
  }

  // Handle errors
  if (errors.length > 0) {
    console.log('\n❌ Environment validation failed:\n');
    errors.forEach((error) => console.log(`   ${error}`));
    console.log('\n💡 Please check your .env file and ensure all required variables are set.\n');
    process.exit(1);
  }

  console.log('\n✅ Environment validation passed!\n');
}

/**
 * Mask sensitive values in logs
 */
function maskSensitive(key: string, value: string): string {
  const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN'];

  if (sensitiveKeys.some((sensitive) => key.includes(sensitive))) {
    return `${value.substring(0, 4)}${'*'.repeat(Math.max(0, value.length - 4))}`;
  }

  // Mask database password in connection strings
  if (key.includes('DATABASE_URL') || key.includes('DB')) {
    return value.replace(/:[^:@]+@/, ':****@');
  }

  return value;
}

/**
 * Get environment variable with default value
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and has no default value`);
  }
  return value;
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and has no default value`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
  }
  return num;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and has no default value`);
  }
  return value.toLowerCase() === 'true' || value === '1';
}
