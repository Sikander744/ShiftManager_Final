// Runs before every test file: load .env, then force test settings.
require("dotenv").config({ quiet: true });

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-jest-only";
process.env.JWT_EXPIRES_IN = "1h";
// Separate database so real development data is never touched
process.env.MONGO_URI_TEST =
  process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/shiftmanager_test";
