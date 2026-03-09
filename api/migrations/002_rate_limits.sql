-- Rate limiting pro login
CREATE TABLE IF NOT EXISTS rate_limits (
    `key`       VARCHAR(64)  NOT NULL,
    attempts    INT          NOT NULL DEFAULT 1,
    window_end  DATETIME     NOT NULL,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
