-- 028: Měřidla a odečty

-- Měřidla (vodoměry, plynoměry, elektroměry, měřiče tepla)
CREATE TABLE IF NOT EXISTS meridla (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    typ ENUM('voda_studena','voda_tepla','plyn','elektrina','teplo','jine') NOT NULL DEFAULT 'jine',
    vyrobni_cislo VARCHAR(100) DEFAULT NULL,
    umisteni_typ ENUM('jednotka','spolecne') NOT NULL DEFAULT 'jednotka',
    jednotka_id INT UNSIGNED DEFAULT NULL,
    misto VARCHAR(200) DEFAULT NULL,
    jednotka_mereni VARCHAR(30) NOT NULL DEFAULT 'm3',
    datum_instalace DATE DEFAULT NULL,
    datum_cejchu DATE DEFAULT NULL,
    interval_cejchu_mesice INT UNSIGNED DEFAULT NULL,
    datum_pristi_cejch DATE DEFAULT NULL,
    aktivni TINYINT(1) NOT NULL DEFAULT 1,
    poznamka TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (jednotka_id) REFERENCES jednotky(id) ON DELETE SET NULL,
    INDEX idx_meridla_svj (svj_id),
    INDEX idx_meridla_jednotka (jednotka_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Odečty měřidel
CREATE TABLE IF NOT EXISTS odecty (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    meridlo_id INT UNSIGNED NOT NULL,
    svj_id INT UNSIGNED NOT NULL,
    datum DATE NOT NULL,
    hodnota DECIMAL(14,3) NOT NULL,
    odecetl_id INT UNSIGNED DEFAULT NULL,
    poznamka TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meridlo_id) REFERENCES meridla(id) ON DELETE CASCADE,
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (odecetl_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_odecty_meridlo (meridlo_id),
    INDEX idx_odecty_svj (svj_id),
    INDEX idx_odecty_datum (datum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
