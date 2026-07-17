import "fastify";
import type { AppJwtClaims } from "../modules/auth/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AppJwtClaims;
  }
}
