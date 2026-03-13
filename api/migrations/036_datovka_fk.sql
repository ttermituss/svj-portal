-- 036: Pridani chybejicich FK na datovka tabulky
ALTER TABLE datovka_zpravy
    ADD CONSTRAINT fk_dz_svj FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_dz_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE datovka_prilohy
    ADD CONSTRAINT fk_dp_svj FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE;
