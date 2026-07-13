CREATE TABLE IF NOT EXISTS fnd_google_ads_daily_report_tab (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_date DATE NOT NULL,
  campaign_id VARCHAR(128) NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  platform ENUM('android','ios') NOT NULL DEFAULT 'android',
  impressions BIGINT UNSIGNED NOT NULL DEFAULT 0,
  clicks BIGINT UNSIGNED NOT NULL DEFAULT 0,
  cost_usd DECIMAL(14,6) NOT NULL DEFAULT 0.000000,
  source VARCHAR(40) NOT NULL DEFAULT 'google_ads_api',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_google_ads_daily_campaign_date (report_date, campaign_id),
  KEY idx_google_ads_daily_report_date (report_date),
  KEY idx_google_ads_daily_platform_date (platform, report_date),
  KEY idx_google_ads_daily_cost (cost_usd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE fnd_google_ads_daily_report_tab
  ADD COLUMN IF NOT EXISTS platform ENUM('android','ios') NOT NULL DEFAULT 'android' AFTER campaign_name;

ALTER TABLE fnd_google_ads_daily_report_tab
  ADD INDEX IF NOT EXISTS idx_google_ads_daily_platform_date (platform, report_date);
