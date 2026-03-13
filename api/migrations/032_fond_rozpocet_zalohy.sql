-- 032: Fond oprav Fáze 3 — rozpočet, předpisy záloh, evidence plateb, notifikace

-- Roční rozpočet per kategorie
CREATE TABLE fond_rozpocet (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    rok SMALLINT UNSIGNED NOT NULL,
    typ ENUM('prijem','vydaj') NOT NULL,
    kategorie VARCHAR(100) NOT NULL,
    castka DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0,
    poznamka TEXT DEFAULT NULL,
    UNIQUE KEY uq_rozpocet (svj_id, rok, typ, kategorie),
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Předpis záloh — definice měsíční částky per jednotka/rok
CREATE TABLE fond_predpis (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    rok SMALLINT UNSIGNED NOT NULL,
    jednotka_id INT UNSIGNED NOT NULL,
    mesicni_castka DECIMAL(10,2) UNSIGNED NOT NULL,
    poznamka TEXT DEFAULT NULL,
    UNIQUE KEY uq_predpis (svj_id, rok, jednotka_id),
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (jednotka_id) REFERENCES jednotky(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evidence plateb záloh per měsíc
CREATE TABLE fond_zalohy (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id INT UNSIGNED NOT NULL,
    predpis_id INT UNSIGNED NOT NULL,
    mesic TINYINT UNSIGNED NOT NULL,
    predepsano DECIMAL(10,2) UNSIGNED NOT NULL,
    zaplaceno DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0,
    datum_platby DATE DEFAULT NULL,
    poznamka TEXT DEFAULT NULL,
    UNIQUE KEY uq_zaloha (predpis_id, mesic),
    INDEX idx_zalohy_svj_mesic (svj_id, mesic),
    FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    FOREIGN KEY (predpis_id) REFERENCES fond_predpis(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rozšíření notifikací o typ 'fond'
ALTER TABLE notifikace MODIFY COLUMN typ ENUM('udalost','zavada','hlasovani','revize','dokument','fond') NOT NULL;

-- User preference pro fond notifikace
ALTER TABLE users ADD COLUMN notif_fond TINYINT(1) NOT NULL DEFAULT 1;
