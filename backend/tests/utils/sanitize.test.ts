/**
 * Sanitization Utility Tests
 */

import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeSearchQuery,
  sanitizeFilename,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeBoolean,
} from '../../src/utils/sanitize';

describe('Sanitization Utilities', () => {
  describe('sanitizeInput', () => {
    it('should remove HTML tags by default', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const clean = sanitizeInput(malicious);
      expect(clean).not.toContain('<script>');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const clean = sanitizeInput(input);
      expect(clean).toBe('Hello World');
    });

    it('should return empty string for null/undefined', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate valid email', () => {
      const email = 'test@example.com';
      const clean = sanitizeEmail(email);
      expect(clean).toBeTruthy();
    });

    it('should return empty for invalid email', () => {
      const invalidEmail = 'not-an-email';
      const clean = sanitizeEmail(invalidEmail);
      expect(clean).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('should extract digits only', () => {
      const phone = '+1 (555) 123-4567';
      const clean = sanitizePhone(phone);
      expect(clean).toBe('15551234567');
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should remove SQL wildcards', () => {
      const query = "John%; DROP TABLE";
      const clean = sanitizeSearchQuery(query);
      expect(clean).not.toContain('%');
      expect(clean).not.toContain(';');
    });
  });

  describe('sanitizeFilename', () => {
    it('should prevent path traversal', () => {
      const malicious = '../../../etc/passwd';
      const clean = sanitizeFilename(malicious);
      expect(clean).not.toContain('..');
      expect(clean).not.toContain('/');
    });
  });

  describe('sanitizeNumber', () => {
    it('should convert string to number', () => {
      const num = sanitizeNumber('123.45');
      expect(num).toBe(123.45);
    });
  });

  describe('sanitizeInteger', () => {
    it('should convert string to integer', () => {
      const int = sanitizeInteger('123');
      expect(int).toBe(123);
    });
  });

  describe('sanitizeBoolean', () => {
    it('should convert "true" string to boolean', () => {
      expect(sanitizeBoolean('true')).toBe(true);
      expect(sanitizeBoolean('false')).toBe(false);
    });
  });
});
