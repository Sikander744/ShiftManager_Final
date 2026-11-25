/**
 * Horizontal scaling on one machine with the Node.js cluster module.
 *
 * The primary process forks one worker per CPU core (or CLUSTER_WORKERS).
 * Every worker runs its own copy of the API (server.js) and they share port 5000 –
 * the operating system spreads incoming connections across workers.
 * If a worker crashes, the primary starts a replacement (availability).
 *
 * Usage:  npm run start:cluster
 *
 * This is safe because the API is stateless: sessions are JWTs and all
 * shared data lives in MongoDB.
 */
require("dotenv").config({ quiet: true });
const cluster = require("cluster");
const os = require("os");

const workerCount = Number(process.env.CLUSTER_WORKERS) || os.availableParallelism();

if (cluster.isPrimary) {
  console.log(`Cluster primary ${process.pid} starting ${workerCount} workers...`);
  for (let i = 0; i < workerCount; i += 1) cluster.fork();

  cluster.on("online", (worker) => console.log(`Worker ${worker.process.pid} online`));
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`Worker ${worker.process.pid} exited (${signal || code}) – starting a replacement`);
    cluster.fork();
  });
} else {
  require("./server");
}
