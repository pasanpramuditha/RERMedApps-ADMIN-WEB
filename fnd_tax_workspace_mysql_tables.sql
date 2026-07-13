CREATE TABLE IF NOT EXISTS fnd_tax_categories_tab (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('Income','Expense') NOT NULL,
  name VARCHAR(160) NOT NULL,
  rule_keywords TEXT DEFAULT NULL,
  valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY fnd_tax_categories_u1 (type, name)
);

CREATE TABLE IF NOT EXISTS fnd_tax_subcategories_tab (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  rule_keywords TEXT DEFAULT NULL,
  valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY fnd_tax_subcategories_u1 (category_id, name),
  CONSTRAINT fnd_tax_subcategories_fk1 FOREIGN KEY (category_id)
    REFERENCES fnd_tax_categories_tab(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fnd_tax_ledger_tab (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tax_year VARCHAR(20) NOT NULL,
  transaction_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(160) NOT NULL,
  subcategory VARCHAR(160) DEFAULT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency ENUM('LKR','USD') NOT NULL DEFAULT 'LKR',
  entry_type ENUM('Income','Expense') NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'Manual',
  status ENUM('Ready','Review','Pending') NOT NULL DEFAULT 'Ready',
  notes TEXT DEFAULT NULL,
  attachment_url TEXT DEFAULT NULL,
  attachment_name VARCHAR(255) DEFAULT NULL,
  gmail_message_id VARCHAR(190) DEFAULT NULL,
  gmail_attachment_id VARCHAR(190) DEFAULT NULL,
  gmail_part_id VARCHAR(80) DEFAULT NULL,
  parsed_invoice_no VARCHAR(120) DEFAULT NULL,
  parsed_invoice_date DATE DEFAULT NULL,
  parsed_vendor VARCHAR(190) DEFAULT NULL,
  parsed_tax_amount DECIMAL(14,2) DEFAULT NULL,
  parsed_invoice_amount DECIMAL(14,2) DEFAULT NULL,
  parsed_currency VARCHAR(20) DEFAULT NULL,
  parsed_payment_details TEXT DEFAULT NULL,
  valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX fnd_tax_ledger_i1 (tax_year, valid, transaction_date),
  INDEX fnd_tax_ledger_i2 (entry_type, category)
);

CREATE TABLE IF NOT EXISTS fnd_tax_email_queue_tab (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_message_id INT DEFAULT NULL,
  received_at DATETIME NOT NULL,
  sender_email VARCHAR(190) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_preview TEXT DEFAULT NULL,
  suggested_type ENUM('Income','Expense') NOT NULL,
  suggested_category VARCHAR(160) NOT NULL,
  suggested_subcategory VARCHAR(160) DEFAULT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency ENUM('LKR','USD') NOT NULL DEFAULT 'LKR',
  registry_destination VARCHAR(160) DEFAULT NULL,
  status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  ledger_id INT DEFAULT NULL,
  gmail_message_id VARCHAR(190) DEFAULT NULL,
  gmail_thread_id VARCHAR(190) DEFAULT NULL,
  gmail_attachment_id VARCHAR(190) DEFAULT NULL,
  gmail_part_id VARCHAR(80) DEFAULT NULL,
  gmail_label VARCHAR(120) DEFAULT NULL,
  attachment_name VARCHAR(255) DEFAULT NULL,
  attachment_mime VARCHAR(120) DEFAULT NULL,
  attachment_url TEXT DEFAULT NULL,
  attachment_count INT NOT NULL DEFAULT 0,
  parsed_invoice_no VARCHAR(120) DEFAULT NULL,
  parsed_invoice_date DATE DEFAULT NULL,
  parsed_vendor VARCHAR(190) DEFAULT NULL,
  parsed_tax_amount DECIMAL(14,2) DEFAULT NULL,
  parse_confidence DECIMAL(5,2) DEFAULT NULL,
  valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX fnd_tax_email_queue_i1 (status, valid, received_at),
  INDEX fnd_tax_email_queue_i2 (email_message_id, valid),
  UNIQUE KEY fnd_tax_email_queue_u1 (gmail_message_id, gmail_part_id, gmail_attachment_id, attachment_name)
);

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

INSERT IGNORE INTO fnd_tax_categories_tab (type, name) VALUES
('Income', 'Tax Filing Fees'),
('Income', 'Consulting Services'),
('Expense', 'SaaS & Licenses'),
('Expense', 'Office Operations');
