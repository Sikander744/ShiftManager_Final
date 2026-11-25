/**
 * Express application (no database connection / no listen here).
 * Keeping the app separate from server.js lets Supertest import it in tests.
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const authRoutes = require("./routes/authRoutes");
const shiftRoutes = require("./routes/shiftRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");

const protect = require("./middleware/authMiddleware");
const authorizeRoles = require("./middleware/roleMiddleware");
const sanitizeRequest = require("./middleware/sanitizeMiddleware");
const requestLogger = require("./middleware/requestLogger");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { registerNotificationListeners } = require("./events/notificationListeners");

const app = express();

// Allowed frontend origins (comma separated in .env)
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

// ---------- Global middleware ----------
app.use(helmet()); // secure HTTP headers
app.use(compression()); // gzip responses (performance: smaller payloads)
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "10kb" })); // reject very large bodies
app.use(sanitizeRequest); // block $operators (NoSQL injection)
app.use(requestLogger);

// Observer pattern: business events -> push notifications
registerNotificationListeners();

// ---------- Routes ----------
app.get("/", (req, res) => {
  res.json({ message: "ShiftManager Backend Running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

// Earlier development test routes (kept for Postman evidence)
app.get("/api/protected", protect, (req, res) => {
  res.status(200).json({ message: "Protected route accessed successfully", user: req.user });
});

app.get("/api/manager/test", protect, authorizeRoles("manager"), (req, res) => {
  res.status(200).json({ message: "Manager access granted", user: req.user });
});

// ---------- Errors ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
