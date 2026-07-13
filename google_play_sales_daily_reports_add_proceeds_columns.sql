ALTER TABLE fnd_google_play_sales_daily_reports
  ADD COLUMN total_google_fee DECIMAL(18,6) NOT NULL DEFAULT 0.000000 AFTER total_revenue,
  ADD COLUMN total_proceeds DECIMAL(18,6) NOT NULL DEFAULT 0.000000 AFTER total_google_fee,
  ADD KEY idx_google_play_sales_daily_proceeds (total_proceeds);
