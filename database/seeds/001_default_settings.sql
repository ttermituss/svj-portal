-- ============================================================
-- SVJ Portál — Výchozí nastavení (seed)
-- POZOR: API klíče sem NEPATŘÍ — zadej je přes admin UI
-- ============================================================

INSERT INTO `settings` (`key`, `value`, `label`) VALUES
  ('svj_nazev',    '',  'Název SVJ'),
  ('svj_kontakt',  '',  'Kontaktní e-mail'),
  ('svj_web',      '',  'URL webu SVJ'),
  ('ares_url',     'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest', 'URL ARES API'),
  ('smtp_host',    '',  'SMTP server (e-mail)'),
  ('smtp_user',    '',  'SMTP přihlášení'),
  ('api_klic',     '',  'Integrační API klíč'),
  ('cuzk_api_key', '',  'ČÚZK KN API klíč')
ON DUPLICATE KEY UPDATE label = VALUES(label);
