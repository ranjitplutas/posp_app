import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorize.js";
import { getClusterManagerComparison, getClusterManagerPerformance, getClusterManagerTrend } from "../dashboard/dashboard.service.js";
import type { Granularity, TrendMetric } from "../../database/dashboard.repository.js";

const GRANULARITY_ENUM = ["daily", "weekly", "monthly", "quarterly", "yearly"];
const METRIC_ENUM = ["total", "approved", "pending", "rejected"];

export async function performanceRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (scope) => {
    scope.addHook("preHandler", authenticate);
    scope.addHook("preHandler", authorizeRoles("ADMIN", "EXECUTIVE_MANAGER"));

    scope.get("/performance/cluster-managers", { schema: { tags: ["performance"] } }, async () => ({
      data: await getClusterManagerPerformance(),
    }));

    scope.get(
      "/performance/cluster-managers/:clusterManagerId/trend",
      {
        schema: {
          tags: ["performance"],
          params: { type: "object", required: ["clusterManagerId"], properties: { clusterManagerId: { type: "string" } } },
          querystring: {
            type: "object",
            properties: { granularity: { type: "string", enum: GRANULARITY_ENUM }, metric: { type: "string", enum: METRIC_ENUM } },
          },
        },
      },
      async (req) => {
        const { clusterManagerId } = req.params as { clusterManagerId: string };
        const { granularity, metric } = req.query as { granularity?: Granularity; metric?: TrendMetric };
        return { data: await getClusterManagerTrend(clusterManagerId, granularity ?? "monthly", metric ?? "total") };
      },
    );

    scope.get(
      "/performance/compare",
      {
        schema: {
          tags: ["performance"],
          querystring: {
            type: "object",
            properties: { granularity: { type: "string", enum: GRANULARITY_ENUM }, limit: { type: "integer", minimum: 1, maximum: 100 } },
          },
        },
      },
      async (req) => {
        const { granularity, limit } = req.query as { granularity?: Granularity; limit?: number };
        return { data: await getClusterManagerComparison(granularity ?? "monthly", limit ?? 100) };
      },
    );
  });
}
