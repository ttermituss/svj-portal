-- 029: Google OAuth tokeny + kalendář sync

-- Tokeny pro Google OAuth (per-user, AES-256-CBC šifrované)
CREATE TABLE IF NOT EXISTS google_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    svj_id INT UNSIGNED NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at DATETIME NOT NULL,
    scopes TEXT NOT NULL,
    google_email VARCHAR(255) DEFAULT NULL,
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_google_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    INDEX idx_gt_svj (svj_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Sync stav pro Google Calendar events
CREATE TABLE IF NOT EXISTS google_calendar_sync (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    udalost_id INT UNSIGNED NOT NULL,
    google_event_id VARCHAR(255) NOT NULL,
    google_calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
    sync_status ENUM('synced','pending','error') NOT NULL DEFAULT 'pending',
    last_synced_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_gcs_udalost (udalost_id),
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (udalost_id) REFERENCES kalendar_udalosti(id) ON DELETE CASCADE,
    INDEX idx_gcs_svj (svj_id),
    INDEX idx_gcs_google (google_event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
