-- Datová schránka (ISDS) — ID datové schránky SVJ
ALTER TABLE svj
  ADD COLUMN isds_id VARCHAR(20) DEFAULT NULL COMMENT 'ID datové schránky (ISDS)';
