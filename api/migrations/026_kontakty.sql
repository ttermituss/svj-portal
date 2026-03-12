-- 026: Kontakty — servisní firmy a řemeslníci SVJ
CREATE TABLE IF NOT EXISTS kontakty (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    nazev VARCHAR(200) NOT NULL,
    kategorie ENUM('spravce','vytah','elektro','plyn','voda','topeni','klicova_sluzba','uklid','zahradnik','pojistovna','ucetni','jine') NOT NULL DEFAULT 'jine',
    telefon VARCHAR(30) DEFAULT NULL,
    email VARCHAR(150) DEFAULT NULL,
    web VARCHAR(255) DEFAULT NULL,
    adresa VARCHAR(255) DEFAULT NULL,
    poznamka TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    INDEX idx_kontakty_svj (svj_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
