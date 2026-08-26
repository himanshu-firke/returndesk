# EXPLAIN 8.1 — Technologies & Code Patterns Deep Dive

This document explains the exact code implementations for the patterns described in `explain8.0.md`.

---

## 1. Zod Validation Middleware Implementation

### 1. Schema Definition (`server/src/validators/requests.js`)
```javascript
const { z } = require('zod');

const createRequestSchema = z.object({
  customer_name:  z.string().min(1).max(255),
  customer_email: z.string().email().max(255),
  order_id:       z.string().min(1).max(100),
  item_name:      z.string().min(1).max(255),
  item_sku:       z.string().max(100).optional(),
  quantity:       z.number().int().min(1),
  reason:         z.enum(['Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind']),
});
```

### 2. Middleware Wrapper (`server/src/middleware/validate.js`)
```javascript
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data.',
          details,
        },
      });
    }
    req[source] = result.data; // Replaces input with sanitized, typecast data
    next();
  };
}
```

---

## 2. Centralized Error Handling Pipeline (`server/src/middleware/errorHandler.js`)

```javascript
function errorHandler(err, req, res, next) {
  // 1. Custom AppError thrown by Service Layer
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
      },
    });
  }

  // 2. PostgreSQL Unique Constraint Violation (Error Code 23505)
  if (err.code === '23505') {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ACTIVE_REQUEST',
        message: 'An active return request already exists for this item on this order.',
      },
    });
  }

  // 3. PostgreSQL Invalid UUID Syntax (Error Code 22P02)
  if (err.code === '22P02') {
    return res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'The provided ID is not a valid UUID format.',
      },
    });
  }

  // 4. Fallback for unhandled unexpected server errors
  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred on the server.',
    },
  });
}
```

---

## 3. Optimistic UI Implementation (`client/components/NotesSidebar.js`)

```javascript
async function handleAddNote(e) {
  e.preventDefault();
  const noteText = content.trim();
  if (!noteText || submitting) return;

  // 1. Instant UI update with temporary ID
  const tempId = `temp-${Date.now()}`;
  const optimisticNote = {
    id: tempId,
    request_id: requestId,
    content: noteText,
    created_at: new Date().toISOString(),
  };

  setNotes((prev) => [...prev, optimisticNote]);
  setContent('');
  setSubmitting(true);

  try {
    // 2. Network API call in background
    const res = await addNote(requestId, noteText);
    // 3. Replace temporary note with verified PostgreSQL row
    setNotes((prev) => prev.map((n) => (n.id === tempId ? res.data : n)));
  } catch (err) {
    // 4. Rollback temporary note on network failure
    setNotes((prev) => prev.filter((n) => n.id !== tempId));
    setError(err?.message || 'Failed to add note.');
    setContent(noteText);
  } finally {
    setSubmitting(false);
  }
}
```
