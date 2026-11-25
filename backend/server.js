require("dotenv").config({ quiet: true });

const fs = require("fs");
const http = require("http");
const https = require("https");
const app = require("./app");
const logger = require("./utils/logger");
const { connectDatabase } = require("./config/db");

const PORT = process.env.PORT || 5000;

// Fail fast if critical configuration is missing
for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

/**
 * Secure communication: when HTTPS_KEY_FILE and HTTPS_CERT_FILE are set
 * (e.g. created with `node scripts/generate-dev-cert.js`), the API is served
 * over HTTPS/TLS so all traffic between frontend and backend is encrypted.
 * Without them it falls back to HTTP (fine for http://localhost development).
 */
function createServer() {
  const { HTTPS_KEY_FILE, HTTPS_CERT_FILE } = process.env;
  if (HTTPS_KEY_FILE && HTTPS_CERT_FILE) {
    const options = {
      key: fs.readFileSync(HTTPS_KEY_FILE),
      cert: fs.readFileSync(HTTPS_CERT_FILE),
      minVersion: "TLSv1.2"
    };
    return { server: https.createServer(options, app), protocol: "https" };
  }
  return { server: http.createServer(app), protocol: "http" };
}

connectDatabase()
  .then(() => {
    console.log("MongoDB Connected Successfully");
    const { server, protocol } = createServer();
    server.listen(PORT, () => {
      console.log(`ShiftManager Backend Running on Port ${PORT} (${protocol.toUpperCase()})`);
      logger.info(`Allowed client origin(s): ${process.env.CLIENT_ORIGIN || "http://localhost:5173"}`);
      logger.info(`Push delivery strategy: ${require("./services/notificationService").getStrategyName()}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  });
