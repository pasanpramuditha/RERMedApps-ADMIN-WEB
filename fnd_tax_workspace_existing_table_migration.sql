ALTER TABLE fnd_tax_categories_tab
  ADD COLUMN rule_keywords TEXT DEFAULT NULL;

ALTER TABLE fnd_tax_subcategories_tab
  ADD COLUMN rule_keywords TEXT DEFAULT NULL;

ALTER TABLE fnd_tax_ledger_tab
  ADD COLUMN attachment_name VARCHAR(255) DEFAULT NULL,
  ADD COLUMN gmail_message_id VARCHAR(190) DEFAULT NULL,
  ADD COLUMN gmail_attachment_id VARCHAR(190) DEFAULT NULL,
  ADD COLUMN gmail_part_id VARCHAR(80) DEFAULT NULL,
  ADD COLUMN parsed_invoice_no VARCHAR(120) DEFAULT NULL,
  ADD COLUMN parsed_invoice_date DATE DEFAULT NULL,
  ADD COLUMN parsed_vendor VARCHAR(190) DEFAULT NULL,
  ADD COLUMN parsed_tax_amount DECIMAL(14,2) DEFAULT NULL,
  ADD COLUMN parsed_invoice_amount DECIMAL(14,2) DEFAULT NULL,
  ADD COLUMN parsed_currency VARCHAR(20) DEFAULT NULL,
  ADD COLUMN parsed_payment_details TEXT DEFAULT NULL;

ALTER TABLE fnd_tax_email_queue_tab
  ADD COLUMN email_message_id INT DEFAULT NULL,
  ADD COLUMN gmail_message_id VARCHAR(190) DEFAULT NULL,
  ADD COLUMN gmail_thread_id VARCHAR(190) DEFAULT NULL,
  ADD COLUMN gmail_attachment_id VARCHAR(190) DEFAULT NULL,
  ADD COLUMN gmail_part_id VARCHAR(80) DEFAULT NULL,
  ADD COLUMN gmail_label VARCHAR(120) DEFAULT NULL,
  ADD COLUMN attachment_name VARCHAR(255) DEFAULT NULL,
  ADD COLUMN attachment_mime VARCHAR(120) DEFAULT NULL,
  ADD COLUMN attachment_url TEXT DEFAULT NULL,
  ADD COLUMN attachment_count INT NOT NULL DEFAULT 0,
  ADD COLUMN parsed_invoice_no VARCHAR(120) DEFAULT NULL,
  ADD COLUMN parsed_invoice_date DATE DEFAULT NULL,
  ADD COLUMN parsed_vendor VARCHAR(190) DEFAULT NULL,
  ADD COLUMN parsed_tax_amount DECIMAL(14,2) DEFAULT NULL,
  ADD COLUMN parse_confidence DECIMAL(5,2) DEFAULT NULL;

ALTER TABLE fnd_tax_email_queue_tab
  DROP KEY fnd_tax_email_queue_u1,
  ADD INDEX fnd_tax_email_queue_i2 (email_message_id, valid),
  ADD UNIQUE KEY fnd_tax_email_queue_u1 (gmail_message_id, gmail_part_id, gmail_attachment_id, attachment_name);

CREATE TABLE IF NOT EXISTS fnd_tax_email_messages_tab (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gmail_message_id VARCHAR(190) NOT NULL,
  gmail_thread_id VARCHAR(190) DEFAULT NULL,
  gmail_label VARCHAR(120) DEFAULT NULL,
  received_at DATETIME NOT NULL,
  sender_email VARCHAR(190) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_preview TEXT DEFAULT NULL,
  suggested_type ENUM('Income','Expense') NOT NULL,
  attachment_count INT NOT NULL DEFAULT 0,
  parsed_child_count INT NOT NULL DEFAULT 0,
  read_status ENUM('Unread','Read','Processed') NOT NULL DEFAULT 'Unread',
  valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY fnd_tax_email_messages_u1 (gmail_message_id),
  INDEX fnd_tax_email_messages_i1 (valid, received_at)
);
