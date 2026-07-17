import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorize.js";
import { getClusterManagerPerformance, getNeedsAttention, getStats, getTrend } from "./dashboard.service.js";
import type { CallerScope } from "../posp/posp.service.js";
import type { Granularity, TrendMetric } from "../../database/dashboard.repository.js";

function scopeFromReq(user: { sub: string; role: string | null }): CallerScope {
  return { userId: user.sub, role: user.role as CallerScope["role"] };
}

const GRANULARITY_ENUM = ["daily", "weekly", "monthly", "quarterly", "yearly"];
const METRIC_ENUM = ["total", "approved", "pending", "rejected"];

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (scope) => {
    scope.addHook("preHandler", authenticate);
    scope.addHook("preHandler", authorizeRoles("ADMIN", "CLUSTER_MANAGER", "EXECUTIVE_MANAGER"));

    scope.get("/dashboard/stats", { schema: { tags: ["dashboard"] } }, async (req) => ({
      data: await getStats(scopeFromReq(req.user!)),
    }));

    scope.get(
      "/dashboard/trend",
      {
        schema: {
          tags: ["dashboard"],
          querystring: {
            type: "object",
            properties: { granularity: { type: "string", enum: GRANULARITY_ENUM }, metric: { type: "string", enum: METRIC_ENUM } },
          },
        },
      },
      async (req) => {
        const { granularity, metric } = req.query as { granularity?: Granularity; metric?: TrendMetric };
        return { data: await getTrend(scopeFromReq(req.user!), granularity ?? "daily", metric ?? "total") };
      },
    );

    scope.get(
      "/dashboard/needs-attention",
      { schema: { tags: ["dashboard"], querystring: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50 } } } } },
      async (req) => {
        const { limit } = req.query as { limit?: number };
        return { data: await getNeedsAttention(scopeFromReq(req.user!), limit ?? 10) };
      },
    );

    // Cluster-wide performance breakdown only makes sense for roles that see across clusters.
    scope.register(async (crossClusterScope) => {
      crossClusterScope.addHook("preHandler", authorizeRoles("ADMIN", "EXECUTIVE_MANAGER"));
      crossClusterScope.get("/dashboard/cluster-performance", { schema: { tags: ["dashboard"] } }, async () => ({
        data: await getClusterManagerPerformance(),
      }));
    });
  });
}
