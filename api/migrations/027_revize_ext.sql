-- 027: Revize rozšíření — historie, kontakt, náklady, notifikace

-- Nové sloupce na hlavní tabulce revize
ALTER TABLE revize
    ADD COLUMN kontakt_id INT UNSIGNED DEFAULT NULL,
    ADD COLUMN naklady DECIMAL(12,2) DEFAULT NULL,
    ADD COLUMN pripomenout_dni INT UNSIGNED DEFAULT NULL,
    ADD CONSTRAINT fk_revize_kontakt FOREIGN KEY (kontakt_id) REFERENCES kontakty(id) ON DELETE SET NULL;

-- Historie revizí — archiv předchozích revizních zpráv
CREATE TABLE IF NOT EXISTS revize_historie (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    revize_id INT NOT NULL,
    svj_id INT UNSIGNED NOT NULL,
    datum_revize DATE NOT NULL,
    vysledek ENUM('ok','zavady','nezpusobile') NOT NULL DEFAULT 'ok',
    naklady DECIMAL(12,2) DEFAULT NULL,
    kontakt_id INT UNSIGNED DEFAULT NULL,
    soubor_nazev VARCHAR(255) DEFAULT NULL,
    soubor_cesta VARCHAR(500) DEFAULT NULL,
    poznamka TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (revize_id) REFERENCES revize(id) ON DELETE CASCADE,
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (kontakt_id) REFERENCES kontakty(id) ON DELETE SET NULL,
    INDEX idx_revhist_revize (revize_id),
    INDEX idx_revhist_svj (svj_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
