import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { env } from "../../config/env.js";
import { exchangeMicrosoftToken, getCurrentUser, passwordLogin } from "./auth.service.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  if (env.ENABLE_PASSWORD_LOGIN) {
    app.log.warn("ENABLE_PASSWORD_LOGIN is on — /auth/login (username+password) is active. Local/dev testing only; turn this off before any shared or production deployment.");

    app.post(
      "/auth/login",
      {
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
        schema: {
          tags: ["auth"],
          body: {
            type: "object",
            required: ["username", "password"],
            properties: { username: { type: "string", minLength: 1 }, password: { type: "string", minLength: 1 } },
          },
        },
      },
      async (req) => {
        const { username, password } = req.body as { username: string; password: string };
        const result = await passwordLogin(username, password);
        return { data: result };
      },
    );
  }

  app.post(
    "/auth/microsoft/exchange",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["auth"],
        body: {
          type: "object",
          required: ["idToken"],
          properties: { idToken: { type: "string", minLength: 1 } },
        },
      },
    },
    async (req) => {
      const { idToken } = req.body as { idToken: string };
      const result = await exchangeMicrosoftToken(idToken);
      return { data: result };
    },
  );

  app.get(
    "/auth/me",
    { schema: { tags: ["auth"], security: [{ bearerAuth: [] }] }, preHandler: authenticate },
    async (req) => {
      const user = await getCurrentUser(req.user!.sub);
      return { data: user };
    },
  );

  // Stateless JWT — nothing to invalidate server-side. Requires a valid token
  // purely so the endpoint isn't open to anonymous callers; the frontend
  // clears its in-memory token and the MSAL session regardless of this call's result.
  app.post(
    "/auth/logout",
    { schema: { tags: ["auth"], security: [{ bearerAuth: [] }] }, preHandler: authenticate },
    async (_req, reply) => {
      reply.status(204);
      return null;
    },
  );
}
