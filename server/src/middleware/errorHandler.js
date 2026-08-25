const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

/**
 * Global Express error handler.
 *
 * Receives errors from next(err) calls throughout the app and converts them
 * into a consistent { error: { code, message } } JSON response.
 *
 * Ordering matters:
 *  1. ZodError   → 400 (invalid input shape)
 *  2. AppError   → statusCode set by thrower (422, 409, 404, etc.)
 *  3. Everything else → 500 (never leak stack traces to clients)
 */
function errorHandler(err, req, res, next) {
  // Zod validation errors — triggered by the validate middleware
  if (err instanceof ZodError) {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data.',
        details: issues.map((e) => ({
          field: e.path.join('.') || 'body',
          message: e.message,
        })),
      },
    });
  }

  // Known application/business rule errors thrown from the service layer
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // PostgreSQL unique constraint violation on our partial index.
  // This is a safety net — the service layer pre-checks and gives a better message,
  // but the DB is the final authority.
  if (err.code === '23505' && err.constraint === 'unique_active_item_request') {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ACTIVE_REQUEST',
        message: 'An active request already exists for this item on this order.',
      },
    });
  }

  // PostgreSQL invalid UUID syntax — thrown when :id param is not a valid UUID.
  // Return 400 rather than leaking an internal 500 to the client.
  if (err.code === '22P02') {
    return res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'The provided ID is not a valid UUID.',
      },
    });
  }

  // Unexpected errors — log the real error server-side, send a generic response
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  });
}

module.exports = errorHandler;
