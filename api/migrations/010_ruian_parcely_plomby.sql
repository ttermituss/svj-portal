-- RÚIAN GPS + plná adresa, parcely, plomby na jednotkách

-- GPS a plná adresa z RÚIAN (zdarma, bez auth)
ALTER TABLE svj
    ADD COLUMN lat         DECIMAL(10, 7) NULL COMMENT 'WGS84 zeměpisná šířka (RÚIAN)',
    ADD COLUMN lon         DECIMAL(10, 7) NULL COMMENT 'WGS84 zeměpisná délka (RÚIAN)',
    ADD COLUMN adresa_plna VARCHAR(250)   NULL COMMENT 'Plná adresa vč. ulice (RÚIAN)';

-- Pozemkové parcely pod domem (z ČÚZK KN API)
CREATE TABLE IF NOT EXISTS parcely (
    id               INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    svj_id           INT UNSIGNED    NOT NULL,
    kn_id            BIGINT UNSIGNED NOT NULL  COMMENT 'ISKN ID parcely',
    cislo_parcely    VARCHAR(30)     NOT NULL DEFAULT '' COMMENT 'Číslo parcely (kmenové/poddělení)',
    vymera           INT UNSIGNED    NULL     COMMENT 'Výměra v m²',
    druh_pozemku     VARCHAR(100)    NOT NULL DEFAULT '',
    zpusob_vyuziti   VARCHAR(100)    NOT NULL DEFAULT '',
    katastralni_uzemi VARCHAR(100)   NOT NULL DEFAULT '',
    updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_parcela_svj_kn (svj_id, kn_id),
    CONSTRAINT fk_parcely_svj FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Příznak aktivní plomby/řízení na jednotce
ALTER TABLE jednotky
    ADD COLUMN plomba_aktivni TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = aktivní plomba/řízení v KN';
