-- Profilový obrázek uživatele (filename uloženo v DB, soubor v uploads/avatars/)
ALTER TABLE users
    ADD COLUMN avatar VARCHAR(120) NULL DEFAULT NULL;
