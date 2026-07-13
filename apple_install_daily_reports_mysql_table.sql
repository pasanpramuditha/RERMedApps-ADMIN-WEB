CREATE TABLE IF NOT EXISTS fnd_apple_install_daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_month CHAR(7) NOT NULL,
  report_date DATE NOT NULL,
  item_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_units INT UNSIGNED NOT NULL DEFAULT 0,
  items_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_apple_install_daily_report_date (report_date),
  KEY idx_apple_install_daily_report_month (report_month),
  KEY idx_apple_install_daily_units (total_units)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
