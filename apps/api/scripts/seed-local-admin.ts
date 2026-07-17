/**
 * Creates (or resets the password of) a local username/password test admin —
 * "admin"/"admin" by default — so the app can be exercised without going
 * through Microsoft SSO. Gated by ENABLE_PASSWORD_LOGIN; this script is
 * intentionally separate from the Microsoft upsert path (microsoft_object_id
 * gets a synthetic non-Microsoft placeholder value so it never collides with
 * a real Microsoft identity).
 *
 * Usage: npm run seed:local-admin --workspace=apps/api [-- --username admin --password admin]
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
  return { username: get("--username", "admin"), password: get("--password", "admin") };
}

async function run(): Promise<void> {
  const { username, password } = parseArgs();
  const passwordHash = await hashPassword(password);

  const existing = await pool.query<{ id: string }>("SELECT id FROM digi_posp_app_users WHERE LOWER(username) = $1", [
    username.toLowerCase(),
  ]);

  if (existing.rows[0]) {
    await pool.query(
      `UPDATE digi_posp_app_users SET password_hash = $2, role = 'ADMIN', status = 'ACTIVE', updated_at = now() WHERE id = $1`,
      [existing.rows[0].id, passwordHash],
    );
    console.log(`Updated existing local test admin "${username}" (password reset, role ensured ADMIN/ACTIVE).`);
  } else {
    await pool.query(
      `
      INSERT INTO digi_posp_app_users
        (id, microsoft_object_id, microsoft_tenant_id, email, full_name, username, password_hash, role, status, role_assigned_at)
      VALUES ($1, $2, 'local', $3, 'Local Test Admin', $4, $5, 'ADMIN', 'ACTIVE', now())
      `,
      [randomUUID(), `local-${username.toLowerCase()}`, `${username.toLowerCase()}@local.test`, username, passwordHash],
    );
    console.log(`Created local test admin "${username}" with role ADMIN/ACTIVE.`);
  }

  console.log("Sign in at the login screen's username/password form with these credentials.");
  console.log("Remember: this only works while ENABLE_PASSWORD_LOGIN=true in apps/api/.env — turn it off once Microsoft SSO works.");
}

run()
  .then(() => closePool())
  .catch(async (err) => {
    console.error("Failed to seed local admin:", err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
