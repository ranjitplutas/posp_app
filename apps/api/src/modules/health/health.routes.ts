import type { FastifyInstance } from "fastify";
import { checkDatabaseConnection } from "../../database/pool.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/health/live",
    { schema: { description: "Liveness probe — confirms the process is running.", tags: ["health"] } },
    async () => ({ status: "ok", timestamp: new Date().toISOString() }),
  );

  app.get(
    "/health/ready",
    { schema: { description: "Readiness probe — confirms PostgreSQL is reachable.", tags: ["health"] } },
    async (_req, reply) => {
      const dbOk = await checkDatabaseConnection();
      if (!dbOk) {
        reply.status(503);
        return { status: "not_ready", timestamp: new Date().toISOString() };
      }
      return { status: "ok", timestamp: new Date().toISOString() };
    },
  );
}
