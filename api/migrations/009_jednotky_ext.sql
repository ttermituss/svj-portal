-- Rozšíření tabulky jednotky o další pole z ČÚZK KN API
-- /api/v1/Jednotky/{id} vrací: typJednotky.kod, zpusobVyuziti.kod, lv.id, vymezenaVeStavbe.castObce.nazev

ALTER TABLE jednotky
    ADD COLUMN typ_jednotky_kod    SMALLINT UNSIGNED NULL         COMMENT 'ČÚZK kód typu jednotky',
    ADD COLUMN zpusob_vyuziti_kod  SMALLINT UNSIGNED NULL         COMMENT 'ČÚZK kód způsobu využití',
    ADD COLUMN lv_id               BIGINT   UNSIGNED NULL         COMMENT 'ISKN ID listu vlastnictví',
    ADD COLUMN katastralni_uzemi   VARCHAR(100)      NOT NULL DEFAULT '' COMMENT 'Název katastrálního území';
