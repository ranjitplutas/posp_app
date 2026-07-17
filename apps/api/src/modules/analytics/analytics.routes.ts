import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorize.js";
import { getEducationDistribution, getStateDistribution } from "./analytics.service.js";

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (scope) => {
    scope.addHook("preHandler", authenticate);
    scope.addHook("preHandler", authorizeRoles("ADMIN", "EXECUTIVE_MANAGER"));

    scope.get("/analytics/state-distribution", { schema: { tags: ["analytics"] } }, async () => ({
      data: await getStateDistribution(),
    }));

    scope.get("/analytics/education-distribution", { schema: { tags: ["analytics"] } }, async () => ({
      data: await getEducationDistribution(),
    }));
  });
}
