-- ============================================================
-- SVJ Portál — Inicializační migrace (schéma databáze)
-- Verze: 001
-- Datum: 2026-03-10
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Uživatelé
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            int unsigned     NOT NULL AUTO_INCREMENT,
  `email`         varchar(255)     COLLATE utf8mb4_czech_ci NOT NULL,
  `password_hash` varchar(255)     COLLATE utf8mb4_czech_ci NOT NULL,
  `jmeno`         varchar(100)     COLLATE utf8mb4_czech_ci NOT NULL,
  `prijmeni`      varchar(100)     COLLATE utf8mb4_czech_ci NOT NULL DEFAULT '',
  `role`          enum('vlastnik','vybor','admin') COLLATE utf8mb4_czech_ci NOT NULL DEFAULT 'vlastnik',
  `svj_id`        int unsigned     DEFAULT NULL,
  `created_at`    timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_svj`   (`svj_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- ------------------------------------------------------------
-- SVJ (Společenství vlastníků jednotek)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `svj` (
  `id`                int unsigned  NOT NULL AUTO_INCREMENT,
  `ico`               char(8)       COLLATE utf8mb4_czech_ci NOT NULL,
  `nazev`             varchar(255)  COLLATE utf8mb4_czech_ci NOT NULL,
  `ulice`             varchar(255)  COLLATE utf8mb4_czech_ci NOT NULL DEFAULT '',
  `cislo_domovni`     varchar(20)   COLLATE utf8mb4_czech_ci NOT NULL DEFAULT '',
  `cislo_orientacni`  varchar(20)   COLLATE utf8mb4_czech_ci NOT NULL DEFAULT '',
  `obec`              varchar(100)  COLLATE utf8mb4_czech_ci NOT NULL DEFAULT '',
  `psc`               char(5)       COLLATE utf8mb4_czech_ci NOT NULL DEFAULT '',
  `pravni_forma`      varchar(100)  COLLATE utf8mb4_czech_ci NOT NULL DEFAULT '',
  `datum_vzniku`      date          DEFAULT NULL,
  `datum_zaniku`      date          DEFAULT NULL,
  `created_at`        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ico` (`ico`),
  KEY `idx_svj_ico` (`ico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- ------------------------------------------------------------
-- Foreign key: users → svj
-- ------------------------------------------------------------
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_svj`
  FOREIGN KEY (`svj_id`) REFERENCES `svj` (`id`) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- Sessiony
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         int unsigned  NOT NULL AUTO_INCREMENT,
  `token`      char(64)      COLLATE utf8mb4_czech_ci NOT NULL,
  `user_id`    int unsigned  NOT NULL,
  `expires_at` timestamp     NOT NULL,
  `ip_address` varchar(45)   COLLATE utf8mb4_czech_ci DEFAULT NULL,
  `user_agent` varchar(500)  COLLATE utf8mb4_czech_ci DEFAULT NULL,
  `created_at` timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_sessions_token`   (`token`),
  KEY `idx_sessions_user`    (`user_id`),
  KEY `idx_sessions_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- ------------------------------------------------------------
-- Nastavení portálu (citlivé hodnoty šifrované AES-256-GCM)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `key`   varchar(100) NOT NULL,
  `value` text         NOT NULL,
  `label` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Rate limiting
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `key`        varchar(64) NOT NULL,
  `attempts`   int         NOT NULL DEFAULT '1',
  `window_end` datetime    NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
