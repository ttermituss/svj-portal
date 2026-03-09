-- SVJ Portál — systémová nastavení
-- Spustit: mysql -u svj_portal -psvj_portal_dev svj_portal < api/migrations/003_settings.sql

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  label VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO settings (`key`, value, label) VALUES
  ('svj_nazev',   '', 'Název SVJ'),
  ('svj_web',     '', 'URL webu SVJ'),
  ('svj_kontakt', '', 'Kontaktní e-mail'),
  ('ares_url',    'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest', 'URL ARES API');
