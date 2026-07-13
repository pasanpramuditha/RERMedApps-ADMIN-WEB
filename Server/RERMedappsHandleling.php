<?php

require_once __DIR__ . '/include.php';
require './vendor/autoload.php';

configure_headers();
handle_preflight_request();
normalize_request_params();
require_tag_param();
$tag = $_POST['tag'];
require_backend_authorized($tag);

if (is_settings_request_tag($tag)) {
    require_once __DIR__ . '/module/SettingsHandleling.php';
}
require_once __DIR__ . '/module/HomePageHandleling.php';
require_once __DIR__ . '/module/CommonLinksHandleling.php';
require_once __DIR__ . '/module/ActivityLogHandleling.php';
install_settings_handler_fallbacks();

resolve_app_id_request_params($main_mysqli);

require_once __DIR__ . '/module/ReportOverviewHandleling.php';
require_once __DIR__ . '/module/PushNotifications.php';

if ($tag === 'SERVER_UP') {
    handle_server_up($main_mysqli);
}

if ($tag === 'GET_APPS') {
    handle_get_apps($main_mysqli);
}

if ($tag === 'GET_GLOBAL_SETTINGS') {
    require_handler_function('handle_get_global_settings', 'module/SettingsHandleling.php');
    handle_get_global_settings($main_mysqli);
}

if ($tag === 'GET_PUBLIC_SETTINGS') {
    require_handler_function('handle_get_public_settings', 'module/SettingsHandleling.php');
    handle_get_public_settings($main_mysqli);
}

if ($tag === 'SAVE_GLOBAL_SETTINGS') {
    require_handler_function('handle_save_global_settings', 'module/SettingsHandleling.php');
    handle_save_global_settings($main_mysqli);
}

if ($tag === 'GET_HOME_PAGE_CONFIG') {
    handle_get_home_page_config($main_mysqli);
}

if ($tag === 'SAVE_HOME_PAGE_CONFIG') {
    handle_save_home_page_config($main_mysqli);
}

if ($tag === 'GET_APP_BY_ID') {
    handle_get_app_by_id($main_mysqli);
}

if ($tag === 'SAVE_APP') {
    handle_save_app($main_mysqli);
}

if ($tag === 'DELETE_APP') {
    handle_delete_app($main_mysqli);
}

if ($tag === 'UPDATE_APP_STATUS') {
    handle_update_app_status($main_mysqli);
}

if ($tag === 'GET_COMMON_LINKS') {
    handle_get_common_links($main_mysqli);
}

if ($tag === 'SAVE_COMMON_LINK') {
    handle_save_common_link($main_mysqli);
}

if ($tag === 'DELETE_COMMON_LINK') {
    handle_delete_common_link($main_mysqli);
}

if ($tag === 'SAVE_ACTIVITY_LOG') {
    handle_save_activity_log($main_mysqli);
}

if ($tag === 'GET_ACTIVITY_LOGS') {
    handle_get_activity_logs($main_mysqli);
}

if ($tag === 'GET_APP_REPLY_KNOWLEDGE') {
    handle_get_app_reply_knowledge($main_mysqli);
}

if (!isset($_POST['db'])) {
    send_json([
        'success' => false,
        'error_msg' => 'Required parameters are missing!'
    ], 401);
}

$mysqli = connect_requested_database($main_mysqli, $_POST['db']);
$email = get_request_email();

if ($tag === 'GET_INFO') {
    handle_get_info($main_mysqli, $email);
}

if ($tag === 'UPDATE_TOKEN') {
    handle_update_token($mysqli, $email);
}

if ($tag === 'SYNC_TAX_IMAP_EMAILS' || $tag === 'SYNC_TAX_GMAIL_EMAILS') {
    handle_fallback_sync_tax_imap_emails($main_mysqli);
}

if ($tag === 'APPROVE_TAX_EMAIL_GROUP') {
    handle_fallback_approve_tax_email_group($main_mysqli);
}

if ($tag === 'EXTRACT_TAX_EMAIL_INVOICE') {
    handle_fallback_extract_tax_email_invoice($main_mysqli);
}

if ($tag === 'SEND_FINANCE_INVOICE') {
    handle_fallback_send_finance_invoice($main_mysqli);
}

load_feature_modules();

send_json([
    'success' => false,
    'error_msg' => 'Unknown request tag'
], 404);

function configure_headers()
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed_origins = array_filter(array_map('trim', explode(',', getenv('PHP_ALLOWED_ORIGINS') ?: 'https://admin.rermedapps.com,http://localhost:9002,http://localhost:9003,http://localhost:9010')));

    if ($origin !== '' && in_array($origin, $allowed_origins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
}

function handle_preflight_request()
{
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
}

function normalize_request_params()
{
    if (!isset($_POST['db']) && isset($_POST['db_id'])) {
        $_POST['db'] = $_POST['db_id'];
    }

    if (!isset($_POST['db_array']) && isset($_POST['db_id_array'])) {
        $_POST['db_array'] = $_POST['db_id_array'];
    }
}

function resolve_app_id_request_params($main_mysqli)
{
    if (($_POST['tag'] ?? '') === 'SAVE_APP') {
        return;
    }

    if (!isset($_POST['app_id']) && !isset($_POST['app_id_array'])) {
        return;
    }

    if (isset($_POST['app_id']) && trim((string) $_POST['app_id']) !== '') {
        $app = root_get_app_row_for_request($main_mysqli, (int) $_POST['app_id']);
        if (!$app) {
            send_json([
                'success' => false,
                'error_msg' => 'Invalid, inactive, or unavailable app id.'
            ], 400);
        }

        $_POST['app'] = $app;
        $_POST['app_name'] = (string) ($app['name'] ?? '');
        $_POST['app_os'] = (string) ($app['os'] ?? '');

        if (!isset($_POST['db']) || trim((string) $_POST['db']) === '') {
            $_POST['db'] = (string) ($app['db_name'] ?? '');
        }

        if (!isset($_POST['db_name']) || trim((string) $_POST['db_name']) === '') {
            $_POST['db_name'] = (string) ($app['db_name'] ?? '');
        }

        if (!isset($_POST['package_name']) || trim((string) $_POST['package_name']) === '') {
            $_POST['package_name'] = (string) ($app['package_name'] ?? '');
        }
    }

    if (isset($_POST['app_id_array']) && trim((string) $_POST['app_id_array']) !== '') {
        $ids = json_decode((string) $_POST['app_id_array'], true);
        if (!is_array($ids)) {
            send_json([
                'success' => false,
                'error_msg' => 'Invalid app_id_array payload.'
            ], 400);
        }

        $apps = root_get_app_rows_for_request($main_mysqli, $ids);
        $db_names = array_values(array_filter(array_map(function ($app) {
            return trim((string) ($app['db_name'] ?? ''));
        }, $apps)));

        $_POST['apps'] = $apps;
        $_POST['db_array'] = json_encode($db_names);

        if (!isset($_POST['db']) || trim((string) $_POST['db']) === '') {
            $_POST['db'] = 'MAIN';
        }
    }
}

function require_tag_param()
{
    if (!isset($_POST['tag']) || trim((string) $_POST['tag']) === '') {
        send_json([
            'success' => false,
            'error_msg' => 'Required parameters are missing!'
        ], 401);
    }
}

function require_handler_function($function_name, $module_path)
{
    if (function_exists($function_name)) {
        return;
    }

    send_json([
        'success' => false,
        'error_msg' => 'Server module handler is missing: ' . $function_name . '. Re-upload ' . $module_path . ' and clear PHP OPcache if enabled.',
    ], 500);
}

function install_settings_handler_fallbacks()
{
    if (!function_exists('GetGlobalSettings')) {
        function GetGlobalSettings($mysqli)
        {
            $defaults = rermed_fallback_default_global_settings();
            $stmt = $mysqli->prepare(
                'SELECT app_param, int_value, string_value, value_type
                 FROM fnd_admin_global_settings_tab
                 WHERE valid = 1'
            );
            if (!$stmt || !$stmt->execute()) {
                if ($stmt) {
                    $stmt->close();
                }
                return $defaults;
            }

            $rows = get_result($stmt);
            $stmt->close();
            foreach ($rows as $row) {
                $param = (string) ($row['app_param'] ?? '');
                if (!array_key_exists($param, $defaults)) {
                    continue;
                }
                $type = (string) ($row['value_type'] ?? 'string');
                $defaults[$param] = ($type === 'bool' || $type === 'int')
                    ? (int) ($row['int_value'] ?? 0)
                    : (string) ($row['string_value'] ?? '');
            }

            return $defaults;
        }
    }

    if (!function_exists('SaveGlobalSettings')) {
        function SaveGlobalSettings($mysqli, $settings)
        {
            $string_settings = [
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

            foreach ($string_settings as $param => $meta) {
                $result = rermed_fallback_upsert_admin_global_setting(
                    $mysqli,
                    $param,
                    null,
                    (string) ($settings[$param] ?? ''),
                    $meta[0],
                    $meta[1]
                );
                if (!$result['success']) {
                    return $result;
                }
            }

            foreach (['demo_mode_info_cards', 'demo_mode_app_charts', 'demo_mode_financial_summary', 'debug_info_visibility', 'tax_veryfi_enabled', 'tax_ocr_space_enabled', 'tax_evidence_save_enabled', 'tax_drive_save_enabled'] as $param) {
                $result = rermed_fallback_upsert_admin_global_setting(
                    $mysqli,
                    $param,
                    (int) ($settings[$param] ?? 0),
                    null,
                    'bool',
                    0
                );
                if (!$result['success']) {
                    return $result;
                }
            }

            return ['success' => true];
        }
    }

    if (!function_exists('handle_get_global_settings')) {
        function handle_get_global_settings($main_mysqli)
        {
            send_json(['success' => true, 'settings' => GetGlobalSettings($main_mysqli)]);
        }
    }

    if (!function_exists('handle_get_public_settings')) {
        function handle_get_public_settings($main_mysqli)
        {
            $settings = GetGlobalSettings($main_mysqli);
            send_json([
                'success' => true,
                'settings' => [
                    'company_logo_url' => $settings['company_logo_url'] ?? '',
                    'initial_screen' => $settings['initial_screen'] ?? '/dashboard',
                ],
            ]);
        }
    }

    if (!function_exists('handle_save_global_settings')) {
        function handle_save_global_settings($main_mysqli)
        {
            $settings = rermed_fallback_settings_from_post();
            $result = SaveGlobalSettings($main_mysqli, $settings);
            if (!$result['success']) {
                send_json(['success' => false, 'error_msg' => $result['error_msg'] ?? 'Failed to save global settings'], 500);
            }
            send_json(['success' => true, 'settings' => GetGlobalSettings($main_mysqli)]);
        }
    }
}

function rermed_fallback_default_global_settings()
{
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

function rermed_fallback_settings_from_post()
{
    $defaults = rermed_fallback_default_global_settings();
    $settings = [];
    foreach ($defaults as $key => $value) {
        $settings[$key] = $_POST[$key] ?? $value;
    }
    foreach (['demo_mode_info_cards', 'demo_mode_app_charts', 'demo_mode_financial_summary', 'debug_info_visibility', 'tax_veryfi_enabled', 'tax_ocr_space_enabled', 'tax_evidence_save_enabled', 'tax_drive_save_enabled'] as $key) {
        $value = $_POST[$key] ?? '';
        $settings[$key] = (!empty($value) && $value !== 'false' && $value !== '0') ? 1 : 0;
    }
    return $settings;
}

function rermed_fallback_upsert_admin_global_setting($mysqli, $app_param, $int_value, $string_value, $value_type, $is_secret)
{
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

function handle_fallback_sync_tax_imap_emails($mysqli)
{
    if (!function_exists('imap_open')) {
        send_json(['success' => false, 'error_msg' => 'PHP IMAP extension is not enabled on this server.'], 500);
    }

    $settings = GetGlobalSettings($mysqli);
    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $mailbox = trim((string) ($settings['tax_imap_mailbox'] ?? getenv('TAX_IMAP_MAILBOX') ?: 'INBOX'));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    $limit = max(1, min(500, (int) ($_POST['limit'] ?? 100)));

    if ($host === '' || $mailbox === '' || $username === '' || $password === '') {
        send_json(['success' => false, 'error_msg' => 'Tax IMAP host, mailbox, username, and password are required in Settings.'], 400);
    }

    rermed_fallback_ensure_tax_tables($mysqli);
    rermed_fallback_seed_tax_categories($mysqli);
    $reset = rermed_fallback_reset_tax_email_sync_cache($mysqli);
    $queued = 0;
    $skipped = 0;
    $found = 0;
    $errors = [];
    $searched = [];
    foreach ([['Expense', 'Expense'], ['Income', 'Income']] as $folder_config) {
        [$folder, $type] = $folder_config;
        $resolved_folder = rermed_fallback_resolve_imap_mailbox($host, $port, $encryption, $username, $password, $folder);
        $mailbox_path = rermed_fallback_imap_mailbox_path($host, $port, $encryption, $resolved_folder);
        $searched[] = $mailbox_path . ' ALL';
        $inbox = @imap_open($mailbox_path, $username, $password);
        if (!$inbox) {
            $errors[] = $folder . ': IMAP connection failed: ' . (imap_last_error() ?: 'unknown error');
            continue;
        }

        $uidvalidity = rermed_fallback_imap_uidvalidity($inbox, $mailbox_path);
        $emails = rermed_fallback_imap_message_numbers($inbox);
        if (count($emails) > 0) {
            foreach (array_slice($emails, 0, $limit) as $message_no) {
                $uid = imap_uid($inbox, (int) $message_no);
                if ($uid <= 0) {
                    $skipped++;
                    continue;
                }
                $message_id = 'imap:' . $resolved_folder . ':' . $uidvalidity . ':' . $uid;
                if (rermed_fallback_tax_message_processed($mysqli, $message_id)) {
                    $skipped++;
                    continue;
                }
                $found++;

                $rows = rermed_fallback_parse_imap_tax_message($mysqli, $inbox, (int) $message_no, $message_id, $resolved_folder, $type);
                foreach ($rows as $row) {
                    $result = rermed_fallback_insert_tax_email_queue($mysqli, $row);
                    if ($result === 'inserted') {
                        $queued++;
                    } elseif ($result === 'duplicate') {
                        $skipped++;
                    } else {
                        $errors[] = 'Failed to queue IMAP message ' . $message_id;
                    }
                }
            }
        }
        imap_close($inbox);
    }
    rermed_fallback_refresh_tax_child_counts($mysqli);

    send_json([
        'success' => true,
        'inserted' => $queued,
        'skipped' => $skipped,
        'found' => $found,
        'reset' => $reset,
        'searched' => $searched,
        'errors' => $errors,
        'email_queue' => rermed_fallback_get_tax_email_rows($mysqli),
    ]);
}

function rermed_fallback_reset_tax_email_sync_cache($mysqli)
{
    $queue_count = 0;
    $message_count = 0;
    $mode = 'delete';
    $errors = [];

    $count = $mysqli->query('SELECT COUNT(*) AS total FROM fnd_tax_email_queue_tab');
    if ($count) {
        $row = $count->fetch_assoc();
        $queue_count = (int) ($row['total'] ?? 0);
        $count->free();
    }
    $count = $mysqli->query('SELECT COUNT(*) AS total FROM fnd_tax_email_messages_tab');
    if ($count) {
        $row = $count->fetch_assoc();
        $message_count = (int) ($row['total'] ?? 0);
        $count->free();
    }

    if (!$mysqli->query('DELETE FROM fnd_tax_email_queue_tab')) {
        $mode = 'stale-update';
        $errors[] = 'queue delete failed: ' . $mysqli->error;
        $mysqli->query(
            'UPDATE fnd_tax_email_queue_tab
             SET valid = 0,
                 status = "Rejected",
                 gmail_message_id = CONCAT(LEFT(COALESCE(gmail_message_id, ""), 120), ":stale:", id),
                 gmail_attachment_id = CONCAT(LEFT(COALESCE(gmail_attachment_id, ""), 120), ":stale:", id),
                 gmail_part_id = CONCAT(LEFT(COALESCE(gmail_part_id, ""), 40), ":stale:", id),
                 updated_at = CURRENT_TIMESTAMP'
        );
    }

    if (!$mysqli->query('DELETE FROM fnd_tax_email_messages_tab')) {
        $mode = 'stale-update';
        $errors[] = 'message delete failed: ' . $mysqli->error;
        $mysqli->query(
            'UPDATE fnd_tax_email_messages_tab
             SET valid = 0,
                 read_status = "Processed",
                 gmail_message_id = CONCAT(LEFT(COALESCE(gmail_message_id, ""), 120), ":stale:", id),
                 updated_at = CURRENT_TIMESTAMP'
        );
    }

    return [
        'mode' => $mode,
        'queueCleared' => $queue_count,
        'messagesCleared' => $message_count,
        'errors' => $errors,
    ];
}

function rermed_fallback_resolve_imap_mailbox($host, $port, $encryption, $username, $password, $target_mailbox)
{
    $target_mailbox = trim((string) $target_mailbox);
    if ($target_mailbox === '') {
        return 'INBOX';
    }

    $server = rermed_fallback_imap_server_prefix($host, $port, $encryption);
    $probe = @imap_open($server . 'INBOX', $username, $password);
    if (!$probe) {
        return $target_mailbox;
    }

    $mailboxes = @imap_list($probe, $server, '*');
    imap_close($probe);
    if (!is_array($mailboxes)) {
        return $target_mailbox;
    }

    $normalized_target = strtolower(trim($target_mailbox, " \t\n\r\0\x0B./"));
    foreach ($mailboxes as $mailbox_path) {
        $name = preg_replace('/^\{[^}]+\}/', '', (string) $mailbox_path);
        $normalized_name = strtolower(trim($name, " \t\n\r\0\x0B./"));
        $leaf = strtolower(trim((string) preg_replace('/^.*[\/.]/', '', $name), " \t\n\r\0\x0B./"));
        if ($normalized_name === $normalized_target || $leaf === $normalized_target) {
            return $name;
        }
    }

    return $target_mailbox;
}

function rermed_fallback_imap_message_numbers($inbox)
{
    $emails = imap_search($inbox, 'ALL');
    if (is_array($emails) && count($emails) > 0) {
        rsort($emails);
        return array_values(array_map('intval', $emails));
    }

    $count = imap_num_msg($inbox);
    if ($count <= 0) {
        return [];
    }

    return range($count, 1);
}

function rermed_fallback_imap_uidvalidity($inbox, $mailbox_path)
{
    $status = @imap_status($inbox, $mailbox_path, SA_UIDVALIDITY);
    $value = (int) ($status->uidvalidity ?? 0);
    return $value > 0 ? $value : 0;
}

function rermed_fallback_imap_server_prefix($host, $port, $encryption)
{
    $flags = '/imap';
    if ($encryption === 'ssl') {
        $flags .= '/ssl';
    } elseif ($encryption === 'tls') {
        $flags .= '/tls';
    } else {
        $flags .= '/notls';
    }
    return '{' . $host . ':' . max(1, (int) $port) . $flags . '}';
}

function rermed_fallback_imap_mailbox_path($host, $port, $encryption, $mailbox)
{
    return rermed_fallback_imap_server_prefix($host, $port, $encryption) . ($mailbox ?: 'INBOX');
}

function rermed_fallback_decode_header($value)
{
    $decoded = '';
    foreach (imap_mime_header_decode((string) $value) as $part) {
        $charset = strtoupper((string) ($part->charset ?? 'UTF-8'));
        $text = (string) ($part->text ?? '');
        if ($charset !== 'DEFAULT' && $charset !== 'UTF-8' && function_exists('mb_convert_encoding')) {
            $text = mb_convert_encoding($text, 'UTF-8', $charset);
        }
        $decoded .= $text;
    }
    return trim($decoded) ?: trim((string) $value);
}

function rermed_fallback_parse_imap_tax_message($mysqli, $inbox, $message_no, $message_id, $mailbox, $forced_type = '')
{
    $overview_list = imap_fetch_overview($inbox, (string) $message_no, 0);
    $overview = is_array($overview_list) && isset($overview_list[0]) ? $overview_list[0] : null;
    $structure = imap_fetchstructure($inbox, $message_no);
    if (!$overview || !$structure) {
        return [];
    }

    $subject = substr(rermed_fallback_decode_header((string) ($overview->subject ?? '(No subject)')), 0, 255);
    $from = substr(rermed_fallback_decode_header((string) ($overview->from ?? 'unknown')), 0, 190);
    $received_at = isset($overview->udate) ? date('Y-m-d H:i:s', (int) $overview->udate) : date('Y-m-d H:i:s');
    $body = trim(rermed_fallback_imap_body_text($inbox, $message_no, $structure));
    $attachments = rermed_fallback_imap_attachments($structure);
    $attachment_names = implode("\n", array_map(function ($item) { return (string) ($item['filename'] ?? ''); }, $attachments));
    $text = trim($subject . "\n" . $body . "\n" . $attachment_names);
    $type = in_array($forced_type, ['Income', 'Expense'], true)
        ? $forced_type
        : (preg_match('/\b(income|payment received|payout|earnings|revenue|admob|play console|apple)\b/i', $text) ? 'Income' : 'Expense');
    $amount = rermed_fallback_tax_extract_amount($text);
    $currency = preg_match('/USD|\$/i', $text) ? 'USD' : 'LKR';
    $category = 'Unknown';
    $message_row_id = rermed_fallback_upsert_tax_email_message($mysqli, [
        'gmail_message_id' => $message_id,
        'gmail_thread_id' => $message_id,
        'gmail_label' => 'IMAP/' . $mailbox,
        'received_at' => $received_at,
        'sender_email' => $from,
        'subject' => $subject,
        'body_preview' => substr($body, 0, 1000),
        'suggested_type' => $type,
        'attachment_count' => count($attachments),
    ]);

    $base = [
        'email_message_id' => $message_row_id,
        'gmail_message_id' => $message_id,
        'gmail_thread_id' => $message_id,
        'gmail_label' => 'IMAP/' . $mailbox,
        'received_at' => $received_at,
        'sender_email' => $from,
        'subject' => $subject,
        'body_preview' => substr($body, 0, 1000),
        'suggested_type' => $type,
        'suggested_category' => $category,
        'suggested_subcategory' => '',
        'amount' => $amount,
        'currency' => $currency,
        'registry_destination' => '',
        'attachment_count' => count($attachments),
        'parsed_invoice_no' => rermed_fallback_tax_invoice_no($text),
        'parsed_invoice_date' => '',
        'parsed_vendor' => $from,
        'parsed_tax_amount' => null,
        'parse_confidence' => $amount > 0 ? 0.55 : 0.2,
    ];

    if (count($attachments) === 0) {
        return [array_merge($base, [
            'gmail_attachment_id' => 'message',
            'gmail_part_id' => 'message',
            'attachment_name' => '',
            'attachment_mime' => '',
        ])];
    }

    $rows = [];
    foreach ($attachments as $attachment) {
        $rows[] = array_merge($base, [
            'gmail_attachment_id' => 'imap-part:' . (string) ($attachment['part_id'] ?? ''),
            'gmail_part_id' => substr((string) ($attachment['part_id'] ?? ''), 0, 80),
            'attachment_name' => substr((string) ($attachment['filename'] ?? ''), 0, 255),
            'attachment_mime' => substr((string) ($attachment['mime'] ?? ''), 0, 120),
            'attachment_count' => 1,
        ]);
    }
    return $rows;
}

function rermed_fallback_imap_body_text($inbox, $message_no, $structure)
{
    $parts = rermed_fallback_imap_text_parts($structure, '', 'plain');
    if (count($parts) === 0) {
        $parts = rermed_fallback_imap_text_parts($structure, '', 'html');
    }
    $body = '';
    foreach ($parts as $part) {
        $chunk = imap_fetchbody($inbox, $message_no, $part['part_id']);
        $body .= "\n" . rermed_fallback_imap_decode_body($chunk, (int) $part['encoding']);
    }
    if (trim($body) === '') {
        $body = rermed_fallback_imap_decode_body(imap_body($inbox, $message_no), (int) ($structure->encoding ?? 0));
    }
    return trim(html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function rermed_fallback_imap_text_parts($part, $prefix = '', $subtype = 'plain')
{
    $items = [];
    $part_no = $prefix === '' ? '1' : $prefix;
    if ((int) ($part->type ?? -1) === 0 && strtolower((string) ($part->subtype ?? '')) === strtolower($subtype)) {
        $items[] = ['part_id' => $part_no, 'encoding' => (int) ($part->encoding ?? 0)];
    }
    if (isset($part->parts) && is_array($part->parts)) {
        foreach ($part->parts as $index => $child) {
            $child_no = $prefix === '' ? (string) ($index + 1) : $prefix . '.' . ($index + 1);
            $items = array_merge($items, rermed_fallback_imap_text_parts($child, $child_no, $subtype));
        }
    }
    return $items;
}

function rermed_fallback_imap_decode_body($body, $encoding)
{
    $body = (string) $body;
    if ($encoding === 3) {
        $decoded = function_exists('imap_base64') ? imap_base64($body) : false;
        if ($decoded !== false && $decoded !== '') {
            return (string) $decoded;
        }
        $compact = preg_replace('/\s+/', '', $body);
        $decoded = base64_decode((string) $compact, false);
        return $decoded !== false ? (string) $decoded : '';
    }
    if ($encoding === 4) {
        return quoted_printable_decode($body);
    }
    return $body;
}

function rermed_fallback_imap_attachments($part, $prefix = '')
{
    $items = [];
    $part_no = $prefix === '' ? '1' : $prefix;
    $filename = rermed_fallback_imap_filename($part);
    $mime = rermed_fallback_imap_mime($part);
    if ($filename !== '') {
        $items[] = ['part_id' => $part_no, 'filename' => $filename, 'mime' => $mime];
    }
    if (isset($part->parts) && is_array($part->parts)) {
        foreach ($part->parts as $index => $child) {
            $child_no = $prefix === '' ? (string) ($index + 1) : $prefix . '.' . ($index + 1);
            $items = array_merge($items, rermed_fallback_imap_attachments($child, $child_no));
        }
    }
    return $items;
}

function rermed_fallback_imap_filename($part)
{
    foreach (['dparameters', 'parameters'] as $property) {
        if (!isset($part->{$property}) || !is_array($part->{$property})) {
            continue;
        }
        foreach ($part->{$property} as $param) {
            $attribute = strtolower((string) ($param->attribute ?? ''));
            if (($attribute === 'filename' || $attribute === 'name') && trim((string) ($param->value ?? '')) !== '') {
                return substr(rermed_fallback_decode_header((string) $param->value), 0, 255);
            }
        }
    }
    return '';
}

function rermed_fallback_imap_mime($part)
{
    $primary = [0 => 'text', 1 => 'multipart', 2 => 'message', 3 => 'application', 4 => 'audio', 5 => 'image', 6 => 'video', 7 => 'other'];
    return ($primary[(int) ($part->type ?? 7)] ?? 'application') . '/' . strtolower((string) ($part->subtype ?? 'octet-stream'));
}

function rermed_fallback_upsert_tax_email_message($mysqli, $row)
{
    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_tax_email_messages_tab
          (gmail_message_id, gmail_thread_id, gmail_label, received_at, sender_email, subject, body_preview, suggested_type, attachment_count, parsed_child_count, read_status, valid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, "Unread", 1)
         ON DUPLICATE KEY UPDATE gmail_thread_id = VALUES(gmail_thread_id), gmail_label = VALUES(gmail_label), received_at = VALUES(received_at), sender_email = VALUES(sender_email), subject = VALUES(subject), body_preview = VALUES(body_preview), suggested_type = VALUES(suggested_type), attachment_count = VALUES(attachment_count), valid = 1, updated_at = CURRENT_TIMESTAMP'
    );
    if (!$stmt) {
        return 0;
    }
    $stmt->bind_param('ssssssssi', $row['gmail_message_id'], $row['gmail_thread_id'], $row['gmail_label'], $row['received_at'], $row['sender_email'], $row['subject'], $row['body_preview'], $row['suggested_type'], $row['attachment_count']);
    $stmt->execute();
    $stmt->close();

    $lookup = $mysqli->prepare('SELECT id FROM fnd_tax_email_messages_tab WHERE gmail_message_id = ? LIMIT 1');
    if (!$lookup) {
        return 0;
    }
    $lookup->bind_param('s', $row['gmail_message_id']);
    $lookup->execute();
    $rows = get_result($lookup);
    $lookup->close();
    return (int) ($rows[0]['id'] ?? 0);
}

function rermed_fallback_insert_tax_email_queue($mysqli, $row)
{
    $exists = $mysqli->prepare(
        'SELECT id FROM fnd_tax_email_queue_tab
         WHERE gmail_message_id = ? AND gmail_part_id = ? AND gmail_attachment_id = ? AND attachment_name = ? AND valid = 1
         LIMIT 1'
    );
    if ($exists) {
        $exists->bind_param('ssss', $row['gmail_message_id'], $row['gmail_part_id'], $row['gmail_attachment_id'], $row['attachment_name']);
        $exists->execute();
        $found = get_result($exists);
        $exists->close();
        if (count($found) > 0) {
            return 'duplicate';
        }
    }

    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_tax_email_queue_tab
          (email_message_id, received_at, sender_email, subject, body_preview, suggested_type, suggested_category, suggested_subcategory, amount, currency, registry_destination, status, valid, gmail_message_id, gmail_thread_id, gmail_attachment_id, gmail_part_id, gmail_label, attachment_name, attachment_mime, attachment_count, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, parse_confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "Pending", 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        return 'error';
    }
    $parsed_invoice_date = '';
    $parsed_tax_amount = null;
    $stmt->bind_param(
        'isssssssdsssssssssisssdd',
        $row['email_message_id'],
        $row['received_at'],
        $row['sender_email'],
        $row['subject'],
        $row['body_preview'],
        $row['suggested_type'],
        $row['suggested_category'],
        $row['suggested_subcategory'],
        $row['amount'],
        $row['currency'],
        $row['registry_destination'],
        $row['gmail_message_id'],
        $row['gmail_thread_id'],
        $row['gmail_attachment_id'],
        $row['gmail_part_id'],
        $row['gmail_label'],
        $row['attachment_name'],
        $row['attachment_mime'],
        $row['attachment_count'],
        $row['parsed_invoice_no'],
        $parsed_invoice_date,
        $row['parsed_vendor'],
        $parsed_tax_amount,
        $row['parse_confidence']
    );
    $ok = $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();
    if (!$ok) {
        return 'error';
    }
    return $affected > 0 ? 'inserted' : 'duplicate';
}

function rermed_fallback_get_tax_email_rows($mysqli)
{
    rermed_fallback_ensure_tax_tables($mysqli);
    $stmt = $mysqli->prepare(
        'SELECT id, email_message_id, received_at, sender_email, subject, body_preview, suggested_type, suggested_category, suggested_subcategory, amount, currency, registry_destination, status, ledger_id, gmail_message_id, gmail_attachment_id, gmail_part_id, gmail_label, attachment_name, attachment_mime, attachment_count, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, parsed_invoice_amount, parsed_currency, parsed_payment_details, parse_confidence
         FROM fnd_tax_email_queue_tab
         WHERE valid = 1 AND status IN ("Pending", "Approved") AND sender_email <> "tax.client@example.com"
         ORDER BY received_at DESC, id DESC'
    );
    if (!$stmt || !$stmt->execute()) {
        return [];
    }
    $rows = get_result($stmt);
    $stmt->close();
    return array_map(function ($row) {
        return [
            'id' => (string) $row['id'],
            'receivedAt' => (string) $row['received_at'],
            'senderEmail' => (string) $row['sender_email'],
            'subject' => (string) $row['subject'],
            'bodyPreview' => (string) ($row['body_preview'] ?? ''),
            'suggestedType' => (string) $row['suggested_type'],
            'suggestedCategory' => (string) $row['suggested_category'],
            'suggestedSubcategory' => (string) ($row['suggested_subcategory'] ?? ''),
            'amount' => (float) $row['amount'],
            'currency' => (string) $row['currency'],
            'registryDestination' => (string) ($row['registry_destination'] ?? ''),
            'status' => (string) $row['status'],
            'ledgerId' => isset($row['ledger_id']) ? (string) $row['ledger_id'] : '',
            'gmailMessageId' => (string) ($row['gmail_message_id'] ?? ''),
            'gmailAttachmentId' => (string) ($row['gmail_attachment_id'] ?? ''),
            'gmailPartId' => (string) ($row['gmail_part_id'] ?? ''),
            'gmailLabel' => (string) ($row['gmail_label'] ?? ''),
            'attachmentName' => (string) ($row['attachment_name'] ?? ''),
            'attachmentMime' => (string) ($row['attachment_mime'] ?? ''),
            'attachmentCount' => (int) ($row['attachment_count'] ?? 0),
            'parsedInvoiceNo' => (string) ($row['parsed_invoice_no'] ?? ''),
            'parsedInvoiceDate' => (string) ($row['parsed_invoice_date'] ?? ''),
            'parsedVendor' => (string) ($row['parsed_vendor'] ?? ''),
            'parsedTaxAmount' => isset($row['parsed_tax_amount']) ? (float) $row['parsed_tax_amount'] : null,
            'parsedInvoiceAmount' => isset($row['parsed_invoice_amount']) ? (float) $row['parsed_invoice_amount'] : ((float) ($row['amount'] ?? 0) > 0 ? (float) $row['amount'] : null),
            'parsedCurrency' => (string) ($row['parsed_currency'] ?? ($row['currency'] ?? '')),
            'parsedPaymentDetails' => (string) ($row['parsed_payment_details'] ?? ''),
            'parseConfidence' => isset($row['parse_confidence']) ? (float) $row['parse_confidence'] : null,
        ];
    }, $rows);
}

function rermed_fallback_tax_message_processed($mysqli, $message_id)
{
    $stmt = $mysqli->prepare('SELECT id FROM fnd_tax_email_messages_tab WHERE gmail_message_id = ? AND read_status = "Processed" AND valid = 1 LIMIT 1');
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param('s', $message_id);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    return count($rows) > 0;
}

function rermed_fallback_refresh_tax_child_counts($mysqli)
{
    $mysqli->query(
        'UPDATE fnd_tax_email_messages_tab m
         SET parsed_child_count = (
           SELECT COUNT(*) FROM fnd_tax_email_queue_tab q WHERE q.email_message_id = m.id AND q.valid = 1
         ), updated_at = CURRENT_TIMESTAMP
         WHERE m.valid = 1'
    );
}

function rermed_fallback_tax_extract_amount($text)
{
    $text = html_entity_decode(strip_tags((string) $text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $patterns = [
        '/(?:amount\s+paid|paid\s+amount|total\s+paid|grand\s+total|invoice\s+total|receipt\s+total|total\s+amount|amount\s+due|balance\s+due|subtotal)\s*[:\-\s]*(?:LKR|Rs\.?|USD|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i',
        '/(?<![A-Z0-9-])(?:LKR|Rs\.?|USD|\$)\s+([0-9][0-9,]*(?:\.\d{1,2})?)/i',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match_all($pattern, $text, $matches) && !empty($matches[1])) {
            $values = array_values(array_filter(array_map(function ($value) { return (float) str_replace(',', '', $value); }, $matches[1])));
            if (count($values) > 0) {
                return max($values);
            }
        }
    }
    return 0.0;
}

function rermed_fallback_tax_invoice_no($text)
{
    if (preg_match('/(IR-[A-Z]{3}\d{8})(?=\d{1,2}\.\d{1,2}\.\d{4})/i', (string) $text, $match)) {
        return strtoupper($match[1]);
    }
    if (preg_match('/(IR-[A-Z]{3}\d{5,})(?=\d{1,2}\.\d{1,2}\.\d{4}|\b|[^0-9])/i', (string) $text, $match)) {
        return strtoupper($match[1]);
    }
    if (preg_match('/\b(?:invoice|inv|receipt)\s*(?:number|no\.?|#|id)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9-]{3,})\b/i', (string) $text, $match)) {
        return strtoupper($match[1]);
    }
    return '';
}

function rermed_fallback_tax_match_category($mysqli, $type, $text, $fallback)
{
    $haystack = strtolower((string) $text);
    $stmt = $mysqli->prepare(
        'SELECT name, rule_keywords FROM fnd_tax_categories_tab
         WHERE valid = 1 AND type = ? AND rule_keywords IS NOT NULL AND rule_keywords <> ""
         ORDER BY id ASC'
    );
    if (!$stmt) {
        return $fallback;
    }
    $stmt->bind_param('s', $type);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    foreach ($rows as $row) {
        foreach (preg_split('/[,\\n]+/', (string) ($row['rule_keywords'] ?? '')) as $keyword) {
            $keyword = strtolower(trim($keyword));
            if ($keyword !== '' && strpos($haystack, $keyword) !== false) {
                return (string) $row['name'];
            }
        }
    }
    return $fallback;
}

function rermed_fallback_ensure_tax_tables($mysqli)
{
    return;
}

function rermed_fallback_ensure_column($mysqli, $table, $column, $alter_sql)
{
    return;
}

function rermed_fallback_seed_tax_categories($mysqli)
{
    rermed_fallback_ensure_tax_tables($mysqli);
    $defaults = [
        ['Income', 'Unknown', ''],
        ['Expense', 'Unknown', ''],
        ['Income', 'Tax Filing Fees', 'tax filing,client payment,filing fee'],
        ['Expense', 'Office Operations', 'office,subscription,software,hosting,receipt,invoice,bill'],
    ];
    $stmt = $mysqli->prepare('INSERT INTO fnd_tax_categories_tab (type, name, rule_keywords, valid) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE valid = 1');
    if (!$stmt) {
        return;
    }
    foreach ($defaults as $row) {
        $stmt->bind_param('sss', $row[0], $row[1], $row[2]);
        $stmt->execute();
    }
    $stmt->close();
}

function handle_fallback_approve_tax_email_group($mysqli)
{
    rermed_fallback_ensure_tax_tables($mysqli);
    $tax_year = trim((string) ($_POST['tax_year'] ?? '2025/2026'));
    $message_id = trim((string) ($_POST['gmail_message_id'] ?? ''));
    $rows_json = (string) ($_POST['rows'] ?? '[]');
    $payload_rows = json_decode($rows_json, true);
    if (!is_array($payload_rows)) {
        $payload_rows = [];
    }
    if ($message_id === '' || count($payload_rows) === 0) {
        send_json(['success' => false, 'error_msg' => 'Email group and child approvals are required'], 400);
    }

    $errors = [];
    $uploaded_urls = [];
    $statuses = [];
    $ledger_ids = [];
    $approved_type = 'Expense';
    $first_mail = null;

    foreach ($payload_rows as $payload_row) {
        if (!is_array($payload_row)) {
            continue;
        }
        $mail = rermed_fallback_payload_tax_mail($payload_row);
        $approved_type = $mail['suggested_type'] === 'Income' ? 'Income' : 'Expense';
        if ($first_mail === null) {
            $first_mail = $mail;
        }
        $result = rermed_fallback_insert_tax_ledger_row($mysqli, $tax_year, $mail);
        $ledger_ids[] = (int) ($result['ledger_id'] ?? 0);
        if (!empty($result['error'])) {
            $errors[] = (string) $result['error'];
        }
        if (!empty($result['url'])) {
            $uploaded_urls[] = (string) $result['url'];
        }
        if (!empty($result['status'])) {
            $statuses[] = (string) $result['status'];
        }
    }

    rermed_fallback_mark_tax_queue_approved($mysqli, $message_id, $ledger_ids);
    rermed_fallback_mark_tax_message_processed($mysqli, $first_mail ?: ['gmail_message_id' => $message_id, 'suggested_type' => $approved_type]);
    $move_result = rermed_fallback_move_approved_imap_message($mysqli, $message_id, $approved_type);
    if (!empty($move_result['error'])) {
        $errors[] = $move_result['error'];
    } elseif (!empty($move_result['status'])) {
        $statuses[] = $move_result['status'];
    }

    send_json([
        'success' => true,
        'ledger' => rermed_fallback_get_tax_ledger_rows($mysqli, $tax_year),
        'email_queue' => rermed_fallback_get_tax_email_rows($mysqli),
        'drive_errors' => array_values(array_unique($errors)),
        'drive_uploaded_count' => count($uploaded_urls),
        'drive_statuses' => array_values(array_unique($statuses)),
        'drive_urls' => $uploaded_urls,
    ]);
}

function rermed_fallback_payload_tax_mail($row)
{
    return [
        'id' => trim((string) ($row['id'] ?? '')),
        'received_at' => trim((string) ($row['receivedAt'] ?? $row['received_at'] ?? date('Y-m-d H:i:s'))),
        'sender_email' => trim((string) ($row['senderEmail'] ?? $row['sender_email'] ?? 'unknown')),
        'subject' => trim((string) ($row['subject'] ?? '')),
        'suggested_category' => trim((string) ($row['suggestedCategory'] ?? $row['suggested_category'] ?? '')),
        'suggested_subcategory' => trim((string) ($row['suggestedSubcategory'] ?? $row['suggested_subcategory'] ?? '')),
        'amount' => (float) ($row['amount'] ?? 0),
        'currency' => strtoupper(trim((string) ($row['currency'] ?? 'LKR'))),
        'suggested_type' => trim((string) ($row['suggestedType'] ?? $row['suggested_type'] ?? 'Expense')) === 'Income' ? 'Income' : 'Expense',
        'body_preview' => trim((string) ($row['bodyPreview'] ?? $row['body_preview'] ?? '')),
        'gmail_message_id' => trim((string) ($row['gmailMessageId'] ?? $row['gmail_message_id'] ?? '')),
        'gmail_attachment_id' => trim((string) ($row['gmailAttachmentId'] ?? $row['gmail_attachment_id'] ?? '')),
        'gmail_part_id' => trim((string) ($row['gmailPartId'] ?? $row['gmail_part_id'] ?? '')),
        'attachment_name' => trim((string) ($row['attachmentName'] ?? $row['attachment_name'] ?? '')),
        'attachment_mime' => trim((string) ($row['attachmentMime'] ?? $row['attachment_mime'] ?? '')),
        'parsed_invoice_no' => trim((string) ($row['parsedInvoiceNo'] ?? $row['parsed_invoice_no'] ?? '')),
        'parsed_invoice_date' => trim((string) ($row['parsedInvoiceDate'] ?? $row['parsed_invoice_date'] ?? '')),
        'parsed_vendor' => trim((string) ($row['parsedVendor'] ?? $row['parsed_vendor'] ?? '')),
        'parsed_tax_amount' => isset($row['parsedTaxAmount']) && $row['parsedTaxAmount'] !== null ? (float) $row['parsedTaxAmount'] : null,
        'parsed_invoice_amount' => isset($row['parsedInvoiceAmount']) && $row['parsedInvoiceAmount'] !== null ? (float) $row['parsedInvoiceAmount'] : null,
        'parsed_currency' => strtoupper(trim((string) ($row['parsedCurrency'] ?? $row['parsed_currency'] ?? ''))),
        'parsed_payment_details' => trim((string) ($row['parsedPaymentDetails'] ?? $row['parsed_payment_details'] ?? '')),
    ];
}

function handle_fallback_extract_tax_email_invoice($mysqli)
{
    rermed_fallback_ensure_tax_tables($mysqli);
    $id = (int) ($_POST['id'] ?? 0);
    $message_id = trim((string) ($_POST['gmail_message_id'] ?? ''));
    $attachment_id = trim((string) ($_POST['gmail_attachment_id'] ?? ''));

    $row = rermed_fallback_get_raw_tax_email_row($mysqli, $id, $message_id, $attachment_id);
    if (!$row) {
        send_json(['success' => false, 'error_msg' => 'Email queue item was not found.'], 404);
    }

    $text = trim((string) ($row['subject'] ?? '') . "\n" . (string) ($row['body_preview'] ?? '') . "\n" . (string) ($row['attachment_name'] ?? ''));
    $attachment_text = '';
    $attachment_bytes = '';
    $row_message_id = (string) ($row['gmail_message_id'] ?? '');
    $row_attachment_id = (string) ($row['gmail_attachment_id'] ?? '');
    $row_attachment_mime = (string) ($row['attachment_mime'] ?? '');
    $row_attachment_name = (string) ($row['attachment_name'] ?? '');

    if (strpos($row_message_id, 'imap:') === 0 && $row_attachment_id !== '' && $row_attachment_id !== 'message') {
        $file = rermed_fallback_fetch_imap_attachment_bytes($mysqli, $row_message_id, $row_attachment_id, $row_attachment_mime);
        $bytes = (string) ($file['bytes'] ?? '');
        $attachment_bytes = $bytes;
        $mime = (string) ($file['mime'] ?? $row_attachment_mime);
        $attachment_text = rermed_fallback_extract_tax_attachment_text($bytes, $mime, $row_attachment_name);
        if ($attachment_text !== '') {
            $text .= "\n" . $attachment_text;
        }
    }

    $has_document_source = $attachment_bytes !== '' || $attachment_text !== '';
    $parsed = $attachment_text !== '' ? rermed_fallback_extract_tax_values($attachment_text, $row, true) : null;
    if (!is_array($parsed)) {
        $parsed = rermed_fallback_extract_tax_values($text, $row, $attachment_text !== '');
    }
    $engine = is_array($parsed) && (float) ($parsed['amount'] ?? 0) > 0 ? 'local-pdf' : 'local';
    $veryfi_result = ['status' => 'veryfi-not-needed'];
    if ($has_document_source) {
        $veryfi_result = rermed_fallback_extract_with_veryfi($mysqli, $row, $attachment_bytes, $text);
        if (is_array($veryfi_result['parsed'] ?? null)) {
            $parsed = rermed_fallback_merge_tax_parsed($veryfi_result['parsed'], $parsed);
            $engine = 'veryfi';
        }
    }
    $ocr_result = ['status' => 'ocr-space-not-needed'];
    if (is_array($parsed) && rermed_fallback_is_suspicious_tax_amount($parsed, $row)) {
        $local_attachment = $attachment_text !== '' ? rermed_fallback_extract_tax_values($attachment_text, $row, true) : null;
        if (is_array($local_attachment) && (float) ($local_attachment['amount'] ?? 0) > 0) {
            $parsed = $local_attachment;
            $engine = 'local-pdf';
        }
    }
    if (!is_array($parsed) || (float) ($parsed['amount'] ?? 0) <= 0 || rermed_fallback_is_suspicious_tax_amount($parsed, $row)) {
        $ocr_result = rermed_fallback_extract_with_ocr_space($mysqli, $row, $attachment_bytes, $row_attachment_mime);
        $ocr_text = trim((string) ($ocr_result['text'] ?? ''));
        if ($ocr_text !== '') {
            $text .= "\n" . $ocr_text;
            $ocr_parsed = rermed_fallback_extract_tax_values($ocr_text, $row, true);
            if ((float) ($ocr_parsed['amount'] ?? 0) > 0) {
                $parsed = rermed_fallback_merge_tax_parsed($ocr_parsed, $parsed);
            }
            $engine = 'ocrspace';
        }
    }
    if (rermed_fallback_is_suspicious_tax_amount($parsed, $row)) {
        $parsed['amount'] = null;
    }
    $amount = (float) ($parsed['amount'] ?? 0);
    if ($amount <= 0 && !$has_document_source) {
        $amount = (float) ($row['amount'] ?? 0);
    }
    $currency = in_array((string) ($parsed['currency'] ?? ''), ['LKR', 'USD'], true) ? (string) $parsed['currency'] : (string) ($row['currency'] ?? 'LKR');
    $invoice_no = substr((string) ($parsed['invoiceNo'] ?? ''), 0, 120);
    $invoice_date = (string) ($parsed['invoiceDate'] ?? '');
    $invoice_date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $invoice_date) ? $invoice_date : null;
    $vendor = substr(rermed_fallback_normalize_tax_vendor((string) ($parsed['vendor'] ?? ''), $text . "\n" . (string) ($parsed['paymentDetails'] ?? '')), 0, 190);
    $tax_amount = $parsed['taxAmount'] ?? null;
    $invoice_amount = $amount > 0 ? $amount : null;
    $parsed_currency = substr($currency, 0, 20);
    $payment_details = substr((string) ($parsed['paymentDetails'] ?? ''), 0, 1500);
    $matched_category = rermed_fallback_tax_match_category($mysqli, (string) ($row['suggested_type'] ?? 'Expense'), $text . "\n" . $vendor . "\n" . $payment_details, 'Unknown');
    $confidence = (float) ($parsed['confidence'] ?? 0.2);
    $row_id = (int) $row['id'];

    $stmt = $mysqli->prepare(
        'UPDATE fnd_tax_email_queue_tab
         SET amount = ?, currency = ?, parsed_invoice_no = NULLIF(?, ""), parsed_invoice_date = ?, parsed_vendor = NULLIF(?, ""), parsed_tax_amount = ?, parsed_invoice_amount = ?, parsed_currency = NULLIF(?, ""), parsed_payment_details = ?, suggested_category = ?, parse_confidence = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND valid = 1'
    );
    if (!$stmt) {
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    }
    $stmt->bind_param('dssssddsssdi', $amount, $currency, $invoice_no, $invoice_date, $vendor, $tax_amount, $invoice_amount, $parsed_currency, $payment_details, $matched_category, $confidence, $row_id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    if (!$ok) {
        send_json(['success' => false, 'error_msg' => $error], 500);
    }

    $email_queue = rermed_fallback_get_tax_email_rows($mysqli);
    $updated_email = null;
    foreach ($email_queue as $email_row) {
        if ((string) ($email_row['id'] ?? '') === (string) $row_id) {
            $updated_email = $email_row;
            break;
        }
    }

    send_json([
        'success' => true,
        'email' => $updated_email,
        'email_queue' => $email_queue,
        'parsed' => [
            'invoiceNo' => $invoice_no,
            'invoiceDate' => $invoice_date ?: '',
            'vendor' => $vendor,
            'amount' => $invoice_amount,
            'currency' => $currency,
            'taxAmount' => $tax_amount,
            'paymentDetails' => $payment_details,
            'confidence' => $confidence,
            'engine' => $engine,
            'veryfiStatus' => (string) ($veryfi_result['status'] ?? ''),
            'ocrSpaceStatus' => (string) ($ocr_result['status'] ?? ''),
        ],
    ]);
}

function rermed_fallback_get_raw_tax_email_row($mysqli, $id, $message_id, $attachment_id)
{
    if ((int) $id > 0) {
        $stmt = $mysqli->prepare('SELECT * FROM fnd_tax_email_queue_tab WHERE id = ? AND valid = 1 LIMIT 1');
        if (!$stmt) {
            return null;
        }
        $stmt->bind_param('i', $id);
    } else {
        $stmt = $mysqli->prepare('SELECT * FROM fnd_tax_email_queue_tab WHERE gmail_message_id = ? AND gmail_attachment_id = ? AND valid = 1 LIMIT 1');
        if (!$stmt) {
            return null;
        }
        $stmt->bind_param('ss', $message_id, $attachment_id);
    }
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    return $rows[0] ?? null;
}

function rermed_fallback_extract_tax_attachment_text($bytes, $mime, $filename)
{
    $bytes = (string) $bytes;
    if ($bytes === '') {
        return '';
    }
    $mime = strtolower((string) $mime);
    $filename = strtolower((string) $filename);
    if ($mime === 'application/pdf' || substr($filename, -4) === '.pdf') {
        return rermed_fallback_extract_pdf_text($bytes);
    }
    if ($mime === 'message/rfc822' || substr($filename, -4) === '.eml') {
        return rermed_fallback_extract_eml_text($bytes);
    }
    if (strpos($mime, 'text/') === 0 || preg_match('/\.(txt|csv|html|htm|xml|json)$/i', $filename)) {
        return trim(html_entity_decode(strip_tags(quoted_printable_decode($bytes)), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
    return '';
}

function rermed_fallback_extract_pdf_text($bytes)
{
    $chunks = [(string) $bytes];
    if (preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', (string) $bytes, $matches)) {
        foreach ($matches[1] as $stream) {
            $stream = ltrim((string) $stream);
            $decoded = @gzuncompress($stream);
            if ($decoded !== false) {
                $chunks[] = (string) $decoded;
            }
            $decoded = @gzinflate($stream);
            if ($decoded !== false) {
                $chunks[] = (string) $decoded;
            }
            $chunks[] = (string) $stream;
        }
    }
    $content = implode("\n", $chunks);
    $strings = [];
    if (preg_match_all('/\((?:\\\\.|[^\\\\()])*\)/s', $content, $matches)) {
        foreach ($matches[0] as $item) {
            $strings[] = rermed_fallback_pdf_unescape(substr($item, 1, -1));
        }
    }
    $plain = preg_replace('/[^\P{C}\r\n\t]+/u', ' ', implode("\n", $strings) . "\n" . $content);
    $plain = preg_replace('/[^\x09\x0A\x0D\x20-\x7E]+/', ' ', (string) $plain);
    return trim(preg_replace('/\s+/', ' ', (string) $plain));
}

function rermed_fallback_pdf_unescape($value)
{
    $value = preg_replace_callback('/\\\\([0-7]{1,3})/', function ($match) {
        return chr(octdec($match[1]));
    }, (string) $value);
    return stripcslashes((string) $value);
}

function rermed_fallback_extract_eml_text($raw)
{
    $parts = preg_split("/\r?\n\r?\n/", (string) $raw, 2);
    $body = $parts[1] ?? (string) $raw;
    return trim(html_entity_decode(strip_tags(quoted_printable_decode($body)), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function rermed_fallback_extract_with_veryfi($mysqli, $row, $attachment_bytes, $fallback_text)
{
    $settings = GetGlobalSettings($mysqli);
    if (!function_exists('curl_init')) {
        return ['status' => 'veryfi-curl-missing'];
    }

    $client_id = trim((string) ($settings['tax_veryfi_client_id'] ?? getenv('VERYFI_CLIENT_ID') ?: ''));
    $username = trim((string) ($settings['tax_veryfi_username'] ?? getenv('VERYFI_USERNAME') ?: ''));
    $api_key = trim((string) ($settings['tax_veryfi_api_key'] ?? getenv('VERYFI_API_KEY') ?: ''));
    $client_secret = trim((string) ($settings['tax_veryfi_client_secret'] ?? getenv('VERYFI_CLIENT_SECRET') ?: ''));
    $environment_url = rtrim(trim((string) ($settings['tax_veryfi_environment_url'] ?? getenv('VERYFI_ENVIRONMENT_URL') ?: 'https://api.veryfi.com')), '/');
    if ($client_id === '' || $username === '' || $api_key === '' || $client_secret === '') {
        return ['status' => 'veryfi-credentials-missing'];
    }

    $bytes = (string) $attachment_bytes;
    if ($bytes === '') {
        $bytes = (string) $fallback_text;
    }
    if ($bytes === '') {
        return ['status' => 'veryfi-empty-document'];
    }

    $file_name = trim((string) ($row['attachment_name'] ?? ''));
    if ($file_name === '') {
        $file_name = 'tax-email-' . (string) ($row['id'] ?? 'document') . '.txt';
    }
    $payload = [
        'external_id' => 'tax-email-' . (string) ($row['id'] ?? ''),
        'file_name' => $file_name,
        'file_data' => base64_encode($bytes),
        'document_type' => 'invoice',
        'max_pages_to_process' => 15,
        'country' => 'LK',
        'auto_delete' => true,
    ];
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return ['status' => 'veryfi-json-failed'];
    }

    $timestamp = (string) (time() * 1000);
    $signature = rermed_fallback_veryfi_signature($client_secret, $payload, $timestamp);
    $ch = curl_init($environment_url . '/api/v8/partner/documents');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json',
            'CLIENT-ID: ' . $client_id,
            'AUTHORIZATION: apikey ' . $username . ':' . $api_key,
            'X-Veryfi-Request-Timestamp: ' . $timestamp,
            'X-Veryfi-Request-Signature: ' . $signature,
        ],
        CURLOPT_POSTFIELDS => $json,
    ]);
    $raw = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $curl_error !== '') {
        return ['status' => 'veryfi-request-failed: ' . $curl_error];
    }
    $response = json_decode((string) $raw, true);
    if (!is_array($response)) {
        return ['status' => 'veryfi-invalid-json'];
    }
    if ($http_code < 200 || $http_code >= 300) {
        $message = (string) ($response['message'] ?? $response['error'] ?? $response['detail'] ?? 'Veryfi request failed');
        return ['status' => 'veryfi-http-' . $http_code . ': ' . $message];
    }

    return ['status' => 'veryfi-ok', 'parsed' => rermed_fallback_map_veryfi_response($response, $row)];
}

function rermed_fallback_extract_with_ocr_space($mysqli, $row, $attachment_bytes, $mime)
{
    $settings = GetGlobalSettings($mysqli);
    $enabled = (int) ($settings['tax_ocr_space_enabled'] ?? getenv('OCR_SPACE_ENABLED') ?: 0) === 1;
    if (!$enabled) {
        return ['status' => 'ocr-space-disabled'];
    }
    if (!function_exists('curl_init')) {
        return ['status' => 'ocr-space-curl-missing'];
    }
    $bytes = (string) $attachment_bytes;
    if ($bytes === '') {
        return ['status' => 'ocr-space-empty-document'];
    }

    $api_key = trim((string) ($settings['tax_ocr_space_api_key'] ?? getenv('OCR_SPACE_API_KEY') ?: ''));
    $endpoint = trim((string) ($settings['tax_ocr_space_endpoint'] ?? getenv('OCR_SPACE_ENDPOINT') ?: 'https://api.ocr.space/parse/image'));
    $language = trim((string) ($settings['tax_ocr_space_language'] ?? getenv('OCR_SPACE_LANGUAGE') ?: 'eng'));
    $engine = trim((string) ($settings['tax_ocr_space_engine'] ?? getenv('OCR_SPACE_ENGINE') ?: '2'));
    if ($api_key === '') {
        return ['status' => 'ocr-space-api-key-missing'];
    }
    if ($endpoint === '') {
        $endpoint = 'https://api.ocr.space/parse/image';
    }
    if (!in_array($engine, ['1', '2', '3'], true)) {
        $engine = '2';
    }

    $filetype = rermed_fallback_ocr_space_filetype((string) $mime, (string) ($row['attachment_name'] ?? ''));
    if ($filetype === '') {
        return ['status' => 'ocr-space-unsupported-filetype'];
    }
    $data_uri = 'data:' . rermed_fallback_ocr_space_mime_for_filetype($filetype) . ';base64,' . base64_encode($bytes);
    $fields = [
        'base64Image' => $data_uri,
        'language' => $language ?: 'eng',
        'isOverlayRequired' => 'false',
        'detectOrientation' => 'true',
        'scale' => 'true',
        'isTable' => 'true',
        'OCREngine' => $engine,
        'filetype' => $filetype,
    ];

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'apikey: ' . $api_key,
        ],
        CURLOPT_POSTFIELDS => $fields,
    ]);
    $raw = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $curl_error !== '') {
        return ['status' => 'ocr-space-request-failed: ' . $curl_error];
    }
    $response = json_decode((string) $raw, true);
    if (!is_array($response)) {
        return ['status' => 'ocr-space-invalid-json'];
    }
    if ($http_code < 200 || $http_code >= 300) {
        return ['status' => 'ocr-space-http-' . $http_code];
    }
    if (!empty($response['IsErroredOnProcessing'])) {
        $message = $response['ErrorMessage'] ?? $response['ErrorDetails'] ?? 'OCR.space processing failed';
        if (is_array($message)) {
            $message = implode('; ', array_map('strval', $message));
        }
        return ['status' => 'ocr-space-error: ' . (string) $message];
    }
    $text = '';
    foreach (($response['ParsedResults'] ?? []) as $result) {
        if (is_array($result) && !empty($result['ParsedText'])) {
            $text .= "\n" . (string) $result['ParsedText'];
        }
    }
    $text = trim($text);
    if ($text === '') {
        return ['status' => 'ocr-space-empty-result'];
    }
    return ['status' => 'ocr-space-ok', 'text' => $text];
}

function rermed_fallback_ocr_space_filetype($mime, $filename)
{
    $mime = strtolower((string) $mime);
    $extension = strtolower(pathinfo((string) $filename, PATHINFO_EXTENSION));
    $map = [
        'application/pdf' => 'PDF',
        'image/png' => 'PNG',
        'image/jpeg' => 'JPG',
        'image/jpg' => 'JPG',
        'image/gif' => 'GIF',
        'image/tiff' => 'TIF',
        'image/bmp' => 'BMP',
    ];
    if (isset($map[$mime])) {
        return $map[$mime];
    }
    $extension_map = ['pdf' => 'PDF', 'png' => 'PNG', 'jpg' => 'JPG', 'jpeg' => 'JPG', 'gif' => 'GIF', 'tif' => 'TIF', 'tiff' => 'TIF', 'bmp' => 'BMP'];
    return $extension_map[$extension] ?? '';
}

function rermed_fallback_ocr_space_mime_for_filetype($filetype)
{
    $map = ['PDF' => 'application/pdf', 'PNG' => 'image/png', 'JPG' => 'image/jpeg', 'GIF' => 'image/gif', 'TIF' => 'image/tiff', 'BMP' => 'image/bmp'];
    return $map[strtoupper((string) $filetype)] ?? 'application/octet-stream';
}

function rermed_fallback_veryfi_signature($client_secret, $payload, $timestamp)
{
    $payload_string = 'timestamp:' . $timestamp . ',' . rermed_fallback_veryfi_serialize_payload($payload);
    return base64_encode(hash_hmac('sha256', $payload_string, (string) $client_secret, true));
}

function rermed_fallback_veryfi_serialize_payload($payload)
{
    $parts = [];
    foreach ($payload as $key => $value) {
        $parts[] = $key . ':' . rermed_fallback_veryfi_serialize_value($value);
    }
    return implode(',', $parts);
}

function rermed_fallback_veryfi_serialize_value($value)
{
    if (is_array($value)) {
        $is_list = array_keys($value) === range(0, count($value) - 1);
        if ($is_list) {
            return '[' . implode(', ', array_map('rermed_fallback_veryfi_serialize_value', $value)) . ']';
        }
        $parts = [];
        foreach ($value as $key => $nested_value) {
            $parts[] = $key . ': ' . rermed_fallback_veryfi_serialize_value($nested_value);
        }
        return '{' . implode(', ', $parts) . '}';
    }
    return json_encode($value, JSON_UNESCAPED_SLASHES);
}

function rermed_fallback_map_veryfi_response($response, $row)
{
    $document_text = rermed_fallback_collect_veryfi_text($response);
    $document_parsed = $document_text !== '' ? rermed_fallback_extract_tax_values($document_text, $row, true) : null;

    $vendor = '';
    if (isset($response['vendor']) && is_array($response['vendor'])) {
        $vendor = (string) ($response['vendor']['name'] ?? $response['vendor']['raw_name'] ?? '');
    } elseif (isset($response['vendor'])) {
        $vendor = (string) $response['vendor'];
    }
    if ($vendor === '') {
        $vendor = rermed_fallback_tax_vendor('', (string) ($row['sender_email'] ?? ''), (string) ($row['subject'] ?? ''));
    }

    $amount = rermed_fallback_first_number($response, ['total', 'amount', 'grand_total', 'invoice_total', 'subtotal']);
    $tax_amount = rermed_fallback_first_number($response, ['tax', 'total_tax', 'vat', 'tax_amount']);
    $invoice_no = (string) ($response['invoice_number'] ?? $response['invoice_no'] ?? $response['receipt_number'] ?? $response['reference_number'] ?? '');
    $date = (string) ($response['invoice_date'] ?? $response['date'] ?? $response['created_date'] ?? '');
    $date_time = strtotime($date);
    $currency = strtoupper((string) ($response['currency_code'] ?? $response['currency'] ?? $row['currency'] ?? 'LKR'));
    if (!in_array($currency, ['LKR', 'USD'], true)) {
        $currency = 'LKR';
    }

    $payment_details = [];
    foreach (['payment_display_name', 'payment_type', 'payment_status', 'reference_number', 'card_number'] as $field) {
        if (!empty($response[$field])) {
            $payment_details[] = $field . ': ' . (string) $response[$field];
        }
    }

    $mapped = [
        'invoiceNo' => $invoice_no,
        'invoiceDate' => $date_time !== false ? date('Y-m-d', $date_time) : '',
        'vendor' => $vendor,
        'amount' => $amount > 0 ? $amount : null,
        'currency' => $currency,
        'taxAmount' => $tax_amount > 0 ? $tax_amount : null,
        'paymentDetails' => implode("\n", $payment_details),
        'confidence' => 0.9,
    ];
    if (is_array($document_parsed)) {
        $mapped = rermed_fallback_merge_tax_parsed($mapped, $document_parsed);
        if (preg_match('/^IR-[A-Z]{3}\d+$/', (string) ($document_parsed['invoiceNo'] ?? '')) && trim((string) ($document_parsed['vendor'] ?? '')) !== '') {
            $mapped['vendor'] = $document_parsed['vendor'];
        }
    }
    return $mapped;
}

function rermed_fallback_collect_veryfi_text($response)
{
    if (!is_array($response)) {
        return '';
    }
    $parts = [];
    foreach (['ocr_text', 'text', 'raw_text', 'recognized_text', 'document_text'] as $key) {
        if (!empty($response[$key]) && is_string($response[$key])) {
            $parts[] = $response[$key];
        }
    }
    foreach (['line_items', 'items'] as $key) {
        if (!empty($response[$key]) && is_array($response[$key])) {
            foreach ($response[$key] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                foreach (['description', 'text', 'name', 'sku', 'total', 'price'] as $field) {
                    if (isset($item[$field]) && !is_array($item[$field])) {
                        $parts[] = (string) $item[$field];
                    }
                }
            }
        }
    }
    return trim(implode("\n", array_filter(array_map('trim', $parts))));
}

function rermed_fallback_first_number($row, $keys)
{
    foreach ($keys as $key) {
        if (isset($row[$key]) && is_numeric($row[$key])) {
            return (float) $row[$key];
        }
        if (isset($row[$key]) && is_string($row[$key])) {
            $number = preg_replace('/[^0-9.\-]/', '', $row[$key]);
            if ($number !== '' && is_numeric($number)) {
                return (float) $number;
            }
        }
    }
    return 0.0;
}

function rermed_fallback_merge_tax_parsed($primary, $fallback)
{
    $primary = is_array($primary) ? $primary : [];
    $fallback = is_array($fallback) ? $fallback : [];
    $merged = $primary;
    foreach (['invoiceNo', 'invoiceDate', 'vendor', 'currency', 'paymentDetails'] as $key) {
        $value = trim((string) ($merged[$key] ?? ''));
        if ($value === '' && trim((string) ($fallback[$key] ?? '')) !== '') {
            $merged[$key] = $fallback[$key];
        }
    }
    foreach (['amount', 'taxAmount'] as $key) {
        $value = isset($merged[$key]) ? (float) $merged[$key] : 0.0;
        $fallback_value = isset($fallback[$key]) ? (float) $fallback[$key] : 0.0;
        if ($value <= 0 && $fallback_value > 0) {
            $merged[$key] = $fallback_value;
        }
    }
    $primary_details = trim((string) ($primary['paymentDetails'] ?? ''));
    $fallback_details = trim((string) ($fallback['paymentDetails'] ?? ''));
    if ($primary_details !== '' && $fallback_details !== '' && stripos($primary_details, $fallback_details) === false) {
        $merged['paymentDetails'] = $primary_details . "\n" . $fallback_details;
    }
    $merged['confidence'] = max((float) ($primary['confidence'] ?? 0), (float) ($fallback['confidence'] ?? 0));
    return $merged;
}

function rermed_fallback_extract_commercial_bank_credit_advice($text, $row)
{
    $raw = html_entity_decode(strip_tags((string) $text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $plain = trim(preg_replace('/\s+/', ' ', $raw));
    if ($plain === '' || !preg_match('/IR-[A-Z]{3}\d{5,}|Credit\s+Advice/i', $plain)) {
        return null;
    }

    $reference = '';
    if (preg_match('/(IR-[A-Z]{3}\d{8})(?=\d{1,2}\.\d{1,2}\.\d{4})/i', $plain, $match)) {
        $reference = strtoupper($match[1]);
    } elseif (preg_match('/(IR-[A-Z]{3}\d{5,})(?=\d{1,2}\.\d{1,2}\.\d{4}|\b|[^0-9])/i', $plain, $match)) {
        $reference = strtoupper($match[1]);
    }

    $currency = '';
    if (preg_match('/IR-([A-Z]{3})\d{5,}(?=\d{1,2}\.\d{1,2}\.\d{4}|\b|[^0-9])/i', $plain, $match)) {
        $currency = strtoupper($match[1]);
    }
    if (!in_array($currency, ['LKR', 'USD'], true)) {
        $currency = preg_match('/(?<![A-Z0-9-])USD\s+[0-9]/i', $plain) ? 'USD' : 'LKR';
    }

    $amounts = [];
    if (preg_match_all('/(?<![A-Z0-9-])(?:USD|LKR|Rs\.?|\$)\s+([0-9][0-9,]*\.\d{2})/i', $plain, $matches)) {
        foreach ($matches[1] as $value) {
            $amount = (float) str_replace(',', '', $value);
            if ($amount > 0) {
                $amounts[] = $amount;
            }
        }
    }
    $amount = count($amounts) > 0 ? max($amounts) : 0.0;

    $invoice_date = '';
    if (preg_match('/Credit\s+Advice\s*IR-[A-Z]{3}\d{5,}\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*DATE/i', $plain, $match)) {
        $invoice_date = rermed_fallback_normalize_tax_date($match[1]);
    }
    if ($invoice_date === '' && preg_match('/\b(\d{1,2}\.\d{1,2}\.\d{4})\s*DATE\b/i', $plain, $match)) {
        $invoice_date = rermed_fallback_normalize_tax_date($match[1]);
    }
    if ($invoice_date === '' && preg_match('/\bDATE\s*[:.-]?\s*(\d{1,2}\.\d{1,2}\.\d{4})\b/i', $plain, $match)) {
        $invoice_date = rermed_fallback_normalize_tax_date($match[1]);
    }

    $vendor = rermed_fallback_google_tax_vendor($plain);
    if (preg_match('/\b1\/\s*([A-Z0-9 .,&()\'-]{2,120}?)(?=\s+2\/|\s+3\/|\s+USD\s+[0-9]|\s+N\/A\b|$)/i', $plain, $match)) {
        $vendor = $vendor !== '' ? $vendor : trim(preg_replace('/\s+/', ' ', $match[1]));
    }
    if ($vendor === '') {
        $vendor = rermed_fallback_tax_vendor('', (string) ($row['sender_email'] ?? ''), (string) ($row['subject'] ?? ''));
    }
    $vendor = rermed_fallback_normalize_tax_vendor($vendor, $plain);

    $details = [];
    if ($reference !== '') {
        $details[] = 'Reference: ' . $reference;
    }
    if (preg_match('/\b(USD|LKR)\s+ONE\s+[A-Z\s-]+?CENTS\b/i', $plain, $match)) {
        $details[] = 'Amount in words: ' . trim(preg_replace('/\s+/', ' ', $match[0]));
    }
    if (preg_match('/\b[A-Z]{2}\d{10,34}\b/', $plain, $match)) {
        $details[] = 'Account: ' . $match[0];
    }
    if (preg_match('/PURP\s*:\s*([A-Z0-9 .,&()\'-]{2,80})/i', $plain, $match)) {
        $details[] = 'Purpose: ' . trim($match[1]);
    }
    if (preg_match('/(?:NOTPROVIDED\/)?GOOGLE\s+(?:MERCHANT\/PARTNER|ADVERTISING)\s+PAYMENT/i', $plain, $match)) {
        $details[] = 'Payment instruction: ' . trim(preg_replace('/\s+/', ' ', $match[0]));
    }

    if ($amount <= 0 && $reference === '') {
        return null;
    }

    return [
        'invoiceNo' => $reference,
        'invoiceDate' => $invoice_date,
        'vendor' => $vendor,
        'amount' => $amount > 0 ? $amount : null,
        'currency' => $currency,
        'taxAmount' => null,
        'paymentDetails' => implode("\n", $details),
        'confidence' => $amount > 0 && $reference !== '' ? 0.94 : 0.72,
    ];
}

function rermed_fallback_extract_tax_values($text, $row, $from_attachment)
{
    $commercial_bank = rermed_fallback_extract_commercial_bank_credit_advice($text, $row);
    if (is_array($commercial_bank)) {
        return $commercial_bank;
    }

    $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags((string) $text), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    $amount = rermed_fallback_tax_extract_amount($text);
    $currency = preg_match('/USD|\$/i', $text) ? 'USD' : 'LKR';
    $invoice_no = rermed_fallback_tax_invoice_no($text);
    $invoice_date = rermed_fallback_tax_invoice_date($text);
    $vendor = rermed_fallback_normalize_tax_vendor(
        rermed_fallback_tax_vendor($text, (string) ($row['sender_email'] ?? ''), (string) ($row['subject'] ?? '')),
        $text
    );
    $tax_amount = rermed_fallback_tax_extract_tax_amount($text);
    $payment_details = rermed_fallback_tax_payment_details($text);
    $confidence = 0.2;
    if ($amount > 0) {
        $confidence += 0.35;
    }
    if ($invoice_no !== '') {
        $confidence += 0.15;
    }
    if ($invoice_date !== '') {
        $confidence += 0.15;
    }
    if ($from_attachment) {
        $confidence += 0.1;
    }
    return [
        'invoiceNo' => $invoice_no,
        'invoiceDate' => $invoice_date,
        'vendor' => $vendor,
        'amount' => $amount > 0 ? $amount : null,
        'currency' => $currency,
        'taxAmount' => $tax_amount,
        'paymentDetails' => $payment_details,
        'confidence' => min(0.95, $confidence),
    ];
}

function rermed_fallback_is_suspicious_tax_amount($parsed, $row)
{
    if (!is_array($parsed)) {
        return false;
    }
    $amount = (float) ($parsed['amount'] ?? 0);
    if ($amount <= 0) {
        return false;
    }
    $currency = strtoupper((string) ($parsed['currency'] ?? $row['currency'] ?? ''));
    if ($currency === 'USD' && $amount >= 1000000) {
        return true;
    }
    $subject = strtoupper((string) ($row['subject'] ?? ''));
    $plain_amount = preg_replace('/\D+/', '', (string) round($amount));
    if ($plain_amount !== '' && strlen($plain_amount) >= 6 && strpos(preg_replace('/\D+/', '', $subject), $plain_amount) !== false) {
        return true;
    }
    return false;
}

function rermed_fallback_normalize_tax_date($value)
{
    $value = trim((string) $value);
    if ($value === '') {
        return '';
    }
    if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $value, $match)) {
        $day = (int) $match[1];
        $month = (int) $match[2];
        $year = (int) $match[3];
        if (checkdate($month, $day, $year)) {
            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }
    }
    $time = strtotime($value);
    return $time !== false ? date('Y-m-d', $time) : '';
}

function rermed_fallback_google_tax_vendor($text)
{
    $text = strtoupper((string) $text);
    if (preg_match('/GOOGLE\s+ADVERTISING\s+PAYMENT|GOOGLE\s+ADS|GOOGLE\s+ADMOB/', $text)) {
        return 'Google Admob';
    }
    if (preg_match('/GOOGLE\s+MERCHANT\s*\/\s*PARTNER\s+PAYMENT|GOOGLE\s+MERCHANT|PARTNER\s+PAYMENT|GOOGLE\s+PLAY\s+CONSOLE/', $text)) {
        return 'Google Play Console';
    }
    return '';
}

function rermed_fallback_normalize_tax_vendor($vendor, $text)
{
    $google_vendor = rermed_fallback_google_tax_vendor((string) $vendor . "\n" . (string) $text);
    if ($google_vendor !== '') {
        return $google_vendor;
    }
    return trim((string) $vendor);
}

function rermed_fallback_tax_invoice_date($text)
{
    $text = (string) $text;
    $patterns = [
        '/(?:invoice\s+date|receipt\s+date|payment\s+date|paid\s+on|date)\s*[:#.-]?\s*(\d{4}-\d{2}-\d{2})/i',
        '/(?:invoice\s+date|receipt\s+date|payment\s+date|paid\s+on|date)\s*[:#.-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i',
        '/(?:invoice\s+date|receipt\s+date|payment\s+date|paid\s+on|date)\s*[:#.-]?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i',
        '/\b(\d{1,2}\.\d{1,2}\.\d{4})\s*DATE\b/i',
        '/(?:invoice\s+date|receipt\s+date|payment\s+date|paid\s+on|date)\s*[:#.-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i',
        '/\b(\d{4}-\d{2}-\d{2})\b/',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $text, $match)) {
            $date = rermed_fallback_normalize_tax_date($match[1]);
            if ($date !== '') {
                return $date;
            }
        }
    }
    return '';
}

function rermed_fallback_tax_vendor($text, $from, $subject)
{
    if (preg_match('/(?:vendor|merchant|supplier|billed\s+by|paid\s+to)\s*[:#.-]?\s*([A-Za-z0-9 .,&()_-]{3,80})/i', (string) $text, $match)) {
        return trim($match[1]);
    }
    if (preg_match('/^"?([^"<]+)"?\s*</', (string) $from, $match)) {
        return trim($match[1]);
    }
    $subject_piece = trim((string) preg_split('/[-|:]/', (string) $subject)[0]);
    return $subject_piece !== '' ? $subject_piece : trim((string) $from);
}

function rermed_fallback_tax_extract_tax_amount($text)
{
    if (preg_match('/(?:VAT|Tax)\s*(?:Amount)?\s*[:.-]?\s*(?:LKR|Rs\.?|\$|USD)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i', (string) $text, $match)) {
        return (float) str_replace(',', '', $match[1]);
    }
    return null;
}

function rermed_fallback_tax_payment_details($text)
{
    $lines = preg_split('/(?:\r?\n|(?<=\.)\s+)/', (string) $text);
    $matches = [];
    foreach ($lines as $line) {
        $line = trim(preg_replace('/\s+/', ' ', (string) $line));
        if ($line !== '' && preg_match('/\b(payment\s+method|paid\s+via|transaction|reference|receipt|card|bank|paypal|stripe|postmark|cpanel)\b/i', $line)) {
            $matches[] = $line;
        }
        if (count($matches) >= 4) {
            break;
        }
    }
    return substr(implode("\n", array_unique($matches)), 0, 1500);
}

function rermed_fallback_insert_tax_ledger_row($mysqli, $tax_year, $mail)
{
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $mail['parsed_invoice_date'])
        ? (string) $mail['parsed_invoice_date']
        : substr((string) $mail['received_at'], 0, 10);
    $title = substr((string) $mail['subject'], 0, 255);
    $category = (string) $mail['suggested_category'];
    $subcategory = (string) $mail['suggested_subcategory'];
    $parsed_invoice_amount_value = isset($mail['parsed_invoice_amount']) && $mail['parsed_invoice_amount'] !== null ? (float) $mail['parsed_invoice_amount'] : 0.0;
    $amount = $parsed_invoice_amount_value > 0 ? $parsed_invoice_amount_value : (float) $mail['amount'];
    $currency = in_array((string) $mail['currency'], ['LKR', 'USD'], true) ? (string) $mail['currency'] : 'LKR';
    $entry_type = $mail['suggested_type'] === 'Income' ? 'Income' : 'Expense';
    $notes = (string) $mail['body_preview'];
    if ($title === '' || $category === '' || $amount < 0) {
        return ['ledger_id' => 0, 'error' => 'Required email approval fields are missing or invalid', 'status' => 'failed'];
    }

    $evidence = rermed_fallback_save_tax_evidence_to_server($mysqli, $mail, $tax_year);
    $attachment_url = (string) ($evidence['url'] ?? '');
    $attachment_name = substr((string) ($mail['attachment_name'] ?? ''), 0, 255);
    $gmail_message_id = substr((string) ($mail['gmail_message_id'] ?? ''), 0, 190);
    $gmail_attachment_id = substr((string) ($mail['gmail_attachment_id'] ?? ''), 0, 190);
    $gmail_part_id = substr((string) ($mail['gmail_part_id'] ?? ''), 0, 80);
    $parsed_invoice_no = substr((string) ($mail['parsed_invoice_no'] ?? ''), 0, 120);
    $parsed_invoice_date = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $mail['parsed_invoice_date']) ? (string) $mail['parsed_invoice_date'] : null;
    $parsed_vendor = substr((string) ($mail['parsed_vendor'] ?? ''), 0, 190);
    $parsed_tax_amount = $mail['parsed_tax_amount'];
    $parsed_invoice_amount = $mail['parsed_invoice_amount'];
    $parsed_currency = substr((string) ($mail['parsed_currency'] ?: $currency), 0, 20);
    $parsed_payment_details = (string) ($mail['parsed_payment_details'] ?? '');

    if (!empty($evidence['error'])) {
        $notes = trim($notes . "\n\nServer evidence upload failed: " . $evidence['error']);
    }

    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_tax_ledger_tab
          (tax_year, transaction_date, title, category, subcategory, amount, currency, entry_type, source, status, notes, attachment_url, attachment_name, gmail_message_id, gmail_attachment_id, gmail_part_id, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, valid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, "Email", "Ready", ?, ?, NULLIF(?, ""), NULLIF(?, ""), NULLIF(?, ""), NULLIF(?, ""), NULLIF(?, ""), ?, NULLIF(?, ""), ?, 1)'
    );
    if (!$stmt) {
        return ['ledger_id' => 0, 'error' => $mysqli->error, 'status' => 'failed'];
    }
    $stmt->bind_param(
        'sssssdsssssssssssd',
        $tax_year,
        $date,
        $title,
        $category,
        $subcategory,
        $amount,
        $currency,
        $entry_type,
        $notes,
        $attachment_url,
        $attachment_name,
        $gmail_message_id,
        $gmail_attachment_id,
        $gmail_part_id,
        $parsed_invoice_no,
        $parsed_invoice_date,
        $parsed_vendor,
        $parsed_tax_amount
    );
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $ledger_id = (int) $mysqli->insert_id;
    $stmt->close();
    if (!$ok) {
        return ['ledger_id' => 0, 'error' => $error, 'status' => 'failed'];
    }
    return ['ledger_id' => $ledger_id, 'url' => $attachment_url, 'status' => $evidence['status'] ?? 'uploaded'];
}

function rermed_fallback_mark_tax_queue_approved($mysqli, $message_id, $ledger_ids)
{
    $ledger_id = 0;
    foreach ($ledger_ids as $id) {
        if ((int) $id > 0) {
            $ledger_id = (int) $id;
            break;
        }
    }
    $stmt = $mysqli->prepare('UPDATE fnd_tax_email_queue_tab SET status = "Approved", ledger_id = NULLIF(?, 0), updated_at = CURRENT_TIMESTAMP WHERE gmail_message_id = ? AND valid = 1');
    if (!$stmt) {
        return;
    }
    $stmt->bind_param('is', $ledger_id, $message_id);
    $stmt->execute();
    $stmt->close();
}

function rermed_fallback_mark_tax_message_processed($mysqli, $mail)
{
    $message_id = trim((string) ($mail['gmail_message_id'] ?? ''));
    if ($message_id === '') {
        return;
    }
    $stmt = $mysqli->prepare('UPDATE fnd_tax_email_messages_tab SET read_status = "Processed", valid = 1, updated_at = CURRENT_TIMESTAMP WHERE gmail_message_id = ?');
    if ($stmt) {
        $stmt->bind_param('s', $message_id);
        $stmt->execute();
        $stmt->close();
    }
}

function rermed_fallback_move_approved_imap_message($mysqli, $message_id, $entry_type)
{
    $imap_id = rermed_fallback_parse_imap_message_id($message_id);
    if (!function_exists('imap_open') || !$imap_id) {
        return ['status' => 'move-skipped'];
    }
    $source_folder = $imap_id['mailbox'] ?: ($entry_type === 'Income' ? 'Income' : 'Expense');
    $uid = (int) $imap_id['uid'];
    $target_folder = $entry_type === 'Income' ? 'Income Proceed' : 'Expense Proceed';
    $settings = GetGlobalSettings($mysqli);
    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    if ($host === '' || $username === '' || $password === '') {
        return ['error' => 'IMAP settings are incomplete. Email was approved but not moved.'];
    }
    $target_folder = rermed_fallback_resolve_imap_mailbox($host, $port, $encryption, $username, $password, $target_folder);
    $inbox = @imap_open(rermed_fallback_imap_mailbox_path($host, $port, $encryption, $source_folder), $username, $password);
    if (!$inbox) {
        return ['error' => 'Unable to open source folder for move: ' . (imap_last_error() ?: 'unknown error')];
    }
    $moved = @imap_mail_move($inbox, (string) $uid, $target_folder, CP_UID);
    if (!$moved) {
        imap_close($inbox);
        return ['error' => 'Unable to move approved email to ' . $target_folder . ': ' . (imap_last_error() ?: 'unknown error')];
    }
    imap_expunge($inbox);
    imap_close($inbox);
    return ['status' => 'moved-' . $target_folder];
}

function rermed_fallback_save_tax_evidence_to_server($mysqli, $mail, $tax_year)
{
    $settings = GetGlobalSettings($mysqli);
    if ((int) ($settings['tax_evidence_save_enabled'] ?? 1) !== 1) {
        return ['url' => '', 'status' => 'disabled'];
    }
    $bytes = '';
    $mime = (string) ($mail['attachment_mime'] ?: 'application/pdf');
    if (strpos((string) $mail['gmail_message_id'], 'imap:') === 0 && (string) $mail['gmail_attachment_id'] !== '' && (string) $mail['gmail_attachment_id'] !== 'message') {
        $file = rermed_fallback_fetch_imap_attachment_bytes($mysqli, (string) $mail['gmail_message_id'], (string) $mail['gmail_attachment_id'], $mime);
        $bytes = (string) ($file['bytes'] ?? '');
        $mime = (string) ($file['mime'] ?? $mime);
    }
    if ($bytes === '') {
        $bytes = (string) ($mail['body_preview'] ?: $mail['subject']);
        $mime = 'text/plain';
    }

    $name = rermed_fallback_safe_filename($mail['attachment_name'] ?: ($mail['subject'] . rermed_fallback_extension_for_mime($mime)));
    $filename = rermed_fallback_tax_evidence_filename(
        $name,
        $mime,
        $mail['gmail_message_id'] . '|' . $mail['gmail_attachment_id'],
        (string) ($mail['parsed_invoice_date'] ?? ''),
        (string) ($mail['parsed_invoice_no'] ?? '')
    );
    return rermed_fallback_upload_tax_evidence_to_uploadcare($settings, $filename, $mime, $bytes);
}

function rermed_fallback_tax_evidence_filename($name, $mime, $identity, $invoice_date = '', $invoice_no = '')
{
    $safe_name = rermed_fallback_safe_filename($name);
    $extension = rermed_fallback_extension_for_mime($mime, $safe_name);
    $stem = $extension !== '' && strtolower(substr($safe_name, -strlen($extension))) === strtolower($extension) ? substr($safe_name, 0, -strlen($extension)) : $safe_name;
    $prefix_parts = [];
    $safe_date = rermed_fallback_safe_filename(preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $invoice_date) ? (string) $invoice_date : '');
    $safe_invoice_no = rermed_fallback_safe_filename((string) $invoice_no);
    if ($safe_date !== '') {
        $prefix_parts[] = $safe_date;
    }
    if ($safe_invoice_no !== '') {
        $prefix_parts[] = substr($safe_invoice_no, 0, 60);
    }
    $safe_stem = substr(rermed_fallback_safe_filename($stem), 0, 90);
    $base = trim(implode('_', array_filter(array_merge($prefix_parts, [$safe_stem]))), '_');
    if ($base === '') {
        $base = 'tax-evidence';
    }
    return substr($base, 0, 160) . '-' . substr(md5((string) $identity), 0, 10) . $extension;
}

function rermed_fallback_upload_tax_evidence_to_uploadcare($settings, $filename, $mime, $bytes)
{
    if (!function_exists('curl_init')) {
        return ['url' => '', 'error' => 'PHP cURL extension is required for Uploadcare uploads.', 'status' => 'failed'];
    }
    $public_key = trim((string) ($settings['tax_uploadcare_public_key'] ?? getenv('UPLOADCARE_PUBLIC_KEY') ?: ''));
    if ($public_key === '') {
        return ['url' => '', 'error' => 'Uploadcare public key is required in Settings.', 'status' => 'failed'];
    }
    $store = trim((string) ($settings['tax_uploadcare_store'] ?? '1'));
    if (!in_array($store, ['0', '1', 'auto'], true)) {
        $store = '1';
    }
    $tmp = tempnam(sys_get_temp_dir(), 'tax-uploadcare-');
    if ($tmp === false || file_put_contents($tmp, $bytes) === false) {
        return ['url' => '', 'error' => 'Failed to prepare temporary Uploadcare file.', 'status' => 'failed'];
    }
    $ch = curl_init('https://upload.uploadcare.com/base/');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_POSTFIELDS => [
            'UPLOADCARE_PUB_KEY' => $public_key,
            'UPLOADCARE_STORE' => $store,
            'file' => curl_file_create($tmp, $mime ?: 'application/octet-stream', $filename),
        ],
    ]);
    $raw = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    @unlink($tmp);
    if ($raw === false || $curl_error !== '') {
        return ['url' => '', 'error' => 'Uploadcare request failed: ' . $curl_error, 'status' => 'failed'];
    }
    $response = json_decode((string) $raw, true);
    if ($http_code < 200 || $http_code >= 300 || !is_array($response) || empty($response['file'])) {
        return ['url' => '', 'error' => 'Uploadcare upload failed. HTTP ' . $http_code . ': ' . substr((string) $raw, 0, 300), 'status' => 'failed'];
    }
    $uuid = trim((string) $response['file']);
    return ['url' => 'https://ucarecdn.com/' . rawurlencode($uuid) . '/', 'status' => 'uploadcare-uploaded'];
}

function rermed_fallback_fetch_imap_attachment_bytes($mysqli, $message_id, $attachment_id, $mime)
{
    $imap_id = rermed_fallback_parse_imap_message_id($message_id);
    if (!$imap_id) {
        return ['bytes' => '', 'mime' => $mime];
    }
    $settings = GetGlobalSettings($mysqli);
    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    $mailbox_path = rermed_fallback_imap_mailbox_path($host, $port, $encryption, $imap_id['mailbox']);
    $inbox = @imap_open($mailbox_path, $username, $password);
    if (!$inbox) {
        return ['bytes' => '', 'mime' => $mime];
    }
    $current_uidvalidity = rermed_fallback_imap_uidvalidity($inbox, $mailbox_path);
    if ((int) $imap_id['uidvalidity'] > 0 && $current_uidvalidity > 0 && (int) $imap_id['uidvalidity'] !== $current_uidvalidity) {
        imap_close($inbox);
        return ['bytes' => '', 'mime' => $mime, 'error' => 'IMAP UIDVALIDITY changed. Run Sync Email again to refresh attachment links.'];
    }
    $message_no = imap_msgno($inbox, (int) $imap_id['uid']);
    $part_id = str_replace('imap-part:', '', (string) $attachment_id);
    $structure = $message_no > 0 ? imap_fetchstructure($inbox, $message_no) : null;
    $part = $structure ? rermed_fallback_imap_find_part($structure, $part_id) : null;
    $bytes = $part ? rermed_fallback_imap_decode_body(imap_fetchbody($inbox, $message_no, $part_id), (int) ($part->encoding ?? 0)) : '';
    $part_mime = $part ? rermed_fallback_imap_mime($part) : $mime;
    imap_close($inbox);
    return ['bytes' => (string) $bytes, 'mime' => $part_mime];
}

function rermed_fallback_parse_imap_message_id($message_id)
{
    if (preg_match('/^imap:(.*):(\d+):(\d+)$/', (string) $message_id, $matches)) {
        return ['mailbox' => (string) $matches[1], 'uidvalidity' => (int) $matches[2], 'uid' => (int) $matches[3]];
    }
    if (preg_match('/^imap:(.*):(\d+)$/', (string) $message_id, $matches)) {
        return ['mailbox' => (string) $matches[1], 'uidvalidity' => 0, 'uid' => (int) $matches[2]];
    }
    return null;
}

function rermed_fallback_imap_find_part($part, $target, $prefix = '')
{
    $part_no = $prefix === '' ? '1' : $prefix;
    if ($part_no === (string) $target) {
        return $part;
    }
    if (isset($part->parts) && is_array($part->parts)) {
        foreach ($part->parts as $index => $child) {
            $child_no = $prefix === '' ? (string) ($index + 1) : $prefix . '.' . ($index + 1);
            $found = rermed_fallback_imap_find_part($child, $target, $child_no);
            if ($found) {
                return $found;
            }
        }
    }
    return null;
}

function rermed_fallback_safe_filename($name)
{
    $name = trim(preg_replace('/[\\\\\/:*?"<>|\r\n]+/', ' ', (string) $name));
    $name = preg_replace('/\s+/', ' ', $name);
    return $name === '' ? 'tax-evidence' : substr($name, 0, 140);
}

function rermed_fallback_extension_for_mime($mime, $filename = '')
{
    $extension = strtolower((string) pathinfo((string) $filename, PATHINFO_EXTENSION));
    if ($extension !== '') {
        return '.' . preg_replace('/[^a-z0-9]+/', '', $extension);
    }
    $map = ['application/pdf' => '.pdf', 'image/png' => '.png', 'image/jpeg' => '.jpg', 'image/webp' => '.webp', 'text/plain' => '.txt', 'text/html' => '.html', 'text/csv' => '.csv', 'message/rfc822' => '.eml'];
    return $map[strtolower((string) $mime)] ?? '.bin';
}

function rermed_fallback_get_tax_ledger_rows($mysqli, $tax_year)
{
    rermed_fallback_ensure_tax_tables($mysqli);
    $stmt = $mysqli->prepare(
        'SELECT id, tax_year, transaction_date, title, category, subcategory, amount, currency, entry_type, source, status, notes, attachment_url, attachment_name, gmail_message_id, gmail_attachment_id, gmail_part_id, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, created_at, updated_at
         FROM fnd_tax_ledger_tab
         WHERE valid = 1 AND tax_year = ?
         ORDER BY transaction_date DESC, id DESC'
    );
    if (!$stmt) {
        return [];
    }
    $stmt->bind_param('s', $tax_year);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    return array_map(function ($row) {
        return [
            'id' => (string) $row['id'],
            'taxYear' => (string) $row['tax_year'],
            'transactionDate' => (string) $row['transaction_date'],
            'title' => (string) $row['title'],
            'category' => (string) $row['category'],
            'subcategory' => (string) ($row['subcategory'] ?? ''),
            'amount' => (float) $row['amount'],
            'currency' => (string) $row['currency'],
            'entryType' => (string) $row['entry_type'],
            'source' => (string) $row['source'],
            'status' => (string) $row['status'],
            'notes' => (string) ($row['notes'] ?? ''),
            'attachmentUrl' => (string) ($row['attachment_url'] ?? ''),
            'attachmentName' => (string) ($row['attachment_name'] ?? ''),
            'gmailMessageId' => (string) ($row['gmail_message_id'] ?? ''),
            'gmailAttachmentId' => (string) ($row['gmail_attachment_id'] ?? ''),
            'gmailPartId' => (string) ($row['gmail_part_id'] ?? ''),
            'parsedInvoiceNo' => (string) ($row['parsed_invoice_no'] ?? ''),
            'parsedInvoiceDate' => (string) ($row['parsed_invoice_date'] ?? ''),
            'parsedVendor' => (string) ($row['parsed_vendor'] ?? ''),
            'parsedTaxAmount' => isset($row['parsed_tax_amount']) ? (float) $row['parsed_tax_amount'] : null,
            'parsedInvoiceAmount' => isset($row['parsed_invoice_amount']) ? (float) $row['parsed_invoice_amount'] : ((float) ($row['amount'] ?? 0) > 0 ? (float) $row['amount'] : null),
            'parsedCurrency' => (string) ($row['parsed_currency'] ?? ($row['currency'] ?? '')),
            'parsedPaymentDetails' => (string) ($row['parsed_payment_details'] ?? ''),
        ];
    }, $rows);
}

function handle_fallback_send_finance_invoice($mysqli)
{
    $recipient = trim((string) ($_POST['recipient'] ?? 'tax@rermedapps.com'));
    $subject = rermed_fallback_mail_header((string) ($_POST['subject'] ?? 'RER MedApps Invoice'));
    $invoice_no = rermed_fallback_mail_header((string) ($_POST['invoice_no'] ?? 'invoice'));
    $vendor_name = rermed_fallback_mail_header((string) ($_POST['vendor_name'] ?? 'Vendor'));
    $invoice_date = rermed_fallback_mail_header((string) ($_POST['invoice_date'] ?? date('Y-m-d')));
    $due_date = rermed_fallback_mail_header((string) ($_POST['due_date'] ?? ''));
    $tag_name = rermed_fallback_mail_header((string) ($_POST['tag'] ?? 'Expenses'));
    $remark = trim((string) ($_POST['remark'] ?? ''));
    $currency = strtoupper(rermed_fallback_mail_header((string) ($_POST['currency'] ?? 'LKR'))) === 'USD' ? 'USD' : 'LKR';
    $lines = rermed_fallback_invoice_lines(json_decode((string) ($_POST['lines_json'] ?? '[]'), true));

    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL) || strtolower($recipient) !== 'tax@rermedapps.com') {
        send_json(['success' => false, 'error_msg' => 'Invoice recipient must be tax@rermedapps.com.'], 400);
    }
    if ($subject === '' || $invoice_no === '' || $vendor_name === '' || count($lines) === 0) {
        send_json(['success' => false, 'error_msg' => 'Invoice subject, vendor, number, and line items are required.'], 400);
    }

    $invoice = [
        'invoice_no' => $invoice_no,
        'vendor_name' => $vendor_name,
        'invoice_date' => $invoice_date,
        'due_date' => $due_date,
        'tag' => $tag_name,
        'remark' => $remark,
        'currency' => $currency,
        'lines' => $lines,
    ];
    $total = rermed_fallback_invoice_total($invoice);
    $message_id = sprintf('<invoice-%s-%s@rermedapps.com>', preg_replace('/[^A-Za-z0-9_-]+/', '-', $invoice_no), bin2hex(random_bytes(6)));
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'From: RER MedApps Admin <admin@rermedapps.com>',
        'Reply-To: admin@rermedapps.com',
        'Message-ID: ' . $message_id,
        'X-RERMed-Invoice-No: ' . $invoice_no,
    ];
    $html = rermed_fallback_invoice_html($invoice, $recipient);
    $ok = @mail($recipient, $subject, $html, implode("\r\n", $headers));

    send_json($ok ? [
        'success' => true,
        'recipient' => $recipient,
        'message_id' => trim($message_id, '<>'),
        'total' => $total,
    ] : [
        'success' => false,
        'error_msg' => 'Server mail() failed while sending invoice to tax@rermedapps.com.',
    ], $ok ? 200 : 500);
}

function rermed_fallback_mail_header($value)
{
    return trim(preg_replace('/[\r\n]+/', ' ', (string) $value));
}

function rermed_fallback_invoice_lines($lines)
{
    $clean = [];
    if (!is_array($lines)) {
        return $clean;
    }
    foreach ($lines as $line) {
        if (!is_array($line)) {
            continue;
        }
        $description = trim((string) ($line['description'] ?? ''));
        $quantity = (float) ($line['quantity'] ?? 0);
        $unit_price = (float) ($line['unitPrice'] ?? $line['unit_price'] ?? 0);
        if ($description !== '' && $quantity > 0 && $unit_price >= 0) {
            $clean[] = ['description' => $description, 'quantity' => $quantity, 'unit_price' => $unit_price];
        }
    }
    return $clean;
}

function rermed_fallback_invoice_money($amount, $currency)
{
    return ($currency === 'LKR' ? 'Rs ' : '$') . number_format((float) $amount, 2);
}

function rermed_fallback_invoice_total($invoice)
{
    $total = 0.0;
    foreach (($invoice['lines'] ?? []) as $line) {
        $total += (float) $line['quantity'] * (float) $line['unit_price'];
    }
    return $total;
}

function rermed_fallback_invoice_html($invoice, $recipient)
{
    $currency = (string) ($invoice['currency'] ?? 'LKR');
    $tag = (string) ($invoice['tag'] ?? 'Expenses');
    $accent = $tag === 'Expenses' ? '#f43f5e' : '#8b5cf6';
    $rows = '';
    foreach (($invoice['lines'] ?? []) as $index => $line) {
        $line_total = (float) $line['quantity'] * (float) $line['unit_price'];
        $rows .= '<tr>'
            . '<td style="padding:14px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">' . ($index + 1) . '</td>'
            . '<td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">' . htmlspecialchars((string) $line['description'], ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563;">' . htmlspecialchars((string) $line['quantity'], ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563;">' . rermed_fallback_invoice_money($line['unit_price'], $currency) . '</td>'
            . '<td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:800;">' . rermed_fallback_invoice_money($line_total, $currency) . '</td>'
            . '</tr>';
    }
    $remark = trim((string) ($invoice['remark'] ?? ''));
    $remark_html = $remark !== '' ? '<div style="margin-top:24px;border-radius:18px;border:1px solid #e5e7eb;background:#f9fafb;padding:18px;"><div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Remark</div><div style="margin-top:8px;font-size:14px;line-height:1.6;color:#111827;">' . nl2br(htmlspecialchars($remark, ENT_QUOTES, 'UTF-8')) . '</div></div>' : '';
    $total = rermed_fallback_invoice_total($invoice);

    return '<!doctype html><html><body style="margin:0;background:#f3f4f6;padding:32px;font-family:Inter,Arial,sans-serif;color:#111827;">'
        . '<div style="max-width:820px;margin:0 auto;border-radius:30px;background:#ffffff;box-shadow:0 22px 70px rgba(15,23,42,0.16);overflow:hidden;">'
        . '<div style="background:#0d0d11;padding:34px 38px;color:#ffffff;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;"><div>'
        . '<div style="font-size:11px;font-weight:900;letter-spacing:0.22em;text-transform:uppercase;color:#34d399;">RER MedApps Finance</div>'
        . '<h1 style="margin:8px 0 0;font-size:34px;line-height:1;font-style:italic;letter-spacing:-0.04em;">Invoice</h1>'
        . '<div style="margin-top:14px;display:inline-block;border-radius:999px;background:' . $accent . ';padding:8px 13px;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;">' . htmlspecialchars($tag, ENT_QUOTES, 'UTF-8') . '</div></div>'
        . '<div style="text-align:right;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7;"><div style="font-weight:900;color:#ffffff;">' . htmlspecialchars((string) $invoice['invoice_no'], ENT_QUOTES, 'UTF-8') . '</div><div>Invoice date: ' . htmlspecialchars((string) $invoice['invoice_date'], ENT_QUOTES, 'UTF-8') . '</div>' . (trim((string) ($invoice['due_date'] ?? '')) !== '' ? '<div>Due date: ' . htmlspecialchars((string) $invoice['due_date'], ENT_QUOTES, 'UTF-8') . '</div>' : '') . '</div></div></div>'
        . '<div style="padding:34px 38px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:30px;">'
        . '<div style="border-radius:20px;background:#f9fafb;padding:18px;border:1px solid #e5e7eb;"><div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Vendor</div><div style="margin-top:8px;font-size:18px;font-weight:900;color:#111827;">' . htmlspecialchars((string) $invoice['vendor_name'], ENT_QUOTES, 'UTF-8') . '</div></div>'
        . '<div style="border-radius:20px;background:#f9fafb;padding:18px;border:1px solid #e5e7eb;"><div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Tax mailbox</div><div style="margin-top:8px;font-size:18px;font-weight:900;color:#111827;">' . htmlspecialchars((string) $recipient, ENT_QUOTES, 'UTF-8') . '</div></div></div>'
        . '<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="padding:0 0 12px;text-align:left;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">#</th><th style="padding:0 12px 12px;text-align:left;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Description</th><th style="padding:0 12px 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Qty</th><th style="padding:0 12px 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Rate</th><th style="padding:0 0 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Amount</th></tr></thead><tbody>' . $rows . '</tbody></table>'
        . '<div style="margin-top:28px;display:flex;justify-content:flex-end;"><div style="min-width:270px;border-radius:22px;background:#111827;color:#ffffff;padding:22px;"><div style="display:flex;justify-content:space-between;color:rgba(255,255,255,0.62);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;"><span>Total</span><span>' . $currency . '</span></div><div style="margin-top:10px;text-align:right;font-size:30px;font-style:italic;font-weight:900;letter-spacing:-0.04em;color:#ffffff;">' . rermed_fallback_invoice_money($total, $currency) . '</div></div></div>'
        . $remark_html . '</div></div></body></html>';
}

function send_json($payload, $status_code = 200)
{
    if (!headers_sent()) {
        http_response_code($status_code);
        header('Content-Type: application/json');
    }

    echo json_encode($payload);
    exit();
}

function is_public_tag($tag)
{
    return in_array($tag, [
        'SERVER_UP',
        'GET_INFO',
        'UPDATE_TOKEN',
        'GET_PUBLIC_SETTINGS',
    ], true);
}

function is_settings_request_tag($tag)
{
    return in_array($tag, [
        'GET_GLOBAL_SETTINGS',
        'GET_PUBLIC_SETTINGS',
        'SAVE_GLOBAL_SETTINGS',
    ], true);
}

function expected_backend_token()
{
    $token = getenv('PHP_BACKEND_AUTH_TOKEN');
    if ($token === false || $token === '') {
        $token = getenv('PHP_AUTH_TOKEN');
    }

    return $token === false ? '' : trim((string) $token);
}

function require_backend_authorized($tag)
{
    if (is_public_tag($tag)) {
        return;
    }

    $expected_token = expected_backend_token();
    if ($expected_token === '') {
        send_json([
            'success' => false,
            'error_msg' => 'Backend auth token is not configured.'
        ], 503);
    }

    $provided_token = get_bearer_token();
    if ($provided_token === null || !hash_equals($expected_token, $provided_token)) {
        send_json([
            'success' => false,
            'error_msg' => 'Unauthorized'
        ], 401);
    }
}

function connect_requested_database($main_mysqli, $db)
{
    if ($db === 'MAIN' || (string) $db === '0') {
        return $main_mysqli;
    }

    return SwapDatabase($main_mysqli, $db);
}

function get_bearer_token()
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
    if ($header === '') {
        return null;
    }

    if (preg_match('/^Bearer\s+(.+)$/i', $header, $match)) {
        return $match[1];
    }

    return null;
}

function get_request_email()
{
    if (isset($_POST['email']) && trim($_POST['email']) !== '') {
        return trim($_POST['email']);
    }

    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
    if ($header !== '' && stripos($header, 'Basic ') === 0) {
        $decoded = base64_decode(substr($header, 6), true);
        if ($decoded !== false && strpos($decoded, ':') !== false) {
            return explode(':', $decoded, 2)[0];
        }
    }

    return '';
}

function handle_server_up($main_mysqli)
{
    $version_code = isset($_POST['version_code']) ? (int) $_POST['version_code'] : 0;
    $under_maintain = GetMaintainInfo($main_mysqli, $version_code);

    send_json([
        'success' => !$under_maintain,
        'info' => $under_maintain ? 'Server not available' : 'Server available'
    ]);
}

function handle_get_info($main_mysqli, $email)
{
    if ($email === '') {
        send_json([
            'success' => false,
            'error_msg' => 'Email parameter is missing'
        ], 400);
    }

    CheckRegistration($main_mysqli, $email);
    LogAccess($main_mysqli, $email);

    $response = [
        'success' => true
    ];

    $installer = $_POST['installer'] ?? '';
    if (!SettingEnabled($main_mysqli, 'VERIFY_INSTALLER')) {
        $response['valid_installer'] = true;
    } else {
        $response['valid_installer'] = IsValidInstaller($main_mysqli, $installer) == 1;
        if (!$response['valid_installer']) {
            send_json($response);
        }
    }

    if (IsValidUser($main_mysqli, $email) == '0') {
        $response['valid'] = false;
        send_json($response);
    }

    $response['valid'] = true;

    $version = $_POST['version'] ?? '';
    $version_code = isset($_POST['version_code']) ? (int) $_POST['version_code'] : 0;
    $skip_update = $_POST['skip_update'] ?? '0';
    $release = GetReleaseInfo($main_mysqli, $version, $version_code);

    if ($release === false) {
        send_json([
            'success' => false,
            'error_msg' => 'Error occurred in server.'
        ]);
    }

    if (!is_null($release[0]['version']) && !($skip_update === '1' && $release[0]['mandatory'] == 0)) {
        $response['update'] = true;
        $response['version'] = GetReleaseName($main_mysqli, $release[0]['version_code']);
        $response['mandatory'] = $release[0]['mandatory'];
        send_json($response);
    }

    $response['update'] = false;
    $response['sync'] = true;
    $response['appLst'] = GetAppInfo($main_mysqli);

    send_json($response);
}

function handle_update_token($mysqli, $email)
{
    if ($email === '') {
        send_json([
            'success' => false,
            'error_msg' => 'Email parameter is missing'
        ], 400);
    }

    $firebase_token = $_POST['firebase_token'] ?? '';
    send_json([
        'success' => UpdateFirebaseToken($mysqli, $email, $firebase_token),
        'info' => ''
    ]);
}

function handle_get_app_reply_knowledge($main_mysqli)
{
    $app_name = trim((string)($_POST['app_name'] ?? ''));
    $platform = trim((string)($_POST['platform'] ?? 'All'));

    if ($app_name === '') {
        send_json([
            'success' => false,
            'error_msg' => 'app_name is required'
        ], 400);
    }

    $stmt = $main_mysqli->prepare(
        "SELECT id, app_id, app_name, platform, app_context, common_rules, known_limitations, reply_tone, max_reply_chars, status
         FROM fnd_app_reply_knowledge_tab
         WHERE status = 'ACTIVE'
           AND LOWER(app_name) = LOWER(?)
           AND platform IN (?, 'All')
         ORDER BY CASE WHEN platform = ? THEN 0 ELSE 1 END, updated_at DESC
         LIMIT 1"
    );

    if (!$stmt) {
        send_json([
            'success' => false,
            'error_msg' => 'Unable to prepare reply knowledge query'
        ], 500);
    }

    $stmt->bind_param('sss', $app_name, $platform, $platform);
    if (!$stmt->execute()) {
        $stmt->close();
        send_json([
            'success' => false,
            'error_msg' => 'Unable to load reply knowledge'
        ], 500);
    }

    $rows = get_result($stmt);
    $stmt->close();

    send_json([
        'success' => true,
        'knowledge' => $rows[0] ?? null
    ]);
}

function handle_get_apps($main_mysqli)
{
    $apps = GetAppDetails($main_mysqli);

    if ($apps === false) {
        send_json([
            'success' => false,
            'error_msg' => 'Unable to load app list'
        ], 500);
    }

    send_json([
        'success' => true,
        'apps' => $apps
    ]);
}

function handle_get_app_by_id($main_mysqli)
{
    $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
    if ($id <= 0) {
        send_json([
            'success' => false,
            'error_msg' => 'App id is required'
        ], 400);
    }

    $app = GetAppDetailById($main_mysqli, $id);
    if ($app === false) {
        send_json([
            'success' => false,
            'error_msg' => 'App not found'
        ], 404);
    }

    send_json([
        'success' => true,
        'app' => $app
    ]);
}

function handle_save_app($main_mysqli)
{
    $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;

    $package_name = trim((string) ($_POST['package_name'] ?? ''));
    $app_id = trim((string) ($_POST['app_id'] ?? ''));
    $db_name = trim((string) ($_POST['db_name'] ?? ''));
    $name = trim((string) ($_POST['name'] ?? ''));
    $theme_color = trim((string) ($_POST['theme_color'] ?? ''));
    $current_ver = trim((string) ($_POST['current_ver'] ?? ''));
    $release_date = trim((string) ($_POST['release_date'] ?? ''));
    $paid = isset($_POST['paid']) ? (int) $_POST['paid'] : 0;
    $os = trim((string) ($_POST['os'] ?? ''));
    $url = trim((string) ($_POST['url'] ?? ''));
    $private_key = trim((string) ($_POST['private_key'] ?? ''));
    $endpoint = trim((string) ($_POST['endpoint'] ?? ''));
    $client_id = trim((string) ($_POST['client_id'] ?? ''));
    $client_email = trim((string) ($_POST['client_email'] ?? ''));
    $app_order = isset($_POST['app_order']) ? (int) $_POST['app_order'] : 0;
    $icon_url = trim((string) ($_POST['icon_url'] ?? ''));
    $landscapeSupport = isset($_POST['landscapeSupport']) ? (int) $_POST['landscapeSupport'] : 0;
    $status = isset($_POST['status']) ? (int) $_POST['status'] : 4;
    $log_level = isset($_POST['log_level']) ? (int) $_POST['log_level'] : 0;
    $server_folder = trim((string) ($_POST['server_folder'] ?? ''));
    $auth_account = trim((string) ($_POST['auth_account'] ?? ''));
    $nav_param = trim((string) ($_POST['nav_param'] ?? ''));

    if ($package_name === '' || $db_name === '' || $name === '' || $theme_color === '' || $os === '') {
        send_json([
            'success' => false,
            'error_msg' => 'Required parameters are missing!'
        ], 400);
    }

    $release_date = $release_date !== '' ? substr($release_date, 0, 10) : '0000-00-00';
    $app_id = $app_id !== '' ? $app_id : null;
    $url = $url !== '' ? $url : '';
    $private_key = $private_key !== '' ? $private_key : null;
    $endpoint = $endpoint !== '' ? $endpoint : null;
    $client_id = $client_id !== '' ? $client_id : null;
    $client_email = $client_email !== '' ? $client_email : '';
    $icon_url = $icon_url !== '' ? $icon_url : null;
    $server_folder = $server_folder !== '' ? $server_folder : null;
    $auth_account = $auth_account !== '' ? $auth_account : null;
    $nav_param = $nav_param !== '' ? $nav_param : null;

    if ($id > 0) {
        $existing = GetAppDetailById($main_mysqli, $id);
        if ($existing === false) {
            send_json([
                'success' => false,
                'error_msg' => 'App not found'
            ], 404);
        }

        $stmt = $main_mysqli->prepare(
            'UPDATE fnd_app_details_tab
             SET package_name = ?, app_id = ?, db_name = ?, name = ?, theme_color = ?, current_ver = ?, release_date = ?, paid = ?, os = ?, url = ?, private_key = ?, endpoint = ?, client_id = ?, client_email = ?, app_order = ?, icon_url = ?, landscapeSupport = ?, status = ?, log_level = ?, server_folder = ?, auth_account = ?, nav_param = ?
             WHERE id = ?'
        );

        if (!$stmt) {
            send_json([
                'success' => false,
                'error_msg' => 'Unable to prepare update statement'
            ], 500);
        }

        $update_types = 'sssssss' . 'i' . 'ssssss' . 'i' . 's' . 'iii' . 'sss' . 'i';
        $stmt->bind_param(
            $update_types,
            $package_name,
            $app_id,
            $db_name,
            $name,
            $theme_color,
            $current_ver,
            $release_date,
            $paid,
            $os,
            $url,
            $private_key,
            $endpoint,
            $client_id,
            $client_email,
            $app_order,
            $icon_url,
            $landscapeSupport,
            $status,
            $log_level,
            $server_folder,
            $auth_account,
            $nav_param,
            $id
        );

        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            send_json([
                'success' => false,
                'error_msg' => $error !== '' ? $error : 'Unable to update app'
            ], 500);
        }

        $stmt->close();

        send_json([
            'success' => true,
            'app' => GetAppDetailById($main_mysqli, $id)
        ]);
    }

    $stmt = $main_mysqli->prepare(
        'INSERT INTO fnd_app_details_tab
            (package_name, app_id, db_name, name, theme_color, current_ver, release_date, paid, os, url, private_key, endpoint, client_id, client_email, app_order, icon_url, landscapeSupport, status, log_level, server_folder, auth_account, nav_param)
         VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        send_json([
            'success' => false,
            'error_msg' => 'Unable to prepare insert statement'
        ], 500);
    }

    $insert_types = 'sssssss' . 'i' . 'ssssss' . 'i' . 's' . 'iii' . 'sss';
    $stmt->bind_param(
        $insert_types,
        $package_name,
        $app_id,
        $db_name,
        $name,
        $theme_color,
        $current_ver,
        $release_date,
        $paid,
        $os,
        $url,
        $private_key,
        $endpoint,
        $client_id,
        $client_email,
        $app_order,
        $icon_url,
        $landscapeSupport,
        $status,
        $log_level,
        $server_folder,
        $auth_account,
        $nav_param
    );

    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        send_json([
            'success' => false,
            'error_msg' => $error !== '' ? $error : 'Unable to create app'
        ], 500);
    }

    $insert_id = $main_mysqli->insert_id;
    $stmt->close();

    send_json([
        'success' => true,
        'app' => GetAppDetailById($main_mysqli, $insert_id)
    ]);
}

function handle_delete_app($main_mysqli)
{
    $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
    if ($id <= 0) {
        send_json([
            'success' => false,
            'error_msg' => 'App id is required'
        ], 400);
    }

    $stmt = $main_mysqli->prepare('DELETE FROM fnd_app_details_tab WHERE id = ?');
    if (!$stmt) {
        send_json([
            'success' => false,
            'error_msg' => 'Unable to prepare delete statement'
        ], 500);
    }

    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        send_json([
            'success' => false,
            'error_msg' => $error !== '' ? $error : 'Unable to delete app'
        ], 500);
    }

    $stmt->close();

    send_json([
        'success' => true
    ]);
}

function handle_update_app_status($main_mysqli)
{
    $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
    $status = isset($_POST['status']) ? (int) $_POST['status'] : 4;

    if ($id <= 0) {
        send_json([
            'success' => false,
            'error_msg' => 'App id is required'
        ], 400);
    }

    $stmt = $main_mysqli->prepare('UPDATE fnd_app_details_tab SET status = ? WHERE id = ?');
    if (!$stmt) {
        send_json([
            'success' => false,
            'error_msg' => 'Unable to prepare status update statement'
        ], 500);
    }

    $stmt->bind_param('ii', $status, $id);
    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        send_json([
            'success' => false,
            'error_msg' => $error !== '' ? $error : 'Unable to update app status'
        ], 500);
    }

    $stmt->close();

    send_json([
        'success' => true
    ]);
}

function load_feature_modules()
{
    global $tag, $mysqli, $main_mysqli;

    require_once 'module/Home.php';
    require_once 'module/DashboardHandleling.php';
    require_once 'module/FeedbackHandleling.php';
    require_once 'module/AndroidAppSettingsHandleling.php';
    require_once 'module/AdsHandleling.php';
    require_once 'module/CustomAdsHandleling.php';
    require_once 'module/InAppAdsHandleling.php';
    require_once 'module/FinanceHandleling.php';
    require_once 'module/TaxHandleling.php';
    require_once 'module/GooglePlayReportsHandleling.php';
    require_once 'module/AppTrendTelemetryHandleling.php';
    require_once 'module/AppleReportsHandleling.php';
    require_once 'module/AndroidPromotionHandleling.php';
    require_once 'module/SubscriptionsHandleling.php';
    require_once 'module/UserHandleling.php';
    require_once 'module/IOSAppHandleling.php';
}

function LogAccess($mysqli, $email)
{
    UpdateRegistration($mysqli, $email);
}

function GetMaintainInfo($mysqli, $version_code)
{
    $stmt = $mysqli->prepare('SELECT under_maintain FROM fnd_app_config_tab WHERE version_code = ? LIMIT 1');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $version_code);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return isset($result[0]['under_maintain']) && (int) $result[0]['under_maintain'] === 1;
}

function root_Authorized($mysqli)
{
    return true;
}

function CheckRegistration($mysqli, $email)
{
    $firebase_token = $_POST['firebase_token'] ?? '';

    if (!AlreadyRegistered($mysqli, $email)) {
        $created = root_getDatetime();
        if (RegisterUser($mysqli, $email, $created, $firebase_token) && function_exists('OfferRegister')) {
            OfferRegister($mysqli, $email, $created);
        }

        return;
    }

    UpdateUser($mysqli, $email, $firebase_token);
}

function RegisterUser($mysqli, $email, $created, $firebase_token)
{
    $firstname = '';
    $lastname = '';
    $device = '';
    $version = '';
    $valid = 1;

    $stmt = $mysqli->prepare('INSERT INTO fnd_registration_tab (firstname, lastname, email, device, version, registered_date, valid, firebase_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ssssssis', $firstname, $lastname, $email, $device, $version, $created, $valid, $firebase_token);
    $success = $stmt->execute();
    $stmt->close();

    return $success;
}

function UpdateUser($mysqli, $email, $firebase_token)
{
    $updated = root_getDatetime();

    $stmt = $mysqli->prepare('UPDATE fnd_registration_tab SET updated_date = ?, firebase_token = ? WHERE email = ?');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('sss', $updated, $firebase_token, $email);
    $success = $stmt->execute();
    $stmt->close();

    return $success;
}

function AlreadyRegistered($mysqli, $email)
{
    $stmt = $mysqli->prepare('SELECT id FROM fnd_registration_tab WHERE email = ? LIMIT 1');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('s', $email);
    $stmt->execute();
    $stmt->store_result();
    $exists = $stmt->num_rows > 0;
    $stmt->close();

    return $exists;
}

function UpdateRegistration($mysqli, $email)
{
    $last_online = root_getDatetime();
    $version_code = isset($_POST['version_code']) ? (int) $_POST['version_code'] : 0;
    $os = $_POST['os'] ?? '0';
    $device = $_POST['device'] ?? '0';
    $installer = $_POST['installer'] ?? 'NOT SET';

    $stmt = $mysqli->prepare('UPDATE fnd_registration_tab SET last_online = ?, curr_version = ?, device = ?, version = ?, installer = ? WHERE email = ?');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('sissss', $last_online, $version_code, $device, $os, $installer, $email);
    $success = $stmt->execute();
    $stmt->close();

    return $success;
}

function UpdateFirebaseToken($mysqli, $email, $firebase_token)
{
    $stmt = $mysqli->prepare('UPDATE fnd_registration_tab SET firebase_token = ? WHERE email = ?');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ss', $firebase_token, $email);
    $success = $stmt->execute();
    $stmt->close();

    return $success;
}

function root_LogRequest($mysqli, $username, $method, $endpoint, $parameters)
{
    $db_name = $_GET['db'] ?? ($_POST['db'] ?? 'N/A');
    $tag_name = $_GET['tag'] ?? ($_POST['tag'] ?? 'N/A');

    $stmt = $mysqli->prepare('INSERT INTO fnd_history_log_tab (parameters, tag_name, db_name, user) VALUES (?, ?, ?, ?)');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ssss', $parameters, $tag_name, $db_name, $username);
    $success = $stmt->execute();
    $stmt->close();

    return $success;
}

function root_get_result($Statement)
{
    $result = [];
    $Statement->store_result();

    for ($i = 0; $i < $Statement->num_rows; $i++) {
        $metadata = $Statement->result_metadata();
        $params = [];

        while ($field = $metadata->fetch_field()) {
            $params[] =& $result[$i][$field->name];
        }

        call_user_func_array([$Statement, 'bind_result'], $params);
        $Statement->fetch();
    }

    return $result;
}

function root_getDatetime()
{
    return date('Y-m-d H:i:s', strtotime('now') + 630 * 60);
}

function root_getServertime($mysqli)
{
    $stmt = $mysqli->prepare('SELECT now() datetime FROM dual');
    if (!$stmt) {
        return false;
    }

    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return $result[0]['datetime'] ?? false;
}

function root_get_client_ip1()
{
    return root_get_client_ip2();
}

function root_get_client_ip2()
{
    $keys = [
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
        'REMOTE_ADDR'
    ];

    foreach ($keys as $key) {
        if (!empty($_SERVER[$key])) {
            return $_SERVER[$key];
        }
    }

    return 'UNKNOWN';
}

function GetReleaseInfo($mysqli, $version, $version_code)
{
    $stmt = $mysqli->prepare('SELECT MAX(version) version, MAX(version_code) version_code, SUM(mandatory) mandatory FROM fnd_app_config_tab WHERE version_code > ? LIMIT 1');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $version_code);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return $result;
}

function GetReleaseName($mysqli, $version_code)
{
    $stmt = $mysqli->prepare('SELECT name FROM fnd_app_config_tab WHERE version_code = ?');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $version_code);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return $result[0]['name'] ?? false;
}

function IsValidUser($mysqli, $email)
{
    $stmt = $mysqli->prepare('SELECT valid FROM fnd_registration_tab WHERE email = ?');
    if (!$stmt) {
        return 0;
    }

    $stmt->bind_param('s', $email);
    if (!$stmt->execute()) {
        $stmt->close();
        return 0;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return $result[0]['valid'] ?? 0;
}

function SettingEnabled($mysqli, $value)
{
    $stmt = $mysqli->prepare('SELECT int_value FROM fnd_settings_tab WHERE name = ?');
    if (!$stmt) {
        return true;
    }

    $stmt->bind_param('s', $value);
    if (!$stmt->execute()) {
        $stmt->close();
        return true;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return !isset($result[0]['int_value']) || (int) $result[0]['int_value'] === 1;
}

function IsValidInstaller($mysqli, $installer)
{
    $stmt = $mysqli->prepare('SELECT 1 FROM fnd_installer_tab WHERE name = ? AND valid = 1');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('s', $installer);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return !empty($result);
}

function GetAppInfo($mysqli)
{
    $stmt = $mysqli->prepare('SELECT id, name, icon_url, app_order FROM fnd_app_details_tab WHERE id != 0 ORDER BY app_order ASC');
    if (!$stmt) {
        return false;
    }

    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return $result;
}

function GetAppSecuredInfo($mysqli, $db)
{
    $stmt = $mysqli->prepare('SELECT id, name, private_key, endpoint, client_id, client_email FROM fnd_app_details_tab WHERE id = ?');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $db);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return $result;
}

function GetAppDetails($mysqli)
{
    $stmt = $mysqli->prepare(
        'SELECT id, package_name, app_id, db_name, name, theme_color, current_ver, release_date, paid, os, url, private_key, endpoint, client_id, client_email, app_order, icon_url, landscapeSupport, status, log_level, server_folder, auth_account, nav_param
         FROM fnd_app_details_tab
         WHERE id NOT IN (0, 100)
         ORDER BY app_order ASC, id ASC'
    );

    if (!$stmt) {
        return false;
    }

    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return array_map('normalize_app_row', $result);
}

function GetAppDetailById($mysqli, $id)
{
    if (is_reserved_app_id($id)) {
        return false;
    }

    $stmt = $mysqli->prepare(
        'SELECT id, package_name, app_id, db_name, name, theme_color, current_ver, release_date, paid, os, url, private_key, endpoint, client_id, client_email, app_order, icon_url, landscapeSupport, status, log_level, server_folder, auth_account, nav_param
         FROM fnd_app_details_tab
         WHERE id = ?
         LIMIT 1'
    );

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    if (empty($result)) {
        return false;
    }

    return normalize_app_row($result[0]);
}

function root_get_app_row_for_request($mysqli, $id)
{
    if (is_reserved_app_id($id)) {
        return false;
    }

    $stmt = $mysqli->prepare(
        'SELECT id, package_name, app_id, db_name, name, theme_color, current_ver, release_date, paid, os, url, private_key, endpoint, client_id, client_email, app_order, icon_url, landscapeSupport, status, log_level, server_folder, auth_account, nav_param
         FROM fnd_app_details_tab
         WHERE id = ? AND status IN (1, 2)
         LIMIT 1'
    );

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = root_get_result($stmt);
    $stmt->close();

    if (empty($result)) {
        return false;
    }

    return normalize_app_row($result[0]);
}

function root_get_app_rows_for_request($mysqli, $ids)
{
    $clean_ids = [];
    foreach ($ids as $id) {
        $id = (int) $id;
        if ($id > 0 && !is_reserved_app_id($id)) {
            $clean_ids[$id] = $id;
        }
    }

    if (empty($clean_ids)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($clean_ids), '?'));
    $types = str_repeat('i', count($clean_ids));
    $values = array_values($clean_ids);

    $stmt = $mysqli->prepare(
        "SELECT id, package_name, app_id, db_name, name, theme_color, current_ver, release_date, paid, os, url, private_key, endpoint, client_id, client_email, app_order, icon_url, landscapeSupport, status, log_level, server_folder, auth_account, nav_param
         FROM fnd_app_details_tab
         WHERE id IN ($placeholders) AND status IN (1, 2)
         ORDER BY app_order ASC, id ASC"
    );

    if (!$stmt) {
        return [];
    }

    $stmt->bind_param($types, ...$values);
    if (!$stmt->execute()) {
        $stmt->close();
        return [];
    }

    $result = root_get_result($stmt);
    $stmt->close();

    return array_map('normalize_app_row', $result);
}

function is_reserved_app_id($id)
{
    return in_array((int) $id, [0, 100], true);
}

function normalize_app_row($row)
{
    $status_map = [
        0 => 'Developing',
        1 => 'Testing',
        2 => 'Live',
        3 => 'Unpublished',
        4 => 'Skip',
    ];

    $status = isset($row['status']) ? (int) $row['status'] : 4;
    $current_version = trim((string) ($row['current_ver'] ?? ''));
    $release_date = trim((string) ($row['release_date'] ?? ''));
    $icon_url = trim((string) ($row['icon_url'] ?? ''));
    $name = trim((string) ($row['name'] ?? ''));
    $package_name = trim((string) ($row['package_name'] ?? ''));
    $db_name = trim((string) ($row['db_name'] ?? ''));
    $os = trim((string) ($row['os'] ?? ''));

    return [
        'id' => (string) ($row['id'] ?? ''),
        'package_name' => $package_name,
        'app_id' => trim((string) ($row['app_id'] ?? '')),
        'db_name' => $db_name,
        'name' => $name,
        'theme_color' => trim((string) ($row['theme_color'] ?? '')),
        'current_ver' => $current_version,
        'release_date' => $release_date,
        'paid' => (int) ($row['paid'] ?? 0),
        'os' => $os,
        'url' => trim((string) ($row['url'] ?? '')),
        'private_key' => trim((string) ($row['private_key'] ?? '')),
        'endpoint' => trim((string) ($row['endpoint'] ?? '')),
        'client_id' => trim((string) ($row['client_id'] ?? '')),
        'client_email' => trim((string) ($row['client_email'] ?? '')),
        'app_order' => (int) ($row['app_order'] ?? 0),
        'icon_url' => $icon_url !== '' ? $icon_url : 'https://placehold.co/128x128.png',
        'landscapeSupport' => (int) ($row['landscapeSupport'] ?? 0) === 1,
        'status' => $status,
        'status_label' => $status_map[$status] ?? 'Unknown',
        'isActive' => $status !== 4,
        'log_level' => (int) ($row['log_level'] ?? 0),
        'server_folder' => trim((string) ($row['server_folder'] ?? '')),
        'auth_account' => trim((string) ($row['auth_account'] ?? '')),
        'nav_param' => trim((string) ($row['nav_param'] ?? '')),
    ];
}

?>
