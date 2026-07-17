/**
 * Minimal forward-only migration runner. Applies every migrations/*.up.sql file
 * not yet recorded in schema_migrations, in filename order, each in its own
 * transaction. Mostly creates/alters tables this app owns; the one exception is
 * additive ALTER TABLE ADD COLUMN (with a DEFAULT) on the shared digi_user_verification
 * table — safe/backward-compatible for the other app reading that same table, never
 * a destructive change (no DROP/RENAME on existing columns of shared tables).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool, closePool } from "../src/database/pool.js";
import { logger } from "../src/shared/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  return new Set(rows.map((r) => r.name));
}

async function run(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".up.sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info(`Skipping already-applied migration: ${file}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      logger.info(`Applied migration: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error({ err }, `Failed to apply migration: ${file}`);
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info("Migrations complete.");
}

run()
  .then(() => closePool())
  .catch(async (err) => {
    logger.error({ err }, "Migration run failed");
    await closePool();
    process.exit(1);
  });
