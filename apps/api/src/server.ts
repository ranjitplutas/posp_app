import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool } from "./database/pool.js";
import { logger } from "./shared/logger.js";

const app = buildApp();

async function start(): Promise<void> {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    logger.info(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await app.close(); // stops accepting new connections, waits for in-flight requests
    await closePool();
    logger.info("Shutdown complete.");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void start();
