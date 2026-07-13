ALTER TABLE fnd_tax_ledger_tab
  ADD COLUMN parsed_invoice_no VARCHAR(120) DEFAULT NULL,
  ADD COLUMN parsed_invoice_date DATE DEFAULT NULL,
  ADD COLUMN parsed_vendor VARCHAR(190) DEFAULT NULL,
  ADD COLUMN parsed_tax_amount DECIMAL(14,2) DEFAULT NULL,
  ADD COLUMN parsed_invoice_amount DECIMAL(14,2) DEFAULT NULL,
  ADD COLUMN parsed_currency VARCHAR(20) DEFAULT NULL,
  ADD COLUMN parsed_payment_details TEXT DEFAULT NULL;
