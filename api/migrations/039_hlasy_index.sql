-- 039: Index na hlasy(hlasovani_id, moznost_index)
-- Urychlí GROUP BY moznost_index při počítání výsledků hlasování
-- (COUNT, SUM vážených hlasů) — UNIQUE KEY uq_hlas pokrývá jen user_id lookup.
ALTER TABLE hlasy ADD INDEX idx_hlasy_hlas_moznost (hlasovani_id, moznost_index);
