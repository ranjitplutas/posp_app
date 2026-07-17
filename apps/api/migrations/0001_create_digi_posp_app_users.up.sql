CREATE TABLE IF NOT EXISTS digi_posp_app_users (
    id UUID PRIMARY KEY,
    microsoft_object_id VARCHAR(100) NOT NULL,
    microsoft_tenant_id VARCHAR(100) NOT NULL,
    email VARCHAR(320) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ROLE',
    last_login_at TIMESTAMPTZ NULL,
    role_assigned_at TIMESTAMPTZ NULL,
    role_assigned_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_digi_posp_app_users_ms_identity
        UNIQUE (microsoft_tenant_id, microsoft_object_id),

    CONSTRAINT chk_digi_posp_app_users_role
        CHECK (
            role IS NULL OR role IN (
                'ADMIN',
                'CLUSTER_MANAGER',
                'EXECUTIVE_MANAGER'
            )
        ),

    CONSTRAINT chk_digi_posp_app_users_status
        CHECK (
            status IN (
                'PENDING_ROLE',
                'ACTIVE',
                'DISABLED'
            )
        ),

    CONSTRAINT fk_digi_posp_app_users_role_assigned_by
        FOREIGN KEY (role_assigned_by)
        REFERENCES digi_posp_app_users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_digi_posp_app_users_email_lower
ON digi_posp_app_users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_digi_posp_app_users_role
ON digi_posp_app_users (role);

CREATE INDEX IF NOT EXISTS idx_digi_posp_app_users_status
ON digi_posp_app_users (status);

CREATE INDEX IF NOT EXISTS idx_digi_posp_app_users_created_at
ON digi_posp_app_users (created_at DESC);
