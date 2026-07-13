CREATE TABLE IF NOT EXISTS fnd_admob_daily_report_tab (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_date DATE NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'unknown',
  admob_app_id VARCHAR(128) NOT NULL,
  app_name VARCHAR(255) NOT NULL,
  impressions BIGINT UNSIGNED NOT NULL DEFAULT 0,
  clicks BIGINT UNSIGNED NOT NULL DEFAULT 0,
  estimated_earnings_usd DECIMAL(14,6) NOT NULL DEFAULT 0.000000,
  ctr DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  source VARCHAR(40) NOT NULL DEFAULT 'admob_api',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admob_daily_report_app_date (report_date, admob_app_id),
  KEY idx_admob_daily_report_date (report_date),
  KEY idx_admob_daily_report_platform (platform),
  KEY idx_admob_daily_report_earnings (estimated_earnings_usd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fnd_admob_app_map_tab (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admob_app_id VARCHAR(128) NOT NULL,
  app_name VARCHAR(255) DEFAULT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'unknown',
  valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admob_app_map_app_id (admob_app_id),
  KEY idx_admob_app_map_platform (platform),
  KEY idx_admob_app_map_valid (valid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
