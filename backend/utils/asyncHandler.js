/**
 * Wraps an async route handler so any thrown error is passed to next().
 * This removes repetitive try/catch blocks from every controller.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
