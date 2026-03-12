-- 024: Notifikace + uživatelské preference
CREATE TABLE IF NOT EXISTS notifikace (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    typ ENUM('udalost','zavada','hlasovani','revize','dokument') NOT NULL,
    nazev VARCHAR(255) NOT NULL,
    detail TEXT DEFAULT NULL,
    odkaz_hash VARCHAR(100) DEFAULT NULL,
    precteno TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user_precteno (user_id, precteno, created_at),
    INDEX idx_notif_svj (svj_id),
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Preference notifikací na uživateli
ALTER TABLE users
    ADD COLUMN notif_udalosti TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN notif_zavady TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN notif_hlasovani TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN notif_revize TINYINT(1) NOT NULL DEFAULT 1;
