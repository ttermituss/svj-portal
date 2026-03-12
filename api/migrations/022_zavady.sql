-- Hlášení závad — tabulky zavady + zavady_historie
-- Spustit: sudo mysql svj_portal < api/migrations/022_zavady.sql

USE svj_portal;

CREATE TABLE IF NOT EXISTS zavady (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    svj_id              INT UNSIGNED NOT NULL,
    nazev               VARCHAR(255) NOT NULL,
    popis               TEXT NOT NULL,
    lokace              VARCHAR(255) DEFAULT NULL,
    priorita            ENUM('nizka','normalni','vysoka','kriticka') NOT NULL DEFAULT 'normalni',
    stav                ENUM('nova','v_reseni','vyreseno','zamitnuto') NOT NULL DEFAULT 'nova',
    zodpovedna_osoba    VARCHAR(255) DEFAULT NULL,
    foto_nazev          VARCHAR(255) DEFAULT NULL,
    foto_cesta          VARCHAR(500) DEFAULT NULL,
    vytvoril_id         INT UNSIGNED NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    uzavreno_at         TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_zavady_svj_stav (svj_id, stav),
    INDEX idx_zavady_svj_created (svj_id, created_at),
    CONSTRAINT fk_zavady_svj FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    CONSTRAINT fk_zavady_user FOREIGN KEY (vytvoril_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS zavady_historie (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    zavada_id           INT UNSIGNED NOT NULL,
    user_id             INT UNSIGNED NOT NULL,
    typ                 ENUM('komentar','zmena_stavu','zmena_priority','prirazeni') NOT NULL,
    stary_stav          VARCHAR(50) DEFAULT NULL,
    novy_stav           VARCHAR(50) DEFAULT NULL,
    text                TEXT DEFAULT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_zavady_hist_zavada (zavada_id),
    CONSTRAINT fk_zavady_hist_zavada FOREIGN KEY (zavada_id) REFERENCES zavady(id) ON DELETE CASCADE,
    CONSTRAINT fk_zavady_hist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
