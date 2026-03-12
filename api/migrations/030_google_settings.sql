-- 030: Google OAuth settings

INSERT IGNORE INTO settings (`key`, value, label) VALUES
('google_client_id',     '', 'Google OAuth — Client ID'),
('google_client_secret', '', 'Google OAuth — Client Secret'),
('google_redirect_uri',  '', 'Google OAuth — Redirect URI (automaticky)');
