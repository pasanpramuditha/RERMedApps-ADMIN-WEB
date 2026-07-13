CREATE TABLE IF NOT EXISTS `fnd_finance_fixed_deposits_tab` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bank_entity` VARCHAR(160) NOT NULL,
  `capital_asset` VARCHAR(64) NOT NULL,
  `apy_percent` DECIMAL(8,3) NOT NULL DEFAULT 0.000,
  `maturity_date` DATE NOT NULL,
  `status` ENUM('Active','Pending') NOT NULL DEFAULT 'Active',
  `valid` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fnd_finance_fixed_deposits_valid_maturity` (`valid`, `maturity_date`),
  KEY `idx_fnd_finance_fixed_deposits_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fnd_finance_payouts_tab` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payee_name` VARCHAR(160) NOT NULL,
  `remarks` TEXT NULL,
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency` ENUM('USD','LKR') NOT NULL DEFAULT 'LKR',
  `payout_date` DATE NOT NULL,
  `payment_slip_url` TEXT NULL,
  `transaction_type` ENUM('Bank Transfer','Cash') NOT NULL DEFAULT 'Bank Transfer',
  `valid` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fnd_finance_payouts_valid_date` (`valid`, `payout_date`),
  KEY `idx_fnd_finance_payouts_payee` (`payee_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fnd_finance_expenses_tab` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(120) NOT NULL,
  `sub_category` VARCHAR(120) NULL,
  `description` TEXT NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency` ENUM('USD','LKR') NOT NULL DEFAULT 'USD',
  `expense_date` DATE NOT NULL,
  `recurrence` ENUM('One-Time','Monthly','Annually') NOT NULL DEFAULT 'One-Time',
  `attachment_url` TEXT NULL,
  `converted_amount` DECIMAL(14,2) NULL,
  `is_generated` TINYINT(1) NOT NULL DEFAULT 0,
  `parent_id` BIGINT UNSIGNED NULL,
  `valid` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fnd_finance_expenses_valid_date` (`valid`, `expense_date`),
  KEY `idx_fnd_finance_expenses_category` (`category`),
  KEY `idx_fnd_finance_expenses_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
