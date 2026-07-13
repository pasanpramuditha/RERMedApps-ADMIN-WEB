ALTER TABLE fnd_apple_sales_daily_reports
  ADD COLUMN total_sales_usd DECIMAL(18, 6) NOT NULL DEFAULT 0.000000 AFTER item_count,
  ADD KEY idx_apple_sales_daily_sales (total_sales_usd);
