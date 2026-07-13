CREATE TABLE IF NOT EXISTS `fnd_admin_global_settings_tab` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `app_param` varchar(150) NOT NULL,
  `int_value` bigint NULL,
  `string_value` longtext NULL,
  `value_type` enum('string','int','bool','json','secret') NOT NULL DEFAULT 'string',
  `description` varchar(500) NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT 0,
  `valid` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_global_settings_param` (`app_param`),
  KEY `idx_admin_global_settings_valid` (`valid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fnd_admin_page_config_tab` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `page_key` varchar(100) NOT NULL,
  `card_id` varchar(150) NOT NULL,
  `visibility` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int NOT NULL DEFAULT 0,
  `refresh_interval_seconds` int NOT NULL DEFAULT 0,
  `display_name` varchar(255) NULL,
  `section_key` varchar(100) NULL,
  `grid_span` varchar(50) NULL,
  `config_json` longtext NULL,
  `valid` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_page_config_card` (`page_key`, `card_id`),
  KEY `idx_admin_page_config_page` (`page_key`, `valid`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `fnd_admin_global_settings_tab`
  (`app_param`, `int_value`, `string_value`, `value_type`, `description`, `is_secret`, `valid`)
VALUES
  ('service_account_json', NULL, '', 'secret', 'Google Play service account JSON', 1, 1),
  ('google_services_json', NULL, '', 'json', 'Firebase google-services.json content', 0, 1),
  ('dashboard_cards_json', NULL, '', 'json', 'Dashboard card appearance and shared dashboard JSON config', 0, 1),
  ('navigation_visibility_json', NULL, '{}', 'json', 'Navigation visibility JSON config', 0, 1),
  ('company_logo_url', NULL, '', 'string', 'Company logo URL', 0, 1),
  ('initial_screen', NULL, '/dashboard', 'string', 'Initial page after login', 0, 1),
  ('demo_mode_info_cards', 0, NULL, 'bool', 'Use demo data for dashboard info cards', 0, 1),
  ('demo_mode_app_charts', 0, NULL, 'bool', 'Use demo data for app charts', 0, 1),
  ('demo_mode_financial_summary', 0, NULL, 'bool', 'Use demo data for financial summary', 0, 1),
  ('debug_info_visibility', 0, NULL, 'bool', 'Show debug information in dashboard pages', 0, 1),
  ('php_auth_token', NULL, '', 'secret', 'PHP backend auth token', 1, 1),
  ('admob_client_id', NULL, '', 'secret', 'AdMob OAuth client id', 1, 1),
  ('admob_client_secret', NULL, '', 'secret', 'AdMob OAuth client secret', 1, 1),
  ('admob_refresh_token', NULL, '', 'secret', 'AdMob OAuth refresh token', 1, 1),
  ('admob_publisher_id', NULL, '', 'string', 'AdMob publisher id', 0, 1),
  ('google_ads_client_id', NULL, '', 'secret', 'Google Ads OAuth client id', 1, 1),
  ('google_ads_client_secret', NULL, '', 'secret', 'Google Ads OAuth client secret', 1, 1),
  ('google_ads_refresh_token', NULL, '', 'secret', 'Google Ads OAuth refresh token', 1, 1),
  ('google_ads_developer_token', NULL, '', 'secret', 'Google Ads developer token', 1, 1),
  ('google_ads_customer_id', NULL, '', 'string', 'Google Ads customer id', 0, 1),
  ('google_ads_login_customer_id', NULL, '', 'string', 'Optional Google Ads manager login customer id', 0, 1),
  ('google_ads_api_version', NULL, 'v24', 'string', 'Google Ads API version', 0, 1),
  ('app_store_connect_api_key_id', NULL, '', 'secret', 'App Store Connect API key id', 1, 1),
  ('app_store_connect_api_issuer_id', NULL, '', 'secret', 'App Store Connect API issuer id', 1, 1),
  ('app_store_connect_api_private_key', NULL, '', 'secret', 'App Store Connect API private key', 1, 1),
  ('app_store_connect_vendor_number', NULL, '', 'string', 'App Store Connect vendor number', 0, 1)
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `value_type` = VALUES(`value_type`),
  `is_secret` = VALUES(`is_secret`),
  `valid` = VALUES(`valid`);

INSERT INTO `fnd_admin_page_config_tab`
  (`page_key`, `card_id`, `visibility`, `sort_order`, `refresh_interval_seconds`, `display_name`, `section_key`, `grid_span`, `config_json`, `valid`)
VALUES
  ('home', '__page__', 1, 0, 0, 'Home Page', 'page', NULL, NULL, 1),
  ('home', 'appInstalls', 1, 10, 0, 'App Installs', 'summary', NULL, NULL, 1),
  ('home', 'activeUsers', 1, 20, 0, 'Active Users', 'summary', NULL, NULL, 1),
  ('home', 'purchaseEvents', 1, 30, 0, 'Purchase Events', 'summary', NULL, NULL, 1),
  ('home', 'appRevenue', 1, 40, 0, 'App Revenue', 'summary', NULL, NULL, 1),
  ('home', 'activeFunnel', 1, 50, 0, 'Active Funnel', 'details', NULL, NULL, 1),
  ('home', 'purchaseEventsDetails', 1, 60, 0, 'Purchase Events Details', 'details', NULL, NULL, 1),
  ('home', 'admobStatus', 1, 70, 0, 'Admob Status', 'details', NULL, NULL, 1),
  ('home', 'referralSource', 1, 80, 0, 'Referral Source', 'details', NULL, NULL, 1),
  ('home', 'adExpenses', 1, 90, 0, 'Ad Expenses', 'details', NULL, NULL, 1),
  ('home', 'revenueFlow', 1, 100, 0, 'Revenue Flow', 'details', NULL, NULL, 1),
  ('home', 'purchaseEventsLog', 1, 110, 0, 'Purchase Events Log', 'details', NULL, NULL, 1)
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `section_key` = VALUES(`section_key`),
  `sort_order` = VALUES(`sort_order`),
  `valid` = VALUES(`valid`);
