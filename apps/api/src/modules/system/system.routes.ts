import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorize.js";
import { getSystemHealth } from "./system.service.js";

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (scope) => {
    scope.addHook("preHandler", authenticate);
    scope.addHook("preHandler", authorizeRoles("ADMIN"));

    scope.get(
      "/system/health",
      { schema: { tags: ["system"], description: "Aggregated DB/API health, pool stats, and recent server errors — Admin only." } },
      async () => ({ data: await getSystemHealth() }),
    );
  });
}
