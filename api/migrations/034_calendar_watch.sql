-- 034: Google Calendar watch channels (webhooky)

CREATE TABLE google_calendar_watch (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    channel_id VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) DEFAULT NULL,
    expiration DATETIME NOT NULL,
    sync_token TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_gcw_svj (svj_id),
    UNIQUE KEY uk_gcw_channel (channel_id),
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhook URL setting
INSERT INTO settings (klic, val, popis)
VALUES ('google_calendar_webhook_url', '', 'HTTPS URL pro Google Calendar push notifikace (webhook)')
ON DUPLICATE KEY UPDATE popis = VALUES(popis);
