import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorize.js";
import { listUsersPage } from "../users/users.service.js";
import {
  assignClusterManager,
  getPosp,
  getVerification,
  listEducations,
  listPospsPage,
  updateVerificationField,
  validateEducationNameMatch,
  type CallerScope,
} from "./posp.service.js";

function scopeFromReq(user: { sub: string; role: string | null }): CallerScope {
  return { userId: user.sub, role: user.role as CallerScope["role"] };
}

export async function pospRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (scope) => {
    scope.addHook("preHandler", authenticate);
    scope.addHook("preHandler", authorizeRoles("ADMIN", "CLUSTER_MANAGER", "EXECUTIVE_MANAGER"));

    scope.get(
      "/posps",
      {
        schema: {
          tags: ["posp"],
          querystring: {
            type: "object",
            properties: {
              limit: { type: "integer", minimum: 1, maximum: 100 },
              page: { type: "integer", minimum: 1 },
              search: { type: "string" },
              // Comma-separated list of statuses, e.g. "2,3" for Approved+Completed — lets a
              // single dashboard card link to a multi-status filtered registry view.
              status: { type: "string" },
              clusterManagerId: { type: "string" },
            },
          },
        },
      },
      async (req) => {
        const q = req.query as { limit?: number; page?: number; search?: string; status?: string; clusterManagerId?: string };
        const status = q.status
          ? q.status
              .split(",")
              .map((s) => Number(s.trim()))
              .filter((n) => !Number.isNaN(n))
          : undefined;
        return listPospsPage(
          { limit: q.limit ?? 25, page: q.page ?? 1, search: q.search, status, clusterManagerId: q.clusterManagerId },
          scopeFromReq(req.user!),
        );
      },
    );

    scope.get(
      "/posps/:pospId",
      { schema: { tags: ["posp"], params: { type: "object", required: ["pospId"], properties: { pospId: { type: "integer" } } } } },
      async (req) => {
        const { pospId } = req.params as { pospId: number };
        return { data: await getPosp(pospId, scopeFromReq(req.user!)) };
      },
    );

    scope.get(
      "/posps/:pospId/verification",
      { schema: { tags: ["posp"], params: { type: "object", required: ["pospId"], properties: { pospId: { type: "integer" } } } } },
      async (req) => {
        const { pospId } = req.params as { pospId: number };
        return { data: await getVerification(pospId, scopeFromReq(req.user!)) };
      },
    );

    scope.get("/educations", { schema: { tags: ["posp"] } }, async () => ({ data: await listEducations() }));

    // Cluster manager (re)assignment is Admin/Executive Manager only — a Cluster Manager
    // must not be able to reassign their own POSPs to someone else.
    scope.register(async (assignScope) => {
      assignScope.addHook("preHandler", authorizeRoles("ADMIN", "EXECUTIVE_MANAGER"));

      // Lightweight lookup for the assignment dropdown — Executive Manager needs this even
      // though the full /users admin screen (with disable/role-change actions) stays Admin-only.
      assignScope.get("/cluster-managers", { schema: { tags: ["posp"] } }, async () => {
        const { data } = await listUsersPage({ limit: 100, role: "CLUSTER_MANAGER", status: "ACTIVE" });
        return { data: data.map((u) => ({ id: u.id, name: u.fullName, email: u.email })) };
      });

      assignScope.patch(
        "/posps/:pospId/cluster-manager",
        {
          schema: {
            tags: ["posp"],
            params: { type: "object", required: ["pospId"], properties: { pospId: { type: "integer" } } },
            body: { type: "object", required: ["clusterManagerId"], properties: { clusterManagerId: { type: ["string", "null"] } } },
          },
        },
        async (req) => {
          const { pospId } = req.params as { pospId: number };
          const { clusterManagerId } = req.body as { clusterManagerId: string | null };
          return { data: await assignClusterManager(pospId, clusterManagerId) };
        },
      );
    });

    // Verification-field edits (approve/reject) are open to Cluster Manager too — updateVerificationField
    // already scopes the lookup to the caller's own assigned POSPs when role is CLUSTER_MANAGER, so this
    // can't be used to touch someone else's POSP.
    scope.patch(
      "/posps/:pospId/verification/:verificationId",
      {
        schema: {
          tags: ["posp"],
          params: {
            type: "object",
            required: ["pospId", "verificationId"],
            properties: { pospId: { type: "integer" }, verificationId: { type: "integer" } },
          },
          body: { type: "object", required: ["field", "value"], properties: { field: { type: "string" } } },
        },
      },
      async (req) => {
        const { pospId, verificationId } = req.params as { pospId: number; verificationId: number };
        const { field, value } = req.body as { field: string; value: unknown };
        return { data: await updateVerificationField(pospId, verificationId, field, value, scopeFromReq(req.user!)) };
      },
    );

    // Same scoping as the PATCH above (Cluster Manager restricted to their own assigned POSPs).
    // Education-only — the service layer rejects any other document type.
    scope.post(
      "/posps/:pospId/verification/:verificationId/name-match",
      {
        schema: {
          tags: ["posp"],
          params: {
            type: "object",
            required: ["pospId", "verificationId"],
            properties: { pospId: { type: "integer" }, verificationId: { type: "integer" } },
          },
          body: {
            type: "object",
            required: ["documentName"],
            properties: { documentName: { type: "string", minLength: 1, maxLength: 300 } },
          },
        },
      },
      async (req) => {
        const { pospId, verificationId } = req.params as { pospId: number; verificationId: number };
        const { documentName } = req.body as { documentName: string };
        return { data: await validateEducationNameMatch(pospId, verificationId, documentName, scopeFromReq(req.user!)) };
      },
    );
  });
}
