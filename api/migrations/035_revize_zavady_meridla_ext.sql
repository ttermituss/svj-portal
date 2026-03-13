-- 035: Revize závady (defekty z revizní zprávy) + měřidla rozšíření

-- Závady zjištěné při revizi
CREATE TABLE revize_zavady (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    revize_historie_id INT UNSIGNED NOT NULL,
    svj_id INT UNSIGNED NOT NULL,
    popis VARCHAR(500) NOT NULL,
    zavaznost ENUM('nizka', 'stredni', 'vysoka', 'kriticka') NOT NULL DEFAULT 'stredni',
    termin_odstraneni DATE DEFAULT NULL,
    stav ENUM('nova', 'v_reseni', 'vyresena') NOT NULL DEFAULT 'nova',
    vyreseno_datum DATE DEFAULT NULL,
    poznamka TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (revize_historie_id) REFERENCES revize_historie(id) ON DELETE CASCADE,
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    INDEX idx_rz_svj (svj_id),
    INDEX idx_rz_historie (revize_historie_id),
    INDEX idx_rz_stav (svj_id, stav)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
