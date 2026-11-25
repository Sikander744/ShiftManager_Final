/**
 * Blocks NoSQL operator injection.
 * Any request body/query key that starts with "$" or contains "." is rejected,
 * e.g. { "email": { "$ne": "" } } -> HTTP 400.
 */
function hasDangerousKey(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== "object") return false;
  return Object.keys(value).some(
    (key) =>
      key.startsWith("$") ||
      key.includes(".") ||
      hasDangerousKey(value[key], depth + 1)
  );
}

const sanitizeRequest = (req, res, next) => {
  if (hasDangerousKey(req.body) || hasDangerousKey(req.query)) {
    return res.status(400).json({ message: "Invalid characters in request" });
  }
  next();
};

module.exports = sanitizeRequest;
module.exports.hasDangerousKey = hasDangerousKey;
