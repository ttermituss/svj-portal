-- SVJ Portál — pozvánkový systém
CREATE TABLE IF NOT EXISTS invitations (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  svj_id      INT UNSIGNED NOT NULL,
  token       CHAR(64)     NOT NULL UNIQUE,
  role        ENUM('vlastnik','vybor') NOT NULL DEFAULT 'vlastnik',
  created_by  INT UNSIGNED NOT NULL,
  expires_at  DATETIME     NOT NULL,
  used_at     DATETIME     DEFAULT NULL,
  used_by     INT UNSIGNED DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inv_token (token),
  INDEX idx_inv_svj   (svj_id),
  CONSTRAINT fk_inv_svj  FOREIGN KEY (svj_id)     REFERENCES svj(id)   ON DELETE CASCADE,
  CONSTRAINT fk_inv_by   FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_used FOREIGN KEY (used_by)    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
