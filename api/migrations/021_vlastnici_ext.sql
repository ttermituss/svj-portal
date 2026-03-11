-- Propojení vlastníků s jednotkami + pronájmy + neregistrovaní vlastníci
-- Spustit: sudo mysql svj_portal < api/migrations/021_vlastnici_ext.sql

USE svj_portal;

-- Telefon a přiřazení k jednotce pro registrované uživatele
ALTER TABLE users
    ADD COLUMN telefon VARCHAR(20) NULL DEFAULT NULL,
    ADD COLUMN jednotka_id INT UNSIGNED NULL DEFAULT NULL,
    ADD INDEX idx_users_jednotka (jednotka_id),
    ADD CONSTRAINT fk_users_jednotka FOREIGN KEY (jednotka_id) REFERENCES jednotky(id) ON DELETE SET NULL;

-- Pronájem a kontakt nájemce + volná poznámka k jednotce
ALTER TABLE jednotky
    ADD COLUMN pronajem TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN najemce_jmeno VARCHAR(100) NULL DEFAULT NULL,
    ADD COLUMN najemce_prijmeni VARCHAR(100) NULL DEFAULT NULL,
    ADD COLUMN najemce_email VARCHAR(255) NULL DEFAULT NULL,
    ADD COLUMN najemce_telefon VARCHAR(20) NULL DEFAULT NULL,
    ADD COLUMN poznamka TEXT NULL DEFAULT NULL;

-- Vlastníci nezaregistrovaní v portálu (evidence kontaktů)
CREATE TABLE IF NOT EXISTS vlastnici_ext (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id       INT UNSIGNED NOT NULL,
    jmeno        VARCHAR(100) NOT NULL DEFAULT '',
    prijmeni     VARCHAR(100) NOT NULL DEFAULT '',
    email        VARCHAR(255) NULL DEFAULT NULL,
    telefon      VARCHAR(20)  NULL DEFAULT NULL,
    jednotka_id  INT UNSIGNED NULL DEFAULT NULL,
    poznamka     TEXT         NULL DEFAULT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vlastnici_ext_svj      (svj_id),
    INDEX idx_vlastnici_ext_jednotka (jednotka_id),
    CONSTRAINT fk_vlastnici_ext_svj      FOREIGN KEY (svj_id)      REFERENCES svj(id)      ON DELETE CASCADE,
    CONSTRAINT fk_vlastnici_ext_jednotka FOREIGN KEY (jednotka_id) REFERENCES jednotky(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
