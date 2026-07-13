CREATE TABLE IF NOT EXISTS fnd_apple_sales_daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_month CHAR(7) NOT NULL,
  report_date DATE NOT NULL,
  item_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_sales_usd DECIMAL(18, 6) NOT NULL DEFAULT 0.000000,
  total_proceeds_usd DECIMAL(18, 6) NOT NULL DEFAULT 0.000000,
  items_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_apple_sales_daily_report_date (report_date),
  KEY idx_apple_sales_daily_report_month (report_month),
  KEY idx_apple_sales_daily_sales (total_sales_usd),
  KEY idx_apple_sales_daily_proceeds (total_proceeds_usd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
