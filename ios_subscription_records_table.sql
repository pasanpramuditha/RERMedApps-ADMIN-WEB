CREATE TABLE ios_subscription_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    record_type ENUM('aggregate_snapshot', 'user_state') NOT NULL,
    source ENUM('subscriber_report', 'assn') NOT NULL,

    report_date DATE NULL,
    source_column VARCHAR(150) NULL,

    app_apple_id VARCHAR(50) NOT NULL,
    app_name VARCHAR(255) NULL,
    bundle_id VARCHAR(255) NULL,

    product_id VARCHAR(255) NOT NULL,
    subscription_name VARCHAR(255) NULL,
    subscription_group_id VARCHAR(50) NULL,

    duration ENUM('monthly', 'yearly', 'unknown') NOT NULL DEFAULT 'unknown',
    status ENUM(
        'trial',
        'active',
        'billing_retry',
        'grace_period',
        'expired',
        'refunded',
        'revoked',
        'unknown'
    ) NOT NULL DEFAULT 'unknown',

    subscription_count INT UNSIGNED NOT NULL DEFAULT 1,
    country VARCHAR(10) NULL,

    original_transaction_id VARCHAR(100) NULL,
    latest_transaction_id VARCHAR(100) NULL,
    expires_at DATETIME NULL,
    auto_renew_status TINYINT(1) NULL,

    environment ENUM('Sandbox', 'Production') NOT NULL DEFAULT 'Production',
    last_notification_type VARCHAR(100) NULL,
    last_subtype VARCHAR(100) NULL,

    raw_payload JSON NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_report_bucket (
        record_type,
        report_date,
        app_apple_id,
        product_id,
        duration,
        status,
        country,
        source_column
    ),

    UNIQUE KEY uq_user_original_transaction (
        record_type,
        original_transaction_id
    ),

    KEY idx_current_user_state (
        record_type,
        status,
        duration,
        expires_at
    ),

    KEY idx_report_date (
        record_type,
        report_date
    ),

    KEY idx_app_date (
        app_apple_id,
        report_date
    ),

    KEY idx_product_id (
        product_id
    )
);
