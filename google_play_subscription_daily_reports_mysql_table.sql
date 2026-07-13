CREATE TABLE IF NOT EXISTS fnd_google_play_subscription_daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_month CHAR(7) NOT NULL,
  report_date DATE NOT NULL,
  product_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_new_subscriptions INT UNSIGNED NOT NULL DEFAULT 0,
  total_cancelled_subscriptions INT UNSIGNED NOT NULL DEFAULT 0,
  total_active_subscriptions INT UNSIGNED NOT NULL DEFAULT 0,
  products_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_google_play_subscription_daily_report_date (report_date),
  KEY idx_google_play_subscription_daily_report_month (report_month),
  KEY idx_google_play_subscription_daily_totals (total_new_subscriptions, total_cancelled_subscriptions)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
