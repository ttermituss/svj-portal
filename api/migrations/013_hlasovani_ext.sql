-- Doplnění hlasování o externí hlasy (papír, email, schůze)
USE svj_portal;

ALTER TABLE hlasovani
  ADD COLUMN externi_hlasy JSON DEFAULT NULL
    COMMENT 'Pole počtů externích hlasů per možnost [0, 3, 1, ...], zadává výbor ručně';
