/**
 * Input Sanitization Utilities
 *
 * Protects against:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL injection (additional layer beyond parameterized queries)
 * - HTML injection
 * - Script injection
 *
 * Usage:
 *   import { sanitizeInput, sanitizeObject } from './utils/sanitize';
 *
 *   const clean = sanitizeInput(userInput);
 *   const cleanObj = sanitizeObject(req.body);
 */

import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  allowHTML?: boolean; // Allow safe HTML tags (for rich text)
  trim?: boolean; // Trim whitespace
  maxLength?: number; // Maximum string length
  alphanumericOnly?: boolean; // Only allow alphanumeric characters
  emailFormat?: boolean; // Validate as email
  urlFormat?: boolean; // Validate as URL
}

/**
 * Default sanitization options
 */
const DEFAULT_OPTIONS: SanitizeOptions = {
  allowHTML: false,
  trim: true,
  maxLength: undefined,
  alphanumericOnly: false,
  emailFormat: false,
  urlFormat: false,
};

/**
 * Sanitize a single string input
 *
 * @param input - The string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeInput(
  input: string | null | undefined,
  options: SanitizeOptions = {}
): string {
  if (input === null || input === undefined) {
    return '';
  }

  // Convert to string
  let sanitized = String(input);

  // Merge with default options
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Trim whitespace
  if (opts.trim) {
    sanitized = sanitized.trim();
  }

  // Apply max length
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }

  // Alphanumeric only (removes all special characters)
  if (opts.alphanumericOnly) {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  // Email validation/sanitization
  if (opts.emailFormat) {
    sanitized = validator.normalizeEmail(sanitized) || '';
    if (!validator.isEmail(sanitized)) {
      return ''; // Return empty string for invalid emails
    }
  }

  // URL validation/sanitization
  if (opts.urlFormat) {
    if (!validator.isURL(sanitized)) {
      return ''; // Return empty string for invalid URLs
    }
  }

  // HTML/XSS sanitization
  if (opts.allowHTML) {
    // Allow safe HTML tags (for rich text editors)
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'a'],
      ALLOWED_ATTR: ['href', 'title'],
    });
  } else {
    // Strip all HTML tags
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  // Escape any remaining special characters
  sanitized = validator.escape(sanitized);

  return sanitized;
}

/**
 * Sanitize an entire object recursively
 *
 * @param obj - Object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' ? sanitizeObject(item, options) : sanitizeInput(item, options)
    ) as unknown as T;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          sanitized[key] = sanitizeInput(value, options);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value, options);
        } else {
          // Keep non-string, non-object values as-is (numbers, booleans, etc.)
          sanitized[key] = value;
        }
      }
    }

    return sanitized as T;
  }

  return obj;
}

/**
 * Sanitize email address
 *
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  return sanitizeInput(email, { emailFormat: true, trim: true });
}

/**
 * Sanitize URL
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeURL(url: string): string {
  return sanitizeInput(url, { urlFormat: true, trim: true });
}

/**
 * Sanitize phone number (removes all non-numeric characters)
 *
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number (digits only)
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  return cleaned;
}

/**
 * Sanitize alphanumeric string (username, etc.)
 *
 * @param input - String to sanitize
 * @param allowSpaces - Whether to allow spaces
 * @returns Alphanumeric string
 */
export function sanitizeAlphanumeric(input: string, allowSpaces: boolean = false): string {
  if (!input) return '';
  const pattern = allowSpaces ? /[^a-zA-Z0-9\s]/g : /[^a-zA-Z0-9]/g;
  return input.replace(pattern, '').trim();
}

/**
 * Sanitize search query
 * - Allows alphanumeric, spaces, hyphens, underscores
 * - Removes SQL-like wildcards and operators
 *
 * @param query - Search query to sanitize
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  // Remove SQL wildcards and operators
  let sanitized = query.replace(/[%;'"\\\-\-\/\*]/g, '');

  // Keep only safe characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, '');

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Sanitize numeric input
 *
 * @param input - Input to convert to number
 * @param defaultValue - Default value if conversion fails
 * @returns Sanitized number
 */
export function sanitizeNumber(input: any, defaultValue: number = 0): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  return num;
}

/**
 * Sanitize integer input
 *
 * @param input - Input to convert to integer
 * @param defaultValue - Default value if conversion fails
 * @returns Sanitized integer
 */
export function sanitizeInteger(input: any, defaultValue: number = 0): number {
  const num = parseInt(input, 10);
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  return num;
}

/**
 * Sanitize boolean input
 *
 * @param input - Input to convert to boolean
 * @returns Boolean value
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1';
  }
  if (typeof input === 'number') {
    return input !== 0;
  }
  return false;
}

/**
 * Sanitize date input
 *
 * @param input - Input to convert to date
 * @returns Date object or null if invalid
 */
export function sanitizeDate(input: any): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Sanitize JSON input (prevent JSON injection)
 *
 * @param input - JSON string to sanitize
 * @returns Parsed and sanitized object or null if invalid
 */
export function sanitizeJSON(input: string): any {
  if (!input) return null;

  try {
    const parsed = JSON.parse(input);
    // Recursively sanitize all string values in the parsed object
    return sanitizeObject(parsed);
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize file name
 * - Removes path traversal attempts (../)
 * - Removes special characters
 * - Keeps only safe characters
 *
 * @param filename - File name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  // Remove path traversal
  let sanitized = filename.replace(/\.\./g, '');

  // Remove directory separators
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Keep only safe characters: alphanumeric, dash, underscore, dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_\.]/g, '');

  // Ensure it doesn't start with a dot (hidden files)
  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }

  return sanitized;
}

/**
 * Middleware to sanitize request body
 *
 * Usage:
 *   app.use(sanitizeMiddleware());
 *   OR
 *   router.post('/endpoint', sanitizeMiddleware(), handler);
 */
export function sanitizeMiddleware(options: SanitizeOptions = {}) {
  return (req: any, _res: any, next: any) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, options);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, options);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, options);
    }

    next();
  };
}

/**
 * Sanitize SQL LIKE pattern
 * Escapes special characters in LIKE patterns
 *
 * @param pattern - LIKE pattern to sanitize
 * @returns Sanitized pattern
 */
export function sanitizeLikePattern(pattern: string): string {
  if (!pattern) return '';

  // Escape LIKE special characters
  return pattern
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
