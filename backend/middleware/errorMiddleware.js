const logger = require("../utils/logger");

/** 404 for unknown API routes. */
const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Central error handler.
 * - Known errors (AppError) -> their status + message (+ validation details)
 * - Malformed JSON / Mongoose errors -> 400
 * - Anything else -> generic 500 (real error only logged on the server,
 *   stack traces are never sent to the client)
 */
// Express recognises an error handler by its 4 parameters, so `next` must stay
const errorHandler = (err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON in request body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large" });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((e) => e.message)
    });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate value" });
  }

  const status = err.statusCode || 500;
  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} failed:`, err.stack || err.message);
  }

  const body = { message: status >= 500 ? "Internal server error" : err.message };
  if (err.details) body.errors = err.details;
  return res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
