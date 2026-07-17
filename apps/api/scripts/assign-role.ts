/**
 * One-time CLI fallback for assigning a role (typically the first Admin)
 * without going through the API. Prefer ADMIN_BOOTSTRAP_EMAILS (see
 * config/env.ts) for the very first login — this script exists for cases
 * where that env var wasn't set in time, or a role needs fixing directly.
 *
 * Usage: npm run user:assign-role -- --email admin@company.com --role ADMIN
 */
import { isAppRole } from "@posp-admin/contracts";
import { pool, closePool } from "../src/database/pool.js";

function parseArgs(): { email: string; role: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const email = get("--email");
  const role = get("--role");
  if (!email || !role) {
    console.error("Usage: npm run user:assign-role -- --email <email> --role <ADMIN|CLUSTER_MANAGER|EXECUTIVE_MANAGER>");
    process.exit(1);
  }
  return { email, role };
}

async function run(): Promise<void> {
  const { email, role } = parseArgs();
  const normalizedEmail = email.trim().toLowerCase();

  if (!isAppRole(role)) {
    console.error(`Invalid role "${role}". Must be one of ADMIN, CLUSTER_MANAGER, EXECUTIVE_MANAGER.`);
    process.exit(1);
  }

  const { rows } = await pool.query<{ id: string }>("SELECT id FROM digi_posp_app_users WHERE LOWER(email) = $1", [normalizedEmail]);
  const user = rows[0];
  if (!user) {
    console.error(`No user found with email "${normalizedEmail}". They must sign in with Microsoft at least once first.`);
    process.exit(1);
  }

  await pool.query(
    `UPDATE digi_posp_app_users SET role = $2, status = 'ACTIVE', role_assigned_at = now(), updated_at = now() WHERE id = $1`,
    [user.id, role],
  );

  console.log(`Assigned role ${role} to ${normalizedEmail}. They are now ACTIVE.`);
}

run()
  .then(() => closePool())
  .catch(async (err) => {
    console.error("Failed to assign role:", err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
