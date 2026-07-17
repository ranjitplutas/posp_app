import { AppError, ERROR_CODES, isAppRole, isUserStatus, type AppRole, type UserStatus } from "@posp-admin/contracts";
import {
  assignRole as repoAssignRole,
  countActiveAdmins,
  countUsers,
  findUserById,
  listUsers as repoListUsers,
  setStatus as repoSetStatus,
  type DigiPospAppUser,
} from "../../database/users.repository.js";
import { decodeCursor, encodeCursor } from "./cursor.js";

function toPublic(user: DigiPospAppUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

const ALLOWED_STATUS_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  PENDING_ROLE: ["ACTIVE"],
  ACTIVE: ["DISABLED"],
  DISABLED: ["ACTIVE"],
};

export async function listUsersPage(params: {
  limit: number;
  cursor?: string;
  search?: string;
  role?: string;
  status?: string;
  includeTotal?: boolean;
}) {
  if (params.role && !isAppRole(params.role)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid role filter.", { role: "Invalid role." });
  }
  if (params.status && !isUserStatus(params.status)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid status filter.", { status: "Invalid status." });
  }

  const decoded = decodeCursor(params.cursor);
  const { items, hasNextPage } = await repoListUsers({
    limit: params.limit,
    cursorCreatedAt: decoded?.createdAt,
    cursorId: decoded?.id,
    search: params.search,
    role: params.role as AppRole | undefined,
    status: params.status as UserStatus | undefined,
  });

  const last = items[items.length - 1];
  const nextCursor = hasNextPage && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;

  const meta: { limit: number; hasNextPage: boolean; nextCursor: string | null; totalCount?: number } = {
    limit: params.limit,
    hasNextPage,
    nextCursor,
  };

  if (params.includeTotal) {
    meta.totalCount = await countUsers({
      search: params.search,
      role: params.role as AppRole | undefined,
      status: params.status as UserStatus | undefined,
    });
  }

  return { data: items.map(toPublic), meta };
}

export async function getUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "User not found.");
  return toPublic(user);
}

export async function assignRole(userId: string, role: string, assignedBy: string) {
  if (!isAppRole(role)) {
    throw new AppError(ERROR_CODES.INVALID_ROLE, "Invalid role.", { role: "Must be one of ADMIN, CLUSTER_MANAGER, EXECUTIVE_MANAGER." });
  }

  const target = await findUserById(userId);
  if (!target) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "User not found.");

  // Demoting the last active Admin away from ADMIN would lock everyone out of user management.
  if (target.role === "ADMIN" && target.status === "ACTIVE" && role !== "ADMIN") {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AppError(ERROR_CODES.LAST_ADMIN_PROTECTION, "Cannot remove the last active Admin.");
    }
  }

  const updated = await repoAssignRole(userId, role, assignedBy);
  if (!updated) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "User not found.");
  return toPublic(updated);
}

export async function setStatus(userId: string, status: string) {
  if (!isUserStatus(status)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid status.", { status: "Invalid status." });
  }

  const target = await findUserById(userId);
  if (!target) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "User not found.");

  if (!ALLOWED_STATUS_TRANSITIONS[target.status].includes(status)) {
    throw new AppError(
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `Cannot transition from ${target.status} to ${status}.`,
    );
  }

  if (status === "ACTIVE" && target.status === "PENDING_ROLE" && !target.role) {
    throw new AppError(ERROR_CODES.INVALID_STATUS_TRANSITION, "Cannot activate a user with no role assigned.");
  }

  if (target.role === "ADMIN" && target.status === "ACTIVE" && status === "DISABLED") {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AppError(ERROR_CODES.LAST_ADMIN_PROTECTION, "Cannot disable the last active Admin.");
    }
  }

  const updated = await repoSetStatus(userId, status);
  if (!updated) throw new AppError(ERROR_CODES.USER_NOT_FOUND, "User not found.");
  return toPublic(updated);
}

/** Re-checks the DB directly for the calling Admin, per spec 16 — JWT claims can be up to APP_JWT_EXPIRES_IN_SECONDS stale. */
export async function assertActiveAdmin(userId: string): Promise<void> {
  const actor = await findUserById(userId);
  if (!actor || actor.role !== "ADMIN" || actor.status !== "ACTIVE") {
    throw new AppError(ERROR_CODES.FORBIDDEN, "You do not have permission to perform this action.");
  }
}
