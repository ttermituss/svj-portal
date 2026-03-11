CREATE TABLE revize (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  svj_id          INT UNSIGNED NOT NULL,
  typ             VARCHAR(50) NOT NULL,
  nazev           VARCHAR(255) NOT NULL,
  datum_posledni  DATE NOT NULL,
  interval_mesice INT DEFAULT NULL,
  datum_pristi    DATE DEFAULT NULL,
  soubor_nazev    VARCHAR(255) DEFAULT NULL,
  soubor_cesta    VARCHAR(500) DEFAULT NULL,
  poznamka        TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
  INDEX idx_svj (svj_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
