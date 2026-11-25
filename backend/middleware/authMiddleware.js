const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect - authentication middleware.
 * 1. Requires "Authorization: Bearer <token>"
 * 2. Verifies the JWT signature and expiry
 * 3. Loads the user from MongoDB so the CURRENT role is used
 *    (a stale role inside an old token cannot grant extra access,
 *     and deleted users are rejected immediately)
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. Please login." });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Session expired. Please login again."
        : "Invalid or expired token";
    return res.status(401).json({ message });
  }

  try {
    const user = await User.findById(decoded.id).select("name email role");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = protect;
