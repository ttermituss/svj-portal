-- ČÚZK API KN integrace
-- REST API: https://api-kn.cuzk.gov.cz | Swagger: https://api-kn.cuzk.gov.cz/Swagger

-- Adresní kód z ARES/RÚIAN pro vyhledání budovy v KN
ALTER TABLE svj
    ADD COLUMN kod_adresniho_mista INT UNSIGNED NULL DEFAULT NULL,
    ADD COLUMN stavba_id           BIGINT UNSIGNED NULL DEFAULT NULL;

-- Tabulka jednotek (bytových i nebytových)
CREATE TABLE IF NOT EXISTS jednotky (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  svj_id           INT UNSIGNED     NOT NULL,
  kn_id            BIGINT UNSIGNED  NULL     COMMENT 'ISKN ID z API KN',
  cislo_jednotky   VARCHAR(30)      NOT NULL,
  typ_jednotky     VARCHAR(100)     NOT NULL DEFAULT '',
  zpusob_vyuziti   VARCHAR(100)     NOT NULL DEFAULT '',
  podil_citatel    INT UNSIGNED     NULL,
  podil_jmenovatel INT UNSIGNED     NULL,
  lv               INT UNSIGNED     NULL     COMMENT 'Číslo listu vlastnictví',
  created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jednotka_svj_cislo (svj_id, cislo_jednotky),
  INDEX idx_jednotky_svj  (svj_id),
  INDEX idx_jednotky_kn   (kn_id),
  CONSTRAINT fk_jednotky_svj FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nahradit starý WSDP za nové REST API KN
DELETE FROM settings WHERE `key` IN ('cuzk_wsdp_url', 'cuzk_uzivatel', 'cuzk_heslo');
INSERT IGNORE INTO settings (`key`, value, label) VALUES
  ('cuzk_api_url',  'https://api-kn.cuzk.gov.cz', 'ČÚZK API KN — URL (neměnit)'),
  ('cuzk_api_klic', '',                            'ČÚZK API KN — identifikátor služby (ApiKey)');
