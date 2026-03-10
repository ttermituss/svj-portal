-- Hlasování / ankety pro SVJ
USE svj_portal;

CREATE TABLE IF NOT EXISTS hlasovani (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  svj_id      INT UNSIGNED NOT NULL,
  nazev       VARCHAR(255) NOT NULL,
  popis       TEXT DEFAULT NULL,
  moznosti    JSON NOT NULL COMMENT 'Pole možností, např. ["Ano","Ne","Zdržuji se"]',
  deadline    DATETIME DEFAULT NULL,
  vaha_hlasu  ENUM('rovny','podil') NOT NULL DEFAULT 'podil'
              COMMENT 'rovny=každý člen 1 hlas, podil=váha dle podílu na spol. částech',
  stav        ENUM('aktivni','ukonceno') NOT NULL DEFAULT 'aktivni',
  vytvoril    INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hl_svj (svj_id),
  CONSTRAINT fk_hl_svj  FOREIGN KEY (svj_id)    REFERENCES svj(id)   ON DELETE CASCADE,
  CONSTRAINT fk_hl_user FOREIGN KEY (vytvoril)   REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hlasy (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hlasovani_id  INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  moznost_index TINYINT UNSIGNED NOT NULL COMMENT 'Index zvolené možnosti (0-based)',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hlas (hlasovani_id, user_id) COMMENT 'Každý člen hlasuje jen jednou',
  CONSTRAINT fk_hlas_hl   FOREIGN KEY (hlasovani_id) REFERENCES hlasovani(id) ON DELETE CASCADE,
  CONSTRAINT fk_hlas_user FOREIGN KEY (user_id)      REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB;
