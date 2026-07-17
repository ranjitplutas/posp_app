import { randomUUID } from "node:crypto";
import type { AppRole, UserStatus } from "@posp-admin/contracts";
import { pool } from "./pool.js";

export type DigiPospAppUser = {
  id: string;
  microsoftObjectId: string;
  microsoftTenantId: string;
  email: string;
  fullName: string;
  role: AppRole | null;
  status: UserStatus;
  lastLoginAt: string | null;
  roleAssignedAt: string | null;
  roleAssignedBy: string | null;
  createdAt: string;
  updatedAt: string;
  username: string | null;
  passwordHash: string | null;
};

const COLUMNS = `
  id, microsoft_object_id AS "microsoftObjectId", microsoft_tenant_id AS "microsoftTenantId",
  email, full_name AS "fullName", role, status,
  last_login_at AS "lastLoginAt", role_assigned_at AS "roleAssignedAt", role_assigned_by AS "roleAssignedBy",
  created_at AS "createdAt", updated_at AS "updatedAt",
  username, password_hash AS "passwordHash"
`;

/** Local/dev password login only — see ENABLE_PASSWORD_LOGIN. */
export async function findUserByUsername(username: string): Promise<DigiPospAppUser | null> {
  const { rows } = await pool.query<DigiPospAppUser>(`SELECT ${COLUMNS} FROM digi_posp_app_users WHERE LOWER(username) = $1`, [
    username.trim().toLowerCase(),
  ]);
  return rows[0] ?? null;
}

export async function touchLastLogin(userId: string): Promise<void> {
  await pool.query(`UPDATE digi_posp_app_users SET last_login_at = now() WHERE id = $1`, [userId]);
}

/**
 * Creates the user on first Microsoft login (status PENDING_ROLE, role NULL)
 * or, on every subsequent login, just bumps last_login_at + refreshes the
 * display name — never touches role/status here (that's the Admin's job via
 * assignRole/setStatus, except the one-time bootstrap-admin path in
 * auth.service).
 */
export async function upsertMicrosoftUser(params: {
  microsoftObjectId: string;
  microsoftTenantId: string;
  email: string;
  fullName: string;
}): Promise<DigiPospAppUser> {
  const { rows } = await pool.query<DigiPospAppUser>(
    `
    INSERT INTO digi_posp_app_users (id, microsoft_object_id, microsoft_tenant_id, email, full_name, last_login_at)
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (microsoft_tenant_id, microsoft_object_id)
    DO UPDATE SET full_name = EXCLUDED.full_name, last_login_at = now(), updated_at = now()
    RETURNING ${COLUMNS}
    `,
    [randomUUID(), params.microsoftObjectId, params.microsoftTenantId, params.email.trim().toLowerCase(), params.fullName],
  );
  const user = rows[0];
  if (!user) throw new Error("upsertMicrosoftUser: insert returned no row");
  return user;
}

export async function findUserById(id: string): Promise<DigiPospAppUser | null> {
  const { rows } = await pool.query<DigiPospAppUser>(`SELECT ${COLUMNS} FROM digi_posp_app_users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function countActiveAdmins(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM digi_posp_app_users WHERE role = 'ADMIN' AND status = 'ACTIVE'`,
  );
  return Number(rows[0]?.count ?? "0");
}

/** Self-bootstrap path only — assigns ADMIN/ACTIVE with no assigning actor (role_assigned_by stays NULL). */
export async function bootstrapAsAdmin(userId: string): Promise<DigiPospAppUser> {
  const { rows } = await pool.query<DigiPospAppUser>(
    `
    UPDATE digi_posp_app_users
    SET role = 'ADMIN', status = 'ACTIVE', role_assigned_at = now(), updated_at = now()
    WHERE id = $1
    RETURNING ${COLUMNS}
    `,
    [userId],
  );
  const user = rows[0];
  if (!user) throw new Error("bootstrapAsAdmin: update returned no row");
  return user;
}

export type ListUsersFilter = {
  limit: number;
  cursorCreatedAt?: string;
  cursorId?: string;
  search?: string;
  role?: AppRole;
  status?: UserStatus;
};

export async function listUsers(filter: ListUsersFilter): Promise<{ items: DigiPospAppUser[]; hasNextPage: boolean }> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.cursorCreatedAt && filter.cursorId) {
    values.push(filter.cursorCreatedAt, filter.cursorId);
    conditions.push(`(created_at < $${values.length - 1} OR (created_at = $${values.length - 1} AND id < $${values.length}))`);
  }
  if (filter.search) {
    values.push(`%${filter.search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(email) LIKE $${values.length} OR LOWER(full_name) LIKE $${values.length})`);
  }
  if (filter.role) {
    values.push(filter.role);
    conditions.push(`role = $${values.length}`);
  }
  if (filter.status) {
    values.push(filter.status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(filter.limit + 1);

  const { rows } = await pool.query<DigiPospAppUser>(
    `SELECT ${COLUMNS} FROM digi_posp_app_users ${whereClause} ORDER BY created_at DESC, id DESC LIMIT $${values.length}`,
    values,
  );

  const hasNextPage = rows.length > filter.limit;
  return { items: hasNextPage ? rows.slice(0, filter.limit) : rows, hasNextPage };
}

export async function countUsers(filter: Pick<ListUsersFilter, "search" | "role" | "status">): Promise<number> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.search) {
    values.push(`%${filter.search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(email) LIKE $${values.length} OR LOWER(full_name) LIKE $${values.length})`);
  }
  if (filter.role) {
    values.push(filter.role);
    conditions.push(`role = $${values.length}`);
  }
  if (filter.status) {
    values.push(filter.status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM digi_posp_app_users ${whereClause}`, values);
  return Number(rows[0]?.count ?? "0");
}

export async function assignRole(userId: string, role: AppRole, assignedBy: string): Promise<DigiPospAppUser | null> {
  const { rows } = await pool.query<DigiPospAppUser>(
    `
    UPDATE digi_posp_app_users
    SET role = $2, status = 'ACTIVE', role_assigned_at = now(), role_assigned_by = $3, updated_at = now()
    WHERE id = $1
    RETURNING ${COLUMNS}
    `,
    [userId, role, assignedBy],
  );
  return rows[0] ?? null;
}

export async function setStatus(userId: string, status: UserStatus): Promise<DigiPospAppUser | null> {
  const { rows } = await pool.query<DigiPospAppUser>(
    `UPDATE digi_posp_app_users SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`,
    [userId, status],
  );
  return rows[0] ?? null;
}
