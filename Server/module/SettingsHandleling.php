<?php

/**
 * Admin global settings API handlers.
 *
 * This file owns all reads/writes for the admin settings screen. Settings are
 * saved in `fnd_admin_global_settings_tab`; no file-based storage is used.
 */

function handle_get_global_settings($main_mysqli) {
    send_json([
        'success' => true,
        'settings' => GetGlobalSettings($main_mysqli)
    ]);
}

function handle_get_public_settings($main_mysqli) {
    $settings = GetGlobalSettings($main_mysqli);
    send_json([
        'success' => true,
        'settings' => [
            'company_logo_url' => $settings['company_logo_url'] ?? '',
            'initial_screen' => $settings['initial_screen'] ?? '/dashboard',
        ],
    ]);
}

function handle_save_global_settings($main_mysqli) {
    $settings = [
        'service_account_json' => $_POST['service_account_json'] ?? '',
        'google_services_json' => $_POST['google_services_json'] ?? '',
        'dashboard_cards_json' => $_POST['dashboard_cards_json'] ?? '',
        'navigation_visibility_json' => $_POST['navigation_visibility_json'] ?? '',
        'exchange_rates_json' => $_POST['exchange_rates_json'] ?? '',
        'company_logo_url' => $_POST['company_logo_url'] ?? '',
        'initial_screen' => $_POST['initial_screen'] ?? '/dashboard',
        'demo_mode_info_cards' => bool_post_value('demo_mode_info_cards'),
        'demo_mode_app_charts' => bool_post_value('demo_mode_app_charts'),
        'demo_mode_financial_summary' => bool_post_value('demo_mode_financial_summary'),
        'debug_info_visibility' => bool_post_value('debug_info_visibility'),
        'php_auth_token' => $_POST['php_auth_token'] ?? '',
        'in_app_ad_upload_path' => $_POST['in_app_ad_upload_path'] ?? '',
        'in_app_ad_upload_url' => $_POST['in_app_ad_upload_url'] ?? '',
        'finance_upload_path' => $_POST['finance_upload_path'] ?? '',
        'finance_upload_url' => $_POST['finance_upload_url'] ?? '',
        'app_store_connect_api_key_id' => $_POST['app_store_connect_api_key_id'] ?? '',
        'app_store_connect_api_issuer_id' => $_POST['app_store_connect_api_issuer_id'] ?? '',
        'app_store_connect_api_private_key' => $_POST['app_store_connect_api_private_key'] ?? '',
        'app_store_connect_vendor_number' => $_POST['app_store_connect_vendor_number'] ?? '',
        'admob_client_id' => $_POST['admob_client_id'] ?? '',
        'admob_client_secret' => $_POST['admob_client_secret'] ?? '',
        'admob_refresh_token' => $_POST['admob_refresh_token'] ?? '',
        'admob_publisher_id' => $_POST['admob_publisher_id'] ?? '',
        'google_ads_client_id' => $_POST['google_ads_client_id'] ?? '',
        'google_ads_client_secret' => $_POST['google_ads_client_secret'] ?? '',
        'google_ads_refresh_token' => $_POST['google_ads_refresh_token'] ?? '',
        'google_ads_developer_token' => $_POST['google_ads_developer_token'] ?? '',
        'google_ads_customer_id' => $_POST['google_ads_customer_id'] ?? '',
        'google_ads_login_customer_id' => $_POST['google_ads_login_customer_id'] ?? '',
        'google_ads_api_version' => $_POST['google_ads_api_version'] ?? 'v24',
        'tax_gmail_client_id' => $_POST['tax_gmail_client_id'] ?? '',
        'tax_gmail_client_secret' => $_POST['tax_gmail_client_secret'] ?? '',
        'tax_gmail_refresh_token' => $_POST['tax_gmail_refresh_token'] ?? '',
        'tax_gmail_mailbox' => $_POST['tax_gmail_mailbox'] ?? 'rermedapps.tax@gmail.com',
        'tax_gmail_income_label' => $_POST['tax_gmail_income_label'] ?? 'Income',
        'tax_gmail_expense_label' => $_POST['tax_gmail_expense_label'] ?? 'Expenses',
        'tax_imap_host' => $_POST['tax_imap_host'] ?? 'mail.rermedapps.com',
        'tax_imap_port' => $_POST['tax_imap_port'] ?? '993',
        'tax_imap_encryption' => $_POST['tax_imap_encryption'] ?? 'ssl',
        'tax_imap_mailbox' => $_POST['tax_imap_mailbox'] ?? 'INBOX',
        'tax_imap_username' => $_POST['tax_imap_username'] ?? 'tax@rermedapps.com',
        'tax_imap_password' => $_POST['tax_imap_password'] ?? '',
        'tax_veryfi_enabled' => bool_post_value('tax_veryfi_enabled'),
        'tax_veryfi_client_id' => $_POST['tax_veryfi_client_id'] ?? '',
        'tax_veryfi_username' => $_POST['tax_veryfi_username'] ?? '',
        'tax_veryfi_api_key' => $_POST['tax_veryfi_api_key'] ?? '',
        'tax_veryfi_client_secret' => $_POST['tax_veryfi_client_secret'] ?? '',
        'tax_veryfi_environment_url' => $_POST['tax_veryfi_environment_url'] ?? 'https://api.veryfi.com',
        'tax_ocr_space_enabled' => bool_post_value('tax_ocr_space_enabled'),
        'tax_ocr_space_api_key' => $_POST['tax_ocr_space_api_key'] ?? '',
        'tax_ocr_space_endpoint' => $_POST['tax_ocr_space_endpoint'] ?? 'https://api.ocr.space/parse/image',
        'tax_ocr_space_language' => $_POST['tax_ocr_space_language'] ?? 'eng',
        'tax_ocr_space_engine' => $_POST['tax_ocr_space_engine'] ?? '2',
        'tax_evidence_save_enabled' => bool_post_value('tax_evidence_save_enabled'),
        'tax_evidence_storage_provider' => 'uploadcare',
        'tax_uploadcare_public_key' => $_POST['tax_uploadcare_public_key'] ?? '',
        'tax_uploadcare_secret_key' => $_POST['tax_uploadcare_secret_key'] ?? '',
        'tax_uploadcare_store' => $_POST['tax_uploadcare_store'] ?? '1',
        'tax_drive_save_enabled' => bool_post_value('tax_drive_save_enabled'),
        'tax_drive_folder_id' => $_POST['tax_drive_folder_id'] ?? '',
    ];

    $result = SaveGlobalSettings($main_mysqli, $settings);
    if (!$result['success']) {
        send_json([
            'success' => false,
            'error_msg' => $result['error_msg'] ?? 'Failed to save global settings'
        ], 500);
    }

    send_json([
        'success' => true,
        'settings' => GetGlobalSettings($main_mysqli)
    ]);
}

/**
 * Convert HTML form values to tinyint-compatible booleans.
 */
function bool_post_value($name) {
    $value = $_POST[$name] ?? '';
    return !empty($value) && $value !== 'false' && $value !== '0' ? 1 : 0;
}

/**
 * Settings returned when the table is empty or a row has not been created yet.
 */
function default_global_settings() {
    return [
        'service_account_json' => '',
        'google_services_json' => '',
        'dashboard_cards_json' => '',
        'navigation_visibility_json' => '',
        'exchange_rates_json' => '',
        'company_logo_url' => '',
        'initial_screen' => '/dashboard',
        'demo_mode_info_cards' => 0,
        'demo_mode_app_charts' => 0,
        'demo_mode_financial_summary' => 0,
        'debug_info_visibility' => 0,
        'php_auth_token' => '',
        'in_app_ad_upload_path' => '',
        'in_app_ad_upload_url' => '',
        'finance_upload_path' => '',
        'finance_upload_url' => '',
        'app_store_connect_api_key_id' => '',
        'app_store_connect_api_issuer_id' => '',
        'app_store_connect_api_private_key' => '',
        'app_store_connect_vendor_number' => '',
        'admob_client_id' => '',
        'admob_client_secret' => '',
        'admob_refresh_token' => '',
        'admob_publisher_id' => '',
        'google_ads_client_id' => '',
        'google_ads_client_secret' => '',
        'google_ads_refresh_token' => '',
        'google_ads_developer_token' => '',
        'google_ads_customer_id' => '',
        'google_ads_login_customer_id' => '',
        'google_ads_api_version' => 'v24',
        'tax_gmail_client_id' => '',
        'tax_gmail_client_secret' => '',
        'tax_gmail_refresh_token' => '',
        'tax_gmail_mailbox' => 'rermedapps.tax@gmail.com',
        'tax_gmail_income_label' => 'Income',
        'tax_gmail_expense_label' => 'Expenses',
        'tax_imap_host' => 'mail.rermedapps.com',
        'tax_imap_port' => '993',
        'tax_imap_encryption' => 'ssl',
        'tax_imap_mailbox' => 'INBOX',
        'tax_imap_username' => 'tax@rermedapps.com',
        'tax_imap_password' => '',
        'tax_veryfi_enabled' => 0,
        'tax_veryfi_client_id' => '',
        'tax_veryfi_username' => '',
        'tax_veryfi_api_key' => '',
        'tax_veryfi_client_secret' => '',
        'tax_veryfi_environment_url' => 'https://api.veryfi.com',
        'tax_ocr_space_enabled' => 0,
        'tax_ocr_space_api_key' => '',
        'tax_ocr_space_endpoint' => 'https://api.ocr.space/parse/image',
        'tax_ocr_space_language' => 'eng',
        'tax_ocr_space_engine' => '2',
        'tax_evidence_save_enabled' => 1,
        'tax_evidence_storage_provider' => 'uploadcare',
        'tax_uploadcare_public_key' => '',
        'tax_uploadcare_secret_key' => '',
        'tax_uploadcare_store' => '1',
        'tax_drive_save_enabled' => 0,
        'tax_drive_folder_id' => '',
    ];
}

/**
 * Load the admin settings from fnd_admin_global_settings_tab.
 */
function GetGlobalSettings($mysqli) {
    $defaults = default_global_settings();
    $stmt = $mysqli->prepare(
        'SELECT app_param, int_value, string_value, value_type
         FROM fnd_admin_global_settings_tab
         WHERE valid = 1'
    );

    if (!$stmt) {
        return $defaults;
    }

    if (!$stmt->execute()) {
        $stmt->close();
        return $defaults;
    }

    $result = get_result($stmt);
    $stmt->close();

    if (empty($result)) {
        return $defaults;
    }

    foreach ($result as $row) {
        $param = $row['app_param'] ?? '';
        if (!array_key_exists($param, $defaults)) {
            continue;
        }

        $type = $row['value_type'] ?? 'string';
        if ($type === 'bool' || $type === 'int') {
            $defaults[$param] = (int)($row['int_value'] ?? 0);
            continue;
        }

        $defaults[$param] = (string)($row['string_value'] ?? '');
    }

    // Home page layout settings are stored in the page config table, then
    // merged into the dashboard JSON expected by the existing React UI.
    $defaults['dashboard_cards_json'] = MergePageConfigIntoDashboardJson(
        $mysqli,
        (string)($defaults['dashboard_cards_json'] ?? '')
    );

    return $defaults;
}

/**
 * Save all settings to fnd_admin_global_settings_tab with upsert queries.
 */
function SaveGlobalSettings($mysqli, $settings) {
    $stringSettings = [
        'service_account_json' => ['secret', 1],
        'google_services_json' => ['json', 0],
        'dashboard_cards_json' => ['json', 0],
        'navigation_visibility_json' => ['json', 0],
        'exchange_rates_json' => ['json', 0],
        'company_logo_url' => ['string', 0],
        'initial_screen' => ['string', 0],
        'php_auth_token' => ['secret', 1],
        'in_app_ad_upload_path' => ['string', 0],
        'in_app_ad_upload_url' => ['string', 0],
        'finance_upload_path' => ['string', 0],
        'finance_upload_url' => ['string', 0],
        'app_store_connect_api_key_id' => ['secret', 1],
        'app_store_connect_api_issuer_id' => ['secret', 1],
        'app_store_connect_api_private_key' => ['secret', 1],
        'app_store_connect_vendor_number' => ['string', 0],
        'admob_client_id' => ['secret', 1],
        'admob_client_secret' => ['secret', 1],
        'admob_refresh_token' => ['secret', 1],
        'admob_publisher_id' => ['string', 0],
        'google_ads_client_id' => ['secret', 1],
        'google_ads_client_secret' => ['secret', 1],
        'google_ads_refresh_token' => ['secret', 1],
        'google_ads_developer_token' => ['secret', 1],
        'google_ads_customer_id' => ['string', 0],
        'google_ads_login_customer_id' => ['string', 0],
        'google_ads_api_version' => ['string', 0],
        'tax_gmail_client_id' => ['secret', 1],
        'tax_gmail_client_secret' => ['secret', 1],
        'tax_gmail_refresh_token' => ['secret', 1],
        'tax_gmail_mailbox' => ['string', 0],
        'tax_gmail_income_label' => ['string', 0],
        'tax_gmail_expense_label' => ['string', 0],
        'tax_imap_host' => ['string', 0],
        'tax_imap_port' => ['string', 0],
        'tax_imap_encryption' => ['string', 0],
        'tax_imap_mailbox' => ['string', 0],
        'tax_imap_username' => ['string', 0],
        'tax_imap_password' => ['secret', 1],
        'tax_veryfi_client_id' => ['secret', 1],
        'tax_veryfi_username' => ['string', 0],
        'tax_veryfi_api_key' => ['secret', 1],
        'tax_veryfi_client_secret' => ['secret', 1],
        'tax_veryfi_environment_url' => ['string', 0],
        'tax_ocr_space_api_key' => ['secret', 1],
        'tax_ocr_space_endpoint' => ['string', 0],
        'tax_ocr_space_language' => ['string', 0],
        'tax_ocr_space_engine' => ['string', 0],
        'tax_evidence_storage_provider' => ['string', 0],
        'tax_uploadcare_public_key' => ['secret', 1],
        'tax_uploadcare_secret_key' => ['secret', 1],
        'tax_uploadcare_store' => ['string', 0],
        'tax_drive_folder_id' => ['string', 0],
    ];

    foreach ($stringSettings as $param => $meta) {
        $result = UpsertAdminGlobalSetting(
            $mysqli,
            $param,
            null,
            (string)($settings[$param] ?? ''),
            $meta[0],
            $meta[1]
        );

        if (!$result['success']) {
            return $result;
        }
    }

    $boolSettings = [
        'demo_mode_info_cards',
        'demo_mode_app_charts',
        'demo_mode_financial_summary',
        'debug_info_visibility',
        'tax_veryfi_enabled',
        'tax_ocr_space_enabled',
        'tax_evidence_save_enabled',
        'tax_drive_save_enabled',
    ];

    foreach ($boolSettings as $param) {
        $result = UpsertAdminGlobalSetting(
            $mysqli,
            $param,
            (int)($settings[$param] ?? 0),
            null,
            'bool',
            0
        );

        if (!$result['success']) {
            return $result;
        }
    }

    $pageResult = SavePageConfigFromDashboardJson($mysqli, (string)($settings['dashboard_cards_json'] ?? ''));
    if (!$pageResult['success']) {
        return $pageResult;
    }

    return ['success' => true];
}

/**
 * Insert or update one setting row by app_param.
 */
function UpsertAdminGlobalSetting($mysqli, $app_param, $int_value, $string_value, $value_type, $is_secret) {
    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_admin_global_settings_tab (app_param, int_value, string_value, value_type, is_secret, valid)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
            int_value = VALUES(int_value),
            string_value = VALUES(string_value),
            value_type = VALUES(value_type),
            is_secret = VALUES(is_secret),
            valid = 1,
            updated_at = CURRENT_TIMESTAMP'
    );

    if (!$stmt) {
        return ['success' => false, 'error_msg' => $mysqli->error];
    }

    $stmt->bind_param('sissi', $app_param, $int_value, $string_value, $value_type, $is_secret);

    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();

    return $ok ? ['success' => true] : ['success' => false, 'error_msg' => $error];
}

/**
 * Read page-level dashboard settings and merge them into dashboard_cards_json.
 */
function MergePageConfigIntoDashboardJson($mysqli, $dashboard_json) {
    $config = json_decode($dashboard_json, true);
    if (!is_array($config)) {
        $config = [];
    }

    $stmt = $mysqli->prepare(
        'SELECT card_id, visibility, refresh_interval_seconds
         FROM fnd_admin_page_config_tab
         WHERE page_key = ? AND valid = 1
         ORDER BY sort_order ASC, id ASC'
    );

    if (!$stmt) {
        return $dashboard_json;
    }

    $page_key = 'home';
    $stmt->bind_param('s', $page_key);
    if (!$stmt->execute()) {
        $stmt->close();
        return $dashboard_json;
    }

    $rows = get_result($stmt);
    $stmt->close();

    $visibility = [];
    foreach ($rows as $row) {
        $card_id = (string)($row['card_id'] ?? '');
        if ($card_id === '') {
            continue;
        }

        if ($card_id === '__page__') {
            $config['home_refresh_interval_seconds'] = (int)($row['refresh_interval_seconds'] ?? 0);
            continue;
        }

        $visibility[$card_id] = (int)($row['visibility'] ?? 1) === 1;
    }

    if (!empty($visibility)) {
        $config['home_visibility'] = $visibility;
    }

    return json_encode($config);
}

/**
 * Persist page-specific settings that are embedded in dashboard_cards_json.
 */
function SavePageConfigFromDashboardJson($mysqli, $dashboard_json) {
    $config = json_decode($dashboard_json, true);
    if (!is_array($config)) {
        return ['success' => true];
    }

    $refresh_interval_seconds = (int)($config['home_refresh_interval_seconds'] ?? 0);
    $pageResult = UpsertAdminPageConfig($mysqli, 'home', '__page__', 1, 0, $refresh_interval_seconds, 'Home Page');
    if (!$pageResult['success']) {
        return $pageResult;
    }

    $visibility = $config['home_visibility'] ?? null;
    if (!is_array($visibility)) {
        return ['success' => true];
    }

    $sort_order = 10;
    foreach ($visibility as $card_id => $visible) {
        $result = UpsertAdminPageConfig(
            $mysqli,
            'home',
            (string)$card_id,
            $visible ? 1 : 0,
            $sort_order,
            0,
            (string)$card_id
        );

        if (!$result['success']) {
            return $result;
        }

        $sort_order += 10;
    }

    return ['success' => true];
}

/**
 * Insert or update one page config card row.
 */
function UpsertAdminPageConfig($mysqli, $page_key, $card_id, $visibility, $sort_order, $refresh_interval_seconds, $display_name) {
    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_admin_page_config_tab
            (page_key, card_id, visibility, sort_order, refresh_interval_seconds, display_name, valid)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
            visibility = VALUES(visibility),
            sort_order = VALUES(sort_order),
            refresh_interval_seconds = VALUES(refresh_interval_seconds),
            display_name = VALUES(display_name),
            valid = 1,
            updated_at = CURRENT_TIMESTAMP'
    );

    if (!$stmt) {
        return ['success' => false, 'error_msg' => $mysqli->error];
    }

    $stmt->bind_param('ssiiis', $page_key, $card_id, $visibility, $sort_order, $refresh_interval_seconds, $display_name);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();

    return $ok ? ['success' => true] : ['success' => false, 'error_msg' => $error];
}

?>
