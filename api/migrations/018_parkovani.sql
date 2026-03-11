CREATE TABLE parkovani (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  svj_id         INT UNSIGNED NOT NULL,
  cislo          VARCHAR(20) NOT NULL,
  typ            VARCHAR(50) NOT NULL,
  cislo_jednotky VARCHAR(50) DEFAULT NULL,
  najemce        VARCHAR(255) DEFAULT NULL,
  poznamka       TEXT DEFAULT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
  INDEX idx_svj (svj_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
