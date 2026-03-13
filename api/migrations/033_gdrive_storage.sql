-- 033: Google Drive storage — folder cache, file tracking, SVJ folder ID

-- Folder cache per SVJ + typ (on-demand created)
CREATE TABLE gdrive_folders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  svj_id INT UNSIGNED NOT NULL,
  folder_type VARCHAR(30) NOT NULL,
  gdrive_folder_id VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_folder (svj_id, folder_type),
  FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- File tracking: local ↔ GDrive mapping
CREATE TABLE gdrive_files (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  svj_id INT UNSIGNED NOT NULL,
  module VARCHAR(30) NOT NULL,
  local_path VARCHAR(500) NOT NULL,
  gdrive_file_id VARCHAR(100) DEFAULT NULL,
  gdrive_name VARCHAR(255) DEFAULT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  size_bytes INT UNSIGNED DEFAULT NULL,
  synced_at DATETIME DEFAULT NULL,
  INDEX idx_module (svj_id, module),
  INDEX idx_gdrive (gdrive_file_id),
  INDEX idx_local (local_path),
  FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- GDrive SVJ folder ID + enabled flag
ALTER TABLE svj ADD COLUMN gdrive_folder_id VARCHAR(100) DEFAULT NULL;
ALTER TABLE svj ADD COLUMN gdrive_enabled TINYINT(1) NOT NULL DEFAULT 0;
