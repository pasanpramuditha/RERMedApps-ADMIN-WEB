CREATE TABLE IF NOT EXISTS fnd_google_play_installation_daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_month CHAR(7) NOT NULL,
  report_date DATE NOT NULL,
  package_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_daily_user_installs INT UNSIGNED NOT NULL DEFAULT 0,
  total_daily_user_uninstalls INT UNSIGNED NOT NULL DEFAULT 0,
  total_active_device_installs INT UNSIGNED NOT NULL DEFAULT 0,
  packages_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_google_play_installation_daily_report_date (report_date),
  KEY idx_google_play_installation_daily_report_month (report_month),
  KEY idx_google_play_installation_daily_totals (total_daily_user_installs, total_daily_user_uninstalls)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
