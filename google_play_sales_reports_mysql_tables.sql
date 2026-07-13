CREATE TABLE IF NOT EXISTS fnd_google_play_sales_daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_month CHAR(7) NOT NULL,
  report_date DATE NOT NULL,
  item_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_revenue DECIMAL(18,6) NOT NULL DEFAULT 0.000000,
  total_google_fee DECIMAL(18,6) NOT NULL DEFAULT 0.000000,
  total_proceeds DECIMAL(18,6) NOT NULL DEFAULT 0.000000,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  items_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_google_play_sales_daily_report_date (report_date),
  KEY idx_google_play_sales_daily_report_month (report_month),
  KEY idx_google_play_sales_daily_revenue (total_revenue),
  KEY idx_google_play_sales_daily_proceeds (total_proceeds)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
