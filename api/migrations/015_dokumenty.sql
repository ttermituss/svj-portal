CREATE TABLE dokumenty (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  svj_id          INT UNSIGNED NOT NULL,
  nazev           VARCHAR(255) NOT NULL,
  popis           TEXT,
  kategorie       ENUM('stanovy','zapisy','smlouvy','pojistky','revize','ostatni') NOT NULL DEFAULT 'ostatni',
  soubor_nazev    VARCHAR(255) NOT NULL,
  soubor_cesta    VARCHAR(500) NOT NULL,
  datum_platnosti DATE DEFAULT NULL,
  pristup         ENUM('vsichni','vybor') NOT NULL DEFAULT 'vsichni',
  uploaded_by     INT UNSIGNED NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (svj_id)      REFERENCES svj(id)   ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
