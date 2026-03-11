-- Archiv datové schránky (ISDS)
CREATE TABLE IF NOT EXISTS datovka_zpravy (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  svj_id      INT UNSIGNED NOT NULL,
  dm_id       VARCHAR(20)  NOT NULL,
  sender      VARCHAR(500) NOT NULL DEFAULT '',
  sender_isds VARCHAR(20)  DEFAULT NULL,
  recipient   VARCHAR(500) NOT NULL DEFAULT '',
  annotation  TEXT         NOT NULL,
  sender_ref  VARCHAR(200) DEFAULT NULL,
  personal_delivery TINYINT(1) NOT NULL DEFAULT 0,
  ts_zpravy   DATETIME     NULL COMMENT 'Timestamp z QTimestamp (UTC)',
  uploaded_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INT UNSIGNED NOT NULL,
  INDEX idx_dz_svj   (svj_id),
  INDEX idx_dz_dm_id (svj_id, dm_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS datovka_prilohy (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  zprava_id      INT UNSIGNED NOT NULL,
  svj_id         INT UNSIGNED NOT NULL,
  filename       VARCHAR(500) NOT NULL,
  mimetype       VARCHAR(100) NOT NULL DEFAULT '',
  file_meta_type VARCHAR(20)  NOT NULL DEFAULT 'enclosure',
  file_path      VARCHAR(500) NOT NULL,
  file_size      INT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_dp_zprava (zprava_id),
  CONSTRAINT fk_dp_zprava FOREIGN KEY (zprava_id)
    REFERENCES datovka_zpravy(id) ON DELETE CASCADE
) ENGINE=InnoDB;
