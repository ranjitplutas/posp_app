import type { FastifyInstance } from "fastify";
import { ROLE_OPTIONS } from "@posp-admin/contracts";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorize.js";
import { assignRole, assertActiveAdmin, getUser, listUsersPage, setStatus } from "./users.service.js";

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  // Role metadata is safe for any authenticated user (e.g. to render a read-only role label) —
  // only the write endpoints below are Admin-restricted.
  app.get("/metadata/roles", { schema: { tags: ["metadata"] }, preHandler: authenticate }, async () => ({
    data: ROLE_OPTIONS,
  }));

  app.register(async (adminScope) => {
    adminScope.addHook("preHandler", authenticate);
    adminScope.addHook("preHandler", authorizeRoles("ADMIN"));

    adminScope.get(
      "/users",
      {
        schema: {
          tags: ["users"],
          querystring: {
            type: "object",
            properties: {
              limit: { type: "integer", minimum: 1, maximum: 100 },
              cursor: { type: "string" },
              search: { type: "string" },
              role: { type: "string" },
              status: { type: "string" },
              includeTotal: { type: "boolean" },
            },
          },
        },
      },
      async (req) => {
        const q = req.query as {
          limit?: number;
          cursor?: string;
          search?: string;
          role?: string;
          status?: string;
          includeTotal?: boolean;
        };
        return listUsersPage({ limit: q.limit ?? 25, cursor: q.cursor, search: q.search, role: q.role, status: q.status, includeTotal: q.includeTotal });
      },
    );

    adminScope.get(
      "/users/:userId",
      { schema: { tags: ["users"], params: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } } } },
      async (req) => {
        const { userId } = req.params as { userId: string };
        return { data: await getUser(userId) };
      },
    );

    adminScope.patch(
      "/users/:userId/role",
      {
        schema: {
          tags: ["users"],
          params: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } },
          body: { type: "object", required: ["role"], properties: { role: { type: "string" } } },
        },
      },
      async (req) => {
        await assertActiveAdmin(req.user!.sub);
        const { userId } = req.params as { userId: string };
        const { role } = req.body as { role: string };
        return { data: await assignRole(userId, role, req.user!.sub) };
      },
    );

    adminScope.patch(
      "/users/:userId/status",
      {
        schema: {
          tags: ["users"],
          params: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } },
          body: { type: "object", required: ["status"], properties: { status: { type: "string" } } },
        },
      },
      async (req) => {
        await assertActiveAdmin(req.user!.sub);
        const { userId } = req.params as { userId: string };
        const { status } = req.body as { status: string };
        return { data: await setStatus(userId, status) };
      },
    );
  });
}
