-- SVJ Portál — inicializace databáze
-- Spustit: mysql -u root -p < 001_init.sql

CREATE DATABASE IF NOT EXISTS svj_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_czech_ci;

USE svj_portal;

-- SVJ entity (z ARES)
CREATE TABLE IF NOT EXISTS svj (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ico CHAR(8) NOT NULL UNIQUE,
  nazev VARCHAR(255) NOT NULL,
  ulice VARCHAR(255) NOT NULL DEFAULT '',
  cislo_domovni VARCHAR(20) NOT NULL DEFAULT '',
  cislo_orientacni VARCHAR(20) NOT NULL DEFAULT '',
  obec VARCHAR(100) NOT NULL DEFAULT '',
  psc CHAR(5) NOT NULL DEFAULT '',
  pravni_forma VARCHAR(100) NOT NULL DEFAULT '',
  datum_vzniku DATE DEFAULT NULL,
  datum_zaniku DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_svj_ico (ico)
) ENGINE=InnoDB;

-- Uživatelé
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  jmeno VARCHAR(100) NOT NULL,
  prijmeni VARCHAR(100) NOT NULL DEFAULT '',
  role ENUM('vlastnik', 'vybor', 'admin') NOT NULL DEFAULT 'vlastnik',
  svj_id INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_svj (svj_id),
  CONSTRAINT fk_users_svj FOREIGN KEY (svj_id) REFERENCES svj(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sessions (DB-backed)
CREATE TABLE IF NOT EXISTS sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token CHAR(64) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_token (token),
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
