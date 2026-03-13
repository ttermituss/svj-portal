-- Přílohy k záznamům fondu oprav
CREATE TABLE fond_prilohy (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fond_oprav_id INT NOT NULL,
  svj_id INT UNSIGNED NOT NULL,
  soubor_nazev VARCHAR(255) NOT NULL,
  soubor_cesta VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fond_oprav_id) REFERENCES fond_oprav(id) ON DELETE CASCADE,
  FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
  INDEX idx_fp_fond (fond_oprav_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
