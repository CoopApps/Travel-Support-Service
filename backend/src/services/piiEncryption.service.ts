/**
 * PII (Personally Identifiable Information) Encryption Service
 *
 * Provides encryption/decryption for sensitive data fields like:
 * - Email addresses
 * - Phone numbers
 * - Physical addresses
 * - National Insurance numbers
 * - Bank account details
 *
 * Uses AES-256-GCM for authenticated encryption with:
 * - Random IV per encryption (prevents pattern detection)
 * - Authentication tag (detects tampering)
 * - Deterministic encryption option for searchable fields
 *
 * SECURITY REQUIREMENTS:
 * 1. ENCRYPTION_KEY must be 64 hex chars (256 bits)
 * 2. Key should be rotated periodically
 * 3. Never log decrypted PII
 * 4. Old keys should be kept for decryption during rotation
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

// Configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (256 bits)');
  }

  return Buffer.from(keyHex, 'hex');
}

// For searchable encrypted fields (same input = same output)
// Uses HMAC-based deterministic encryption
function getDeterministicKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  // Derive a separate key for deterministic encryption
  return crypto.createHash('sha256').update(keyHex + ':deterministic').digest();
}

/**
 * Encrypt a value using AES-256-GCM
 * Returns: iv:authTag:ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    logger.error('PII encryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a value encrypted with encrypt()
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;

  // Check if data is actually encrypted (has our format)
  if (!encryptedData.includes(':')) {
    // Return as-is if not encrypted (for backward compatibility)
    return encryptedData;
  }

  try {
    const key = getEncryptionKey();
    const [ivBase64, authTagBase64, ciphertext] = encryptedData.split(':');

    if (!ivBase64 || !authTagBase64 || !ciphertext) {
      // Not our format, return as-is
      return encryptedData;
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('PII decryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Return original data if decryption fails (might be unencrypted legacy data)
    return encryptedData;
  }
}

/**
 * Encrypt a value deterministically (searchable)
 * Same input always produces same output for searching
 * Uses HMAC-SHA256 + AES-256-GCM with fixed IV derived from input
 */
export function encryptSearchable(plaintext: string): string {
  if (!plaintext) return plaintext;

  try {
    const key = getDeterministicKey();

    // Derive IV from plaintext hash (deterministic)
    const iv = crypto
      .createHmac('sha256', key)
      .update(plaintext)
      .digest()
      .slice(0, IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: DET:iv:authTag:ciphertext (DET prefix indicates deterministic)
    return `DET:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    logger.error('PII searchable encryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to encrypt searchable data');
  }
}

/**
 * Decrypt a deterministically encrypted value
 */
export function decryptSearchable(encryptedData: string): string {
  if (!encryptedData) return encryptedData;

  // Check for deterministic encryption marker
  if (!encryptedData.startsWith('DET:')) {
    // Try regular decryption or return as-is
    return decrypt(encryptedData);
  }

  try {
    const key = getDeterministicKey();
    const parts = encryptedData.slice(4).split(':'); // Remove 'DET:' prefix
    const [ivBase64, authTagBase64, ciphertext] = parts;

    if (!ivBase64 || !authTagBase64 || !ciphertext) {
      return encryptedData;
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('PII searchable decryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return encryptedData;
  }
}

/**
 * Hash a value (one-way, for lookups)
 * Use for fields where you only need to check equality
 */
export function hashPII(value: string): string {
  if (!value) return value;

  const key = getDeterministicKey();
  return crypto.createHmac('sha256', key).update(value.toLowerCase().trim()).digest('hex');
}

/**
 * Mask PII for display (e.g., show last 4 digits)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';

  const [localPart, domain] = email.split('@');
  const maskedLocal =
    localPart.length > 2 ? localPart[0] + '***' + localPart[localPart.length - 1] : '***';

  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1 ? '***.' + domainParts[domainParts.length - 1] : '***';

  return `${maskedLocal}@${maskedDomain}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return '***';

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';

  return '***' + digits.slice(-4);
}

export function maskAddress(address: string): string {
  if (!address) return '***';

  // Show only postcode (last part after space)
  const parts = address.split(' ');
  if (parts.length > 1) {
    return '*** ' + parts[parts.length - 1];
  }
  return '***';
}

/**
 * Encrypt multiple PII fields in an object
 */
export function encryptPIIFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[],
  searchableFields: (keyof T)[] = []
): T {
  const result = { ...data };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      if (searchableFields.includes(field)) {
        (result as any)[field] = encryptSearchable(result[field] as string);
      } else {
        (result as any)[field] = encrypt(result[field] as string);
      }
    }
  }

  return result;
}

/**
 * Decrypt multiple PII fields in an object
 */
export function decryptPIIFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      const value = result[field] as string;
      if (value.startsWith('DET:')) {
        (result as any)[field] = decryptSearchable(value);
      } else if (value.includes(':')) {
        (result as any)[field] = decrypt(value);
      }
    }
  }

  return result;
}

/**
 * PII field definitions for different entity types
 */
export const PII_FIELDS = {
  customer: {
    encrypted: ['address', 'postcode', 'emergency_contact_phone', 'notes'],
    searchable: ['email', 'phone', 'name'],
  },
  driver: {
    encrypted: ['address', 'postcode', 'national_insurance', 'bank_account', 'bank_sort_code'],
    searchable: ['email', 'phone', 'name'],
  },
  user: {
    encrypted: ['phone'],
    searchable: ['email'],
  },
} as const;

/**
 * Check if PII encryption is properly configured
 */
export function isPIIEncryptionEnabled(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
