/**
 * Very small logger used across the backend.
 * - Adds a timestamp and level to every message.
 * - Is silent while automated tests run (NODE_ENV=test) to keep output clean.
 */
const isTest = process.env.NODE_ENV === "test";

function write(level, args) {
  if (isTest && level !== "error") return;
  if (isTest && process.env.LOG_ERRORS_IN_TESTS !== "true") return;
  const stamp = new Date().toISOString();
  const out = level === "error" ? console.error : console.log;
  out(`[${stamp}] [${level.toUpperCase()}]`, ...args);
}

module.exports = {
  info: (...args) => write("info", args),
  warn: (...args) => write("warn", args),
  error: (...args) => write("error", args),
  debug: (...args) => {
    if (process.env.LOG_LEVEL === "debug") write("debug", args);
  }
};
