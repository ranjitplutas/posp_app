DROP INDEX IF EXISTS uq_digi_posp_app_users_username_lower;
ALTER TABLE digi_posp_app_users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE digi_posp_app_users DROP COLUMN IF EXISTS username;
