CREATE TABLE fond_oprav (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  svj_id     INT UNSIGNED NOT NULL,
  typ        ENUM('prijem', 'vydaj') NOT NULL,
  kategorie  VARCHAR(100) NOT NULL,
  popis      VARCHAR(500) NOT NULL,
  castka     DECIMAL(12,2) UNSIGNED NOT NULL,
  datum      DATE NOT NULL,
  poznamka   TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
  INDEX idx_svj_datum (svj_id, datum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
