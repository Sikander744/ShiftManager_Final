/**
 * AppError - a custom error carrying an HTTP status code.
 * Services throw AppError; the central error handler turns it into a
 * safe JSON response (no stack traces are ever sent to the client).
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

module.exports = AppError;
