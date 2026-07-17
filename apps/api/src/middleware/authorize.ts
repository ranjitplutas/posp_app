import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError, ERROR_CODES, type AppRole } from "@posp-admin/contracts";

/**
 * Must run after authenticate(). Rejects PENDING_ROLE/DISABLED users before
 * even checking role (their JWT claims may be stale up to APP_JWT_EXPIRES_IN_SECONDS,
 * but that's an acceptable window per spec — sensitive Admin writes re-check
 * the DB directly, see users.service assertActiveAdmin).
 */
export function authorizeRoles(...roles: AppRole[]) {
  return async function (req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH_TOKEN_MISSING, "Missing authentication token.");
    }

    if (user.status === "PENDING_ROLE") {
      throw new AppError(ERROR_CODES.USER_PENDING_ROLE, "Your account is awaiting role assignment by an administrator.");
    }
    if (user.status === "DISABLED") {
      throw new AppError(ERROR_CODES.USER_DISABLED, "Your account has been disabled.");
    }

    if (!user.role || !roles.includes(user.role)) {
      throw new AppError(ERROR_CODES.FORBIDDEN, "You do not have permission to perform this action.");
    }
  };
}
