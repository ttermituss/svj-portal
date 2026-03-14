-- 038: Performance indexy — N+1 optimalizace
-- Pozn: zavady_historie(zavada_id) a odecty(meridlo_id) již existovaly z předchozích migrací.

-- zavady_historie: composite index pro count komentářů (zavada_id + typ)
ALTER TABLE zavady_historie ADD INDEX idx_zavady_hist_zavada_typ (zavada_id, typ);
