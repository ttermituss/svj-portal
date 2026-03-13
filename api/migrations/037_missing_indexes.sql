-- 037: Přidání chybějících indexů
-- penb: index na svj_id pro tenant-filtered queries
ALTER TABLE penb ADD INDEX idx_penb_svj (svj_id);

-- dokumenty: composite index pro list s řazením
ALTER TABLE dokumenty ADD INDEX idx_dokumenty_svj_kat (svj_id, kategorie, created_at);
