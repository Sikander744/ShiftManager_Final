const express = require("express");
const rateLimit = require("express-rate-limit");
const protect = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

const router = express.Router();

// Slow down password-guessing: only FAILED attempts are counted,
// max AUTH_RATE_LIMIT (default 30) failures per 15 minutes per IP -> HTTP 429
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 30,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { message: "Too many attempts. Please try again in 15 minutes." }
});

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.get("/me", protect, authController.me);

module.exports = router;
