/**
 * PII Encryption Unit Tests
 *
 * Tests the encryption/decryption of personally identifiable information:
 * - Standard encryption/decryption
 * - Deterministic (searchable) encryption
 * - Hashing for lookups
 * - Masking for display
 * - Field encryption helpers
 */

import {
  encrypt,
  decrypt,
  encryptSearchable,
  decryptSearchable,
  hashPII,
  maskEmail,
  maskPhone,
  maskAddress,
  encryptPIIFields,
  decryptPIIFields,
  isPIIEncryptionEnabled,
} from '../../services/piiEncryption.service';

// Mock environment variable
const TEST_ENCRYPTION_KEY = 'd1572d65e1b1f0e0b8a6932eb1d485ffe3bc51b2d612c015b878eb7c4a5c68a4';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});

describe('PII Encryption Service', () => {
  describe('isPIIEncryptionEnabled', () => {
    it('should return true when ENCRYPTION_KEY is set', () => {
      expect(isPIIEncryptionEnabled()).toBe(true);
    });

    it('should return false when ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(isPIIEncryptionEnabled()).toBe(false);

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'test@example.com';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same text';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(encrypt(null as any)).toBe(null);
      expect(decrypt(undefined as any)).toBe(undefined);
    });

    it('should handle unicode characters', () => {
      const plaintext = '日本語テスト émojis 🎉';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return original value if decryption fails on non-encrypted data', () => {
      const notEncrypted = 'plain text without encryption';
      expect(decrypt(notEncrypted)).toBe(notEncrypted);
    });

    it('should produce format: iv:authTag:ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');

      expect(parts.length).toBe(3);
      // Each part should be base64 encoded
      parts.forEach(part => {
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      });
    });
  });

  describe('encryptSearchable/decryptSearchable', () => {
    it('should produce same ciphertext for same plaintext (deterministic)', () => {
      const plaintext = 'searchable@email.com';
      const encrypted1 = encryptSearchable(plaintext);
      const encrypted2 = encryptSearchable(plaintext);

      expect(encrypted1).toBe(encrypted2);
    });

    it('should decrypt searchable encrypted values', () => {
      const plaintext = 'search@test.com';
      const encrypted = encryptSearchable(plaintext);
      const decrypted = decryptSearchable(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should prefix with DET: for identification', () => {
      const encrypted = encryptSearchable('test');
      expect(encrypted.startsWith('DET:')).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(encryptSearchable('')).toBe('');
      expect(decryptSearchable('')).toBe('');
    });

    it('should produce different ciphertext for different plaintext', () => {
      const encrypted1 = encryptSearchable('email1@test.com');
      const encrypted2 = encryptSearchable('email2@test.com');

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('hashPII', () => {
    it('should produce consistent hash for same input', () => {
      const value = 'test@email.com';
      const hash1 = hashPII(value);
      const hash2 = hashPII(value);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = hashPII('email1@test.com');
      const hash2 = hashPII('email2@test.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should normalize case and whitespace', () => {
      const hash1 = hashPII('TEST@email.com');
      const hash2 = hashPII('test@email.com');
      const hash3 = hashPII('  test@email.com  ');

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should return hex string', () => {
      const hash = hashPII('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle empty strings', () => {
      expect(hashPII('')).toBe('');
    });
  });

  describe('maskEmail', () => {
    it('should mask email address correctly', () => {
      expect(maskEmail('john.doe@example.com')).toMatch(/^j\*\*\*e@\*\*\*\.com$/);
    });

    it('should handle short local parts', () => {
      expect(maskEmail('ab@test.com')).toBe('***@***.com');
    });

    it('should handle invalid emails gracefully', () => {
      expect(maskEmail('notanemail')).toBe('***@***.***');
      expect(maskEmail('')).toBe('***@***.***');
    });

    it('should preserve TLD', () => {
      expect(maskEmail('test@example.co.uk')).toContain('.uk');
    });
  });

  describe('maskPhone', () => {
    it('should show only last 4 digits', () => {
      expect(maskPhone('07700900123')).toBe('***0123');
    });

    it('should handle formatted phone numbers', () => {
      expect(maskPhone('+44 7700 900 123')).toBe('***0123');
      expect(maskPhone('(555) 123-4567')).toBe('***4567');
    });

    it('should handle short numbers', () => {
      expect(maskPhone('123')).toBe('***');
      expect(maskPhone('')).toBe('***');
    });
  });

  describe('maskAddress', () => {
    it('should show only postcode', () => {
      expect(maskAddress('123 High Street SW1A 1AA')).toBe('*** 1AA');
    });

    it('should handle addresses without spaces', () => {
      expect(maskAddress('SingleWord')).toBe('***');
    });

    it('should handle empty addresses', () => {
      expect(maskAddress('')).toBe('***');
    });
  });

  describe('encryptPIIFields', () => {
    it('should encrypt specified fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '07700900123',
        id: 123,
      };

      const encrypted = encryptPIIFields(data, ['email', 'phone']);

      expect(encrypted.name).toBe('John Doe'); // Not encrypted
      expect(encrypted.id).toBe(123); // Not encrypted
      expect(encrypted.email).not.toBe('john@example.com');
      expect(encrypted.phone).not.toBe('07700900123');
      expect(encrypted.email).toContain(':'); // Encrypted format
    });

    it('should use searchable encryption for specified fields', () => {
      const data = {
        email: 'search@test.com',
        address: '123 Test St',
      };

      const encrypted = encryptPIIFields(data, ['email', 'address'], ['email']);

      expect(encrypted.email.startsWith('DET:')).toBe(true);
      expect(encrypted.address.startsWith('DET:')).toBe(false);
    });

    it('should skip null/undefined fields', () => {
      const data = {
        name: 'Test',
        email: null,
        phone: undefined,
      };

      const encrypted = encryptPIIFields(data, ['email', 'phone']);

      expect(encrypted.email).toBe(null);
      expect(encrypted.phone).toBe(undefined);
    });
  });

  describe('decryptPIIFields', () => {
    it('should decrypt specified fields', () => {
      const original = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '07700900456',
      };

      const encrypted = encryptPIIFields(original, ['email', 'phone']);
      const decrypted = decryptPIIFields(encrypted, ['email', 'phone']);

      expect(decrypted.name).toBe('Jane Doe');
      expect(decrypted.email).toBe('jane@example.com');
      expect(decrypted.phone).toBe('07700900456');
    });

    it('should handle mixed encrypted and plain values', () => {
      const data = {
        email: encrypt('encrypted@test.com'),
        phone: '07700900123', // Not encrypted
      };

      const decrypted = decryptPIIFields(data, ['email', 'phone']);

      expect(decrypted.email).toBe('encrypted@test.com');
      expect(decrypted.phone).toBe('07700900123');
    });

    it('should handle searchable encrypted values', () => {
      const data = {
        email: encryptSearchable('search@test.com'),
      };

      const decrypted = decryptPIIFields(data, ['email']);

      expect(decrypted.email).toBe('search@test.com');
    });
  });
});

describe('Error Handling', () => {
  it('should throw error when encryption key is missing', () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;

    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');

    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('should throw error when encryption key is wrong length', () => {
    const originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = 'tooshort';

    expect(() => encrypt('test')).toThrow('64 hex characters');

    process.env.ENCRYPTION_KEY = originalKey;
  });
});
