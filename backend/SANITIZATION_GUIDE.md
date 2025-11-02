  # Input Sanitization Guide

## Overview

The `sanitize.ts` utility provides comprehensive input sanitization to protect against:
- **XSS (Cross-Site Scripting)** - Strips dangerous HTML/JavaScript
- **SQL Injection** - Additional layer beyond parameterized queries
- **Path Traversal** - Prevents directory manipulation attacks
- **Invalid Data** - Validates emails, URLs, numbers, dates

## Installation

Dependencies are already installed:
```bash
npm install isomorphic-dompurify validator
npm install --save-dev @types/validator @types/dompurify
```

## Basic Usage

### Import the utilities

```typescript
import {
  sanitizeInput,
  sanitizeObject,
  sanitizeEmail,
  sanitizePhone,
  sanitizeSearchQuery,
  sanitizeMiddleware,
} from '../utils/sanitize';
```

### Sanitize individual fields

```typescript
// Basic string sanitization (strips HTML, escapes special chars)
const name = sanitizeInput(req.body.name);

// Email sanitization
const email = sanitizeEmail(req.body.email);
// Returns empty string if invalid email

// Phone sanitization (digits only)
const phone = sanitizePhone(req.body.phone);
// "+1 (555) 123-4567" → "15551234567"

// Search query sanitization
const searchTerm = sanitizeSearchQuery(req.query.search);
// Removes SQL wildcards, keeps safe characters
```

### Sanitize entire objects

```typescript
// Sanitize all string fields in an object recursively
const cleanData = sanitizeObject(req.body);
```

### Use as middleware

```typescript
import { sanitizeMiddleware } from '../utils/sanitize';

// Apply to all routes
app.use(sanitizeMiddleware());

// Or apply to specific routes
router.post('/customers', sanitizeMiddleware(), validateMiddleware, handler);
```

## Advanced Usage

### Custom sanitization options

```typescript
import { sanitizeInput } from '../utils/sanitize';

// Allow safe HTML (for rich text content)
const description = sanitizeInput(req.body.description, {
  allowHTML: true, // Allows <b>, <i>, <p>, <a>, etc.
});

// Enforce max length
const shortText = sanitizeInput(req.body.text, {
  maxLength: 100,
});

// Alphanumeric only (usernames)
const username = sanitizeInput(req.body.username, {
  alphanumericOnly: true,
});

// Email validation
const email = sanitizeInput(req.body.email, {
  emailFormat: true,
});
```

### Number sanitization

```typescript
import { sanitizeInteger, sanitizeNumber } from '../utils/sanitize';

// Convert to integer (returns 0 if invalid)
const customerId = sanitizeInteger(req.params.customerId);

// Convert to number with custom default
const price = sanitizeNumber(req.body.price, 0.0);
```

### Date sanitization

```typescript
import { sanitizeDate } from '../utils/sanitize';

const tripDate = sanitizeDate(req.body.trip_date);
if (!tripDate) {
  return res.status(400).json({ error: 'Invalid date' });
}
```

### File name sanitization

```typescript
import { sanitizeFilename } from '../utils/sanitize';

// Prevents path traversal attacks
const filename = sanitizeFilename(req.body.filename);
// "../../../etc/passwd" → "etcpasswd"
// "invoice_2025.pdf" → "invoice_2025.pdf"
```

## Integration Examples

### Example 1: Customer Creation (Before)

```typescript
router.post('/customers', async (req, res) => {
  const { name, email, phone, address } = req.body;

  const result = await pool.query(
    'INSERT INTO customers (name, email, phone, address) VALUES ($1, $2, $3, $4)',
    [name, email, phone, address]
  );

  res.json(result.rows[0]);
});
```

### Example 1: Customer Creation (After)

```typescript
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitize';

router.post('/customers', async (req, res) => {
  // Sanitize inputs
  const name = sanitizeInput(req.body.name, { maxLength: 200 });
  const email = sanitizeEmail(req.body.email);
  const phone = sanitizePhone(req.body.phone);
  const address = sanitizeInput(req.body.address, { maxLength: 500 });

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const result = await pool.query(
    'INSERT INTO customers (name, email, phone, address) VALUES ($1, $2, $3, $4)',
    [name, email, phone, address]
  );

  res.json(result.rows[0]);
});
```

### Example 2: Using Middleware Approach

```typescript
import { sanitizeMiddleware } from '../utils/sanitize';

router.post(
  '/customers',
  sanitizeMiddleware(), // Sanitizes req.body automatically
  validate(customerSchema), // Then validate
  async (req, res) => {
    // req.body is already sanitized
    const { name, email, phone, address } = req.body;

    const result = await pool.query(
      'INSERT INTO customers (name, email, phone, address) VALUES ($1, $2, $3, $4)',
      [name, email, phone, address]
    );

    res.json(result.rows[0]);
  }
);
```

### Example 3: Search Endpoint

```typescript
import { sanitizeSearchQuery, sanitizeLikePattern } from '../utils/sanitize';

router.get('/customers/search', async (req, res) => {
  // Sanitize search query
  const searchTerm = sanitizeSearchQuery(req.query.q);

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search query required' });
  }

  // Sanitize LIKE pattern to prevent SQL injection in LIKE queries
  const likePattern = sanitizeLikePattern(searchTerm);

  const result = await pool.query(
    'SELECT * FROM customers WHERE name ILIKE $1',
    [`%${likePattern}%`]
  );

  res.json(result.rows);
});
```

### Example 4: Rich Text Content

```typescript
import { sanitizeInput } from '../utils/sanitize';

router.post('/messages', async (req, res) => {
  const title = sanitizeInput(req.body.title); // Plain text
  const message = sanitizeInput(req.body.message, {
    allowHTML: true, // Allow safe HTML tags
  });

  const result = await pool.query(
    'INSERT INTO messages (title, message) VALUES ($1, $2)',
    [title, message]
  );

  res.json(result.rows[0]);
});
```

## Migration Strategy

### Step 1: Add sanitization to authentication endpoints (CRITICAL)

```typescript
// backend/src/routes/auth.routes.ts
import { sanitizeInput } from '../utils/sanitize';

router.post('/login', async (req, res) => {
  const username = sanitizeInput(req.body.username, {
    alphanumericOnly: true,
    maxLength: 50,
  });
  const password = req.body.password; // Don't sanitize passwords!
  // ... rest of login logic
});
```

**⚠️ IMPORTANT:** Never sanitize passwords! They should be hashed, not sanitized.

### Step 2: Add sanitization to write operations (POST/PUT)

Priority order:
1. **Authentication routes** (login, register)
2. **User-facing input** (messages, feedback, notes)
3. **Customer/Driver creation** (names, emails, addresses)
4. **Trip/Schedule creation** (addresses, notes)
5. **Administrative input** (settings, configurations)

### Step 3: Add sanitization to search endpoints

```typescript
import { sanitizeSearchQuery } from '../utils/sanitize';

router.get('/search', async (req, res) => {
  const query = sanitizeSearchQuery(req.query.q);
  // ... search logic
});
```

### Step 4: Consider global middleware

Once confident, apply globally:

```typescript
// backend/src/server.ts
import { sanitizeMiddleware } from './utils/sanitize';

// Apply after body parsing, before routes
app.use(express.json());
app.use(sanitizeMiddleware()); // Global sanitization
```

## Testing Sanitization

### Test with malicious inputs

```typescript
// Test XSS protection
const malicious = '<script>alert("XSS")</script>';
const clean = sanitizeInput(malicious);
console.log(clean); // Should be empty or escaped

// Test SQL injection attempts
const sqlInjection = "'; DROP TABLE users; --";
const clean2 = sanitizeInput(sqlInjection);
console.log(clean2); // Should be escaped

// Test path traversal
const pathTraversal = '../../../etc/passwd';
const cleanFile = sanitizeFilename(pathTraversal);
console.log(cleanFile); // "etcpasswd"
```

### Manual testing with curl

```bash
# Test XSS in customer name
curl -X POST http://localhost:3001/api/tenants/2/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>",
    "email": "test@example.com"
  }'

# Should save with escaped/stripped HTML
```

## Security Best Practices

### 1. **Sanitize at the entry point**
Sanitize as soon as data enters your application (controller/route level).

### 2. **Use parameterized queries**
Sanitization is NOT a replacement for parameterized queries! Always use `$1, $2` placeholders.

### 3. **Sanitize different data types appropriately**
- **Emails**: Use `sanitizeEmail()`
- **URLs**: Use `sanitizeURL()`
- **Phone numbers**: Use `sanitizePhone()`
- **Search queries**: Use `sanitizeSearchQuery()`
- **File names**: Use `sanitizeFilename()`

### 4. **Don't sanitize passwords**
Hash passwords, don't sanitize them! Use bcrypt.

### 5. **Validate after sanitizing**
Sanitization cleans input, validation ensures it meets business rules.

### 6. **Log suspicious inputs**
Log when sanitization removes dangerous content for security monitoring.

## Common Pitfalls

❌ **Don't sanitize passwords**
```typescript
const password = sanitizeInput(req.body.password); // WRONG!
```

❌ **Don't sanitize twice**
```typescript
const name = sanitizeInput(sanitizeInput(req.body.name)); // Redundant
```

❌ **Don't sanitize database outputs**
```typescript
const customer = sanitizeObject(result.rows[0]); // Unnecessary
```

✅ **Do sanitize user inputs**
✅ **Do validate after sanitization**
✅ **Do use appropriate sanitizer for data type**

## Performance Considerations

- **Middleware**: Global sanitization adds ~1-5ms per request
- **Selective sanitization**: Hand-pick fields for minimal overhead
- **Caching**: Don't re-sanitize already-sanitized data

## Summary

| Function | Purpose | Example |
|----------|---------|---------|
| `sanitizeInput()` | Generic string sanitization | Names, addresses, notes |
| `sanitizeEmail()` | Email validation + sanitization | Email addresses |
| `sanitizePhone()` | Phone number (digits only) | Phone numbers |
| `sanitizeSearchQuery()` | Search query sanitization | Search boxes |
| `sanitizeFilename()` | File name sanitization | File uploads |
| `sanitizeNumber()` | Number conversion | Prices, quantities |
| `sanitizeInteger()` | Integer conversion | IDs, counts |
| `sanitizeBoolean()` | Boolean conversion | Flags, toggles |
| `sanitizeDate()` | Date validation | Trip dates, expiry dates |
| `sanitizeObject()` | Recursive object sanitization | Entire request body |
| `sanitizeMiddleware()` | Express middleware | Global or route-specific |
| `sanitizeLikePattern()` | SQL LIKE pattern escaping | LIKE queries |

## Next Steps

1. ✅ Install dependencies (done)
2. ✅ Create `sanitize.ts` utility (done)
3. ⏳ Add sanitization to authentication routes
4. ⏳ Add sanitization to customer/driver routes
5. ⏳ Add sanitization to search endpoints
6. ⏳ Consider global middleware approach
7. ⏳ Test with malicious inputs
8. ⏳ Update all route modules (27 total)
