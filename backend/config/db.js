/**
 * MongoDB connection settings (scalability + availability).
 *
 * Works with a single local server OR a replica set / MongoDB Atlas cluster:
 *  - MONGO_URI may list several hosts, e.g.
 *      mongodb://localhost:27018,localhost:27019,localhost:27020/shiftmanager?replicaSet=rs0
 *    The driver discovers the PRIMARY automatically and fails over when it goes down.
 *  - MONGO_MAX_POOL_SIZE  – max concurrent connections per Node process (default 20)
 *  - MONGO_READ_PREFERENCE – primary (default) | primaryPreferred | secondaryPreferred
 *    (secondaryPreferred spreads read load across replica set members)
 */
const mongoose = require("mongoose");
const logger = require("../utils/logger");

function connectionOptions() {
  return {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
    readPreference: process.env.MONGO_READ_PREFERENCE || "primary",
    serverSelectionTimeoutMS: 10000,
    retryWrites: true
  };
}

/** Logs replica-set events so failover can be observed in the terminal. */
function watchTopology() {
  const conn = mongoose.connection;
  conn.on("disconnected", () => logger.warn("MongoDB disconnected - waiting for a primary..."));
  conn.on("reconnected", () => logger.info("MongoDB reconnected"));
  const client = conn.getClient();
  client.on("serverDescriptionChanged", (event) => {
    const { newDescription } = event;
    if (newDescription.type === "RSPrimary") logger.info(`Replica set PRIMARY is now ${event.address}`);
  });
}

async function connectDatabase(uri = process.env.MONGO_URI) {
  await mongoose.connect(uri, connectionOptions());
  watchTopology();
  const client = mongoose.connection.getClient();
  const topology = client.topology?.description?.type || "unknown";
  logger.info(`MongoDB topology: ${topology} (pool size ${connectionOptions().maxPoolSize}, readPreference ${connectionOptions().readPreference})`);
}

module.exports = { connectDatabase, connectionOptions };
