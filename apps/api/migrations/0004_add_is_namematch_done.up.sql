ALTER TABLE digi_user_verification
ADD COLUMN IF NOT EXISTS is_namematch_done BOOLEAN NOT NULL DEFAULT false;
