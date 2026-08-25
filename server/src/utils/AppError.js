/**
 * AppError: A known, anticipated application error.
 *
 * Throw this from the service layer whenever a business rule or
 * validation constraint is violated. The global error handler catches it
 * and converts it to the standard { error: { code, message } } response.
 *
 * This keeps controllers thin — they never need to decide status codes.
 */
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = AppError;
