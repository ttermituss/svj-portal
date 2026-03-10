-- RÚIAN rozšíření — technické info o budově (stavební objekt)
-- Zdroj: RÚIAN ArcGIS layer 3 (StavebniObjekt), propojení přes isknbudovaid = stavba_id

USE svj_portal;

ALTER TABLE svj
  ADD COLUMN rok_dokonceni      YEAR         DEFAULT NULL COMMENT 'Rok dokončení z RÚIAN',
  ADD COLUMN konstrukce_kod     TINYINT UNSIGNED DEFAULT NULL COMMENT 'Kód druhu svislé nosné konstrukce',
  ADD COLUMN konstrukce_nazev   VARCHAR(80)  DEFAULT NULL COMMENT 'Název druhu konstrukce',
  ADD COLUMN pocet_podlazi      TINYINT UNSIGNED DEFAULT NULL COMMENT 'Počet nadzemních a podzemních podlaží',
  ADD COLUMN pocet_bytu_ruian   SMALLINT UNSIGNED DEFAULT NULL COMMENT 'Počet bytů dle RÚIAN',
  ADD COLUMN zastavena_plocha   INT UNSIGNED DEFAULT NULL COMMENT 'Zastavěná plocha v m²',
  ADD COLUMN vytah              TINYINT(1)   DEFAULT NULL COMMENT '1 = výtah přítomen',
  ADD COLUMN zpusob_vytapeni    VARCHAR(80)  DEFAULT NULL COMMENT 'Způsob vytápění (text)';
