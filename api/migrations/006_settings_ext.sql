-- Rozšíření systémových nastavení — SMTP, gov API integrace
INSERT IGNORE INTO settings (`key`, value, label) VALUES
  -- E-mail (SMTP)
  ('smtp_host',       '',    'SMTP server (hostname)'),
  ('smtp_port',       '587', 'SMTP port'),
  ('smtp_uzivatel',   '',    'SMTP přihlašovací jméno'),
  ('smtp_heslo',      '',    'SMTP heslo'),
  ('smtp_odesilatel', '',    'E-mail odesílatele (From adresa)'),
  ('smtp_enabled',    '0',   'Odesílání e-mailů aktivní (1 = zapnuto, 0 = vypnuto)'),
  -- Integrace — česká gov API
  ('justice_url',     'https://or.justice.cz/ias/ui',                                          'URL Justice.cz (obchodní rejstřík)'),
  ('isir_url',        'https://isir.justice.cz/isir/common/index.do',                          'URL ISIR (insolvenční rejstřík)'),
  ('czso_url',        'https://apl.czso.cz/iSMS/cismet.jsp',                                   'URL ČSÚ (číselníky / RUIAN)'),
  ('portal_katastru', 'https://nahlizenidokn.cuzk.cz/',                                        'URL Nahlížení do KN (ČÚZK)');
