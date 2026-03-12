-- 023: Vlastní události v kalendáři (admin/výbor)
CREATE TABLE IF NOT EXISTS kalendar_udalosti (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    nazev VARCHAR(255) NOT NULL,
    popis TEXT DEFAULT NULL,
    datum_od DATE NOT NULL,
    datum_do DATE DEFAULT NULL,
    celodenny TINYINT(1) NOT NULL DEFAULT 1,
    cas_od TIME DEFAULT NULL,
    cas_do TIME DEFAULT NULL,
    misto VARCHAR(255) DEFAULT NULL,
    kategorie ENUM('schuzka','udrzba','kontrola','spolecenska','jine') NOT NULL DEFAULT 'jine',
    opakovani ENUM('none','tyden','mesic','rok') NOT NULL DEFAULT 'none',
    pripomenout_dni INT UNSIGNED DEFAULT NULL,
    vytvoril_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ku_svj_datum (svj_id, datum_od, datum_do),
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (vytvoril_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
