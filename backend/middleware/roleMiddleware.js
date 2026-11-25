
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Check authenticated user
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    // Check user's role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions."
      });
    }

    // User has permission
    next();
  };
};

module.exports = authorizeRoles;
