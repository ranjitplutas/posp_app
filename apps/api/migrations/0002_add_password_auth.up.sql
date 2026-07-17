-- Adds an optional local-testing password login path alongside Microsoft SSO.
-- Both columns are nullable — regular Microsoft-authenticated users never get
-- a username/password_hash set. Intended for local/dev testing only; see
-- ENABLE_PASSWORD_LOGIN in apps/api/.env.
ALTER TABLE digi_posp_app_users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE digi_posp_app_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_digi_posp_app_users_username_lower
ON digi_posp_app_users (LOWER(username))
WHERE username IS NOT NULL;
