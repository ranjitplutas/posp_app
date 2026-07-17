/**
 * Creates a local username/password test user with NO role and status
 * PENDING_ROLE — for walking through the "new user lands on /access-pending,
 * then an Admin assigns them a role" flow without needing a real Microsoft
 * account. Requires ENABLE_PASSWORD_LOGIN=true.
 *
 * Usage: npm run seed:pending-user --workspace=apps/api [-- --username cluster --password cluster]
 */
import { randomUUID } from "node:crypto";
import { pool, closePool } from "../src/database/pool.js";
import { hashPassword } from "../src/modules/auth/password.js";

function parseArgs(): { username: string; password: string } {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
  };
  return { username: get("--username", "cluster"), password: get("--password", "cluster") };
}

async function run(): Promise<void> {
  const { username, password } = parseArgs();
  const passwordHash = await hashPassword(password);

  const existing = await pool.query<{ id: string }>("SELECT id FROM digi_posp_app_users WHERE LOWER(username) = $1", [
    username.toLowerCase(),
  ]);

  if (existing.rows[0]) {
    await pool.query(
      `UPDATE digi_posp_app_users SET password_hash = $2, role = NULL, status = 'PENDING_ROLE', role_assigned_at = NULL, role_assigned_by = NULL, updated_at = now() WHERE id = $1`,
      [existing.rows[0].id, passwordHash],
    );
    console.log(`Reset existing user "${username}" back to PENDING_ROLE with no role.`);
  } else {
    await pool.query(
      `
      INSERT INTO digi_posp_app_users
        (id, microsoft_object_id, microsoft_tenant_id, email, full_name, username, password_hash, role, status)
      VALUES ($1, $2, 'local', $3, 'Cluster Test User', $4, $5, NULL, 'PENDING_ROLE')
      `,
      [randomUUID(), `local-${username.toLowerCase()}`, `${username.toLowerCase()}@local.test`, username, passwordHash],
    );
    console.log(`Created user "${username}" with no role, status PENDING_ROLE.`);
  }

  console.log(`Sign in with username="${username}" password="${password}" — should land on /access-pending.`);
  console.log("Then, as the admin user, go to User Management and assign them the Cluster Manager role.");
}

run()
  .then(() => closePool())
  .catch(async (err) => {
    console.error("Failed to seed pending user:", err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
