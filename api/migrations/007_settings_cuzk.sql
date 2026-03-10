-- Odstranit URL-only položky bez backendové integrace
DELETE FROM settings WHERE `key` IN ('justice_url', 'isir_url', 'czso_url', 'portal_katastru');

-- ČÚZK WSDP — dálkový přístup ke Katastru nemovitostí
-- Registrace: https://wsdp.cuzk.cz/
INSERT IGNORE INTO settings (`key`, value, label) VALUES
  ('cuzk_uzivatel', '', 'ČÚZK WSDP přihlašovací jméno'),
  ('cuzk_heslo',    '', 'ČÚZK WSDP heslo'),
  ('cuzk_wsdp_url', 'https://wsdp.cuzk.cz/WS_KN/WS_KN.asmx', 'ČÚZK WSDP endpoint');
