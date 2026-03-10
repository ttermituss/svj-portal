CREATE TABLE penb (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  svj_id           INT UNSIGNED NOT NULL,
  energeticka_trida CHAR(1) NOT NULL,
  datum_vystaveni  DATE NOT NULL,
  datum_platnosti  DATE NOT NULL,
  soubor_nazev     VARCHAR(255) DEFAULT NULL,
  soubor_cesta     VARCHAR(500) DEFAULT NULL,
  poznamka         TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
