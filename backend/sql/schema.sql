-- SecureVault - Schéma PostgreSQL
-- Compatible PostgreSQL 13+

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type VARCHAR(100),
    max_downloads INTEGER DEFAULT 1 CHECK (max_downloads > 0 AND max_downloads <= 100),
    download_count INTEGER DEFAULT 0 CHECK (download_count >= 0),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('upload', 'download', 'delete', 'view')),
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_access_logs_file_id ON access_logs(file_id);
