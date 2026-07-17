import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { randomUUID } from "node:crypto";
import { env, corsAllowedOrigins } from "./config/env.js";
import { logger } from "./shared/logger.js";
import { errorHandler } from "./shared/error-handler.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { pospRoutes } from "./modules/posp/posp.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { performanceRoutes } from "./modules/performance/performance.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { systemRoutes } from "./modules/system/system.routes.js";

export function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
    bodyLimit: 1_048_576, // 1MB — plenty for JSON payloads this API accepts; blocks oversized bodies early.
    trustProxy: true,
  });

  app.setErrorHandler(errorHandler);

  app.addHook("onSend", async (req, reply, payload) => {
    reply.header("x-request-id", req.id);
    return payload;
  });

  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    hsts: env.NODE_ENV === "production" ? { maxAge: 15_724_800, includeSubDomains: true } : false,
  });

  app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    // In-memory store — fine for this single-instance dev/staging deployment. If this
    // ever runs as multiple replicas, swap in @fastify/rate-limit's redis store option
    // so limits are shared across instances instead of being per-process.
  });

  app.register(cors, {
    origin: (origin, cb) => {
      // Non-browser tools (curl, server-to-server health checks) send no Origin header — allow those.
      if (!origin || corsAllowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      const err = new Error("Origin not allowed by CORS policy");
      (err as { corsRejection?: boolean }).corsRejection = true;
      cb(err, false);
    },
    credentials: false, // this API is called with a Bearer token, not cookies — never combine wildcard-style origin logic with credentials.
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  });

  if (env.NODE_ENV !== "production") {
    app.register(swagger, {
      openapi: {
        info: { title: "POSP Admin API", version: "0.1.0" },
        servers: [{ url: `http://localhost:${env.PORT}${env.API_BASE_PATH}` }],
        components: {
          securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
        },
      },
    });
    app.register(swaggerUi, { routePrefix: "/docs" });
  }

  app.register(healthRoutes);
  app.register(authRoutes, { prefix: env.API_BASE_PATH });
  app.register(usersRoutes, { prefix: env.API_BASE_PATH });
  app.register(pospRoutes, { prefix: env.API_BASE_PATH });
  app.register(dashboardRoutes, { prefix: env.API_BASE_PATH });
  app.register(performanceRoutes, { prefix: env.API_BASE_PATH });
  app.register(analyticsRoutes, { prefix: env.API_BASE_PATH });
  app.register(systemRoutes, { prefix: env.API_BASE_PATH });

  return app;
}
