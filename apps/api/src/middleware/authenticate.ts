import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError, ERROR_CODES } from "@posp-admin/contracts";
import { verifyAppJwt } from "../modules/auth/jwt.js";

/** Verifies the app JWT and attaches req.user. Does not check role/status — pair with authorizeRoles() for that. */
export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(ERROR_CODES.AUTH_TOKEN_MISSING, "Missing authentication token.");
  }

  const token = header.slice("Bearer ".length);
  req.user = await verifyAppJwt(token);
}
