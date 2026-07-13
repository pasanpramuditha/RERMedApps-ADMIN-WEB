<?php

// Fill these values before adding this file to cron or opening it from browser.
const DB_HOST = '';
const DB_USER = '';
const DB_PASSWORD = '';
const DB_NAME = '';
const DB_PORT = 3306;

require_once __DIR__ . '/report_cron_history.php';

main($argv ?? []);

function main(array $argv): void
{
    $cronHistoryStartedAt = report_cron_history_now();
    $mysqli = null;
    $type = 'all';
    $mode = 'since_last_saved_date';

    try {
        $args = PHP_SAPI === 'cli' ? parse_cli_args($argv) : $_GET;
        $type = strtolower((string)($args['type'] ?? 'all'));
        if (!in_array($type, ['all', 'sales', 'install', 'subscription'], true)) {
            throw new Exception('Invalid type. Use all, sales, install, or subscription.');
        }

        $monthArg = $args['month'] ?? null;
        $monthOverrideDays = report_days_arg($monthArg);
        $mode = $monthOverrideDays === null ? 'since_last_saved_date' : 'month_override';
        $mysqli = db();
        $settings = load_apple_settings($mysqli);
        $token = apple_api_token($settings);

        $result = [
            'success' => true,
            'platform' => 'apple',
            'type' => $type,
            'mode' => $mode,
            'reports' => [],
            'warnings' => [],
        ];

        if ($type === 'all' || $type === 'sales') {
            $warnings = [];
            $reportDays = $monthOverrideDays ?? report_days_from_last_saved_date($mysqli, 'fnd_apple_sales_daily_reports');
            $reportRange = report_range_label($reportDays);
            $report = fetch_apple_sales_days($token, $settings['vendor_number'], $reportDays, $reportRange, $warnings);
            $result['reports']['sales'] = $report === null
                ? skipped_report('Apple sales reports are not available yet')
                : save_apple_sales_report($mysqli, $report);
            $result['reports']['sales']['report_range'] = $reportRange;
            $result['reports']['sales']['report_days'] = $reportDays;
            $result['warnings']['sales'] = $warnings;
        }

        if ($type === 'all' || $type === 'install') {
            $warnings = [];
            $reportDays = $monthOverrideDays ?? report_days_from_last_saved_date($mysqli, 'fnd_apple_install_daily_reports');
            $reportRange = report_range_label($reportDays);
            $report = fetch_apple_install_days($token, $settings['vendor_number'], $reportDays, $reportRange, $warnings);
            $result['reports']['install'] = $report === null
                ? skipped_report('Apple install reports are not available yet')
                : save_apple_install_report($mysqli, $report);
            $result['reports']['install']['report_range'] = $reportRange;
            $result['reports']['install']['report_days'] = $reportDays;
            $result['warnings']['install'] = $warnings;
        }

        if ($type === 'all' || $type === 'subscription') {
            $warnings = [];
            $reportDays = $monthOverrideDays ?? report_days_from_last_saved_date($mysqli, 'fnd_apple_subscription_daily_reports');
            $reportRange = report_range_label($reportDays);
            $report = fetch_apple_subscription_days($token, $settings['vendor_number'], $reportDays, $reportRange, $warnings);
            $result['reports']['subscription'] = $report === null
                ? skipped_report('Apple subscription reports are not available yet')
                : save_apple_subscription_report($mysqli, $report);
            $result['reports']['subscription']['report_range'] = $reportRange;
            $result['reports']['subscription']['report_days'] = $reportDays;
            $result['warnings']['subscription'] = $warnings;
        }

        $stats = report_cron_history_payload_stats($result);
        report_cron_history_record($mysqli, [
            'job_key' => 'sync_apple_reports_standalone',
            'job_name' => 'Apple Reports Sync',
            'platform' => 'apple',
            'report_type' => $type,
            'status' => 'success',
            'mode' => $mode,
            'started_at' => $cronHistoryStartedAt,
            'finished_at' => report_cron_history_now(),
            'rows_saved' => $stats['rows_saved'],
            'report_range' => $stats['report_range'],
            'summary' => $result,
        ]);
        send_output($result);
    } catch (Throwable $error) {
        $payload = ['success' => false, 'error_msg' => $error->getMessage()];

        if ($mysqli instanceof mysqli) {
            report_cron_history_record($mysqli, [
                'job_key' => 'sync_apple_reports_standalone',
                'job_name' => 'Apple Reports Sync',
                'platform' => 'apple',
                'report_type' => $type,
                'status' => 'failed',
                'mode' => $mode,
                'started_at' => $cronHistoryStartedAt,
                'finished_at' => report_cron_history_now(),
                'rows_saved' => 0,
                'error_message' => $error->getMessage(),
                'summary' => $payload,
            ]);
        }

        send_output($payload, 500);
        exit(1);
    }
}

function db(): mysqli
{
    $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT);
    if ($mysqli->connect_error) {
        throw new Exception('Database connection failed: ' . $mysqli->connect_error);
    }

    $mysqli->set_charset('utf8mb4');
    return $mysqli;
}

function parse_cli_args(array $argv): array
{
    $args = [];
    foreach (array_slice($argv, 1) as $arg) {
        if (strpos($arg, '--') !== 0) {
            continue;
        }

        $parts = explode('=', substr($arg, 2), 2);
        $args[$parts[0]] = $parts[1] ?? '1';
    }

    return $args;
}

function send_output(array $payload, int $statusCode = 200): void
{
    if (PHP_SAPI !== 'cli') {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
    }

    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        $json = '{"success":false,"error_msg":"Failed to encode response JSON."}';
    }

    if (PHP_SAPI === 'cli' && $statusCode >= 400) {
        fwrite(STDERR, $json . PHP_EOL);
        return;
    }

    echo $json . PHP_EOL;
}

function report_days_arg($month): ?array
{
    $month = trim((string)$month);
    if ($month !== '') {
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            throw new Exception('Invalid month. Use YYYY-MM.');
        }

        return days_in_month($month);
    }

    return null;
}

function report_range_label(array $days): string
{
    if (empty($days)) {
        return '';
    }

    return count($days) === 1 ? $days[0] : $days[0] . '..' . $days[count($days) - 1];
}

function load_apple_settings(mysqli $mysqli): array
{
    $keys = [
        'app_store_connect_api_key_id',
        'app_store_connect_api_issuer_id',
        'app_store_connect_api_private_key',
        'app_store_connect_vendor_number',
    ];

    $placeholders = implode(',', array_fill(0, count($keys), '?'));
    $stmt = $mysqli->prepare("
        SELECT app_param, string_value
        FROM fnd_admin_global_settings_tab
        WHERE valid = 1 AND app_param IN ({$placeholders})
    ");
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to load Apple settings.');
    }

    $stmt->bind_param(str_repeat('s', count($keys)), ...$keys);
    execute_stmt($stmt, $mysqli);
    $result = $stmt->get_result();
    $settings = [];
    while ($row = $result->fetch_assoc()) {
        $settings[$row['app_param']] = trim((string)$row['string_value']);
    }
    $stmt->close();

    $mapped = [
        'key_id' => $settings['app_store_connect_api_key_id'] ?? '',
        'issuer_id' => $settings['app_store_connect_api_issuer_id'] ?? '',
        'private_key' => $settings['app_store_connect_api_private_key'] ?? '',
        'vendor_number' => $settings['app_store_connect_vendor_number'] ?? '',
    ];

    foreach ($mapped as $name => $value) {
        if ($value === '') {
            throw new Exception("Missing App Store Connect setting: {$name}");
        }
    }

    return $mapped;
}

function apple_api_token(array $settings): string
{
    $now = time();
    $header = base64url_json([
        'alg' => 'ES256',
        'kid' => $settings['key_id'],
        'typ' => 'JWT',
    ]);
    $claims = base64url_json([
        'iss' => $settings['issuer_id'],
        'iat' => $now,
        'exp' => $now + 15 * 60,
        'aud' => 'appstoreconnect-v1',
    ]);

    $unsigned = "{$header}.{$claims}";
    $privateKey = str_replace('\\n', "\n", $settings['private_key']);
    $signature = '';
    if (!openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
        throw new Exception('Failed to sign App Store Connect JWT.');
    }

    return "{$unsigned}." . base64url(ecdsa_der_to_jose($signature, 64));
}

function fetch_apple_sales_days(string $token, string $vendorNumber, array $days, string $reportRange, array &$warnings): ?array
{
    $rows = [];
    foreach ($days as $day) {
        $csv = fetch_apple_report($token, $vendorNumber, 'SALES', 'SUMMARY', '1_0', $day, $warnings);
        if ($csv === null) {
            continue;
        }

        $rows = array_merge($rows, parse_apple_sales_csv($csv, $day));
    }

    if (empty($rows)) {
        return null;
    }

    return ['reportDate' => $reportRange, 'days' => group_apple_sales_rows($rows)];
}

function fetch_apple_install_days(string $token, string $vendorNumber, array $days, string $reportRange, array &$warnings): ?array
{
    $rows = [];
    foreach ($days as $day) {
        $csv = fetch_apple_report($token, $vendorNumber, 'SALES', 'SUMMARY', '1_0', $day, $warnings);
        if ($csv === null) {
            continue;
        }

        $rows = array_merge($rows, parse_apple_install_csv($csv, $day));
    }

    if (empty($rows)) {
        return null;
    }

    return ['reportDate' => $reportRange, 'days' => group_apple_install_rows($rows)];
}

function fetch_apple_subscription_days(string $token, string $vendorNumber, array $days, string $reportRange, array &$warnings): ?array
{
    $rows = [];
    foreach ($days as $day) {
        $csv = fetch_apple_report($token, $vendorNumber, 'SUBSCRIPTION', 'SUMMARY', '1_4', $day, $warnings);
        if ($csv === null) {
            continue;
        }

        $rows = array_merge($rows, parse_apple_subscription_csv($csv, $day));
    }

    if (empty($rows)) {
        return null;
    }

    return ['reportDate' => $reportRange, 'days' => group_apple_subscription_rows($rows)];
}

function fetch_apple_report(string $token, string $vendorNumber, string $reportType, string $reportSubType, string $version, string $date, array &$warnings): ?string
{
    $query = http_build_query([
        'filter[frequency]' => 'DAILY',
        'filter[reportDate]' => $date,
        'filter[reportType]' => $reportType,
        'filter[reportSubType]' => $reportSubType,
        'filter[vendorNumber]' => $vendorNumber,
        'filter[version]' => $version,
    ]);

    $url = "https://api.appstoreconnect.apple.com/v1/salesReports?{$query}";
    $headers = [
        'Authorization: Bearer ' . $token,
        'Accept: application/a-gzip',
        'User-Agent: RERMedAdminReports/1.0',
    ];

    $response = null;
    for ($attempt = 1; $attempt <= 2; $attempt++) {
        $response = http_request($url, $headers, null, true);
        if ($response['status'] < 500) {
            break;
        }

        if ($attempt < 2) {
            sleep($attempt);
        }
    }

    if ($response === null) {
        throw new Exception("Apple API request failed for {$reportType} {$date}: empty response.");
    }

    if ($response['status'] >= 500) {
        $warnings[] = [
            'date' => $date,
            'report_type' => $reportType,
            'status' => $response['status'],
            'reason' => 'Apple API server error after retries; this day was not saved and should be retried by the next cron run.',
        ];
        return null;
    }

    if ($response['status'] === 404 || $response['status'] === 410) {
        return null;
    }

    if ($response['status'] >= 400) {
        $body = substr($response['body'], 0, 500);
        if (preg_match('/no\s+reports?|not\s+found|not\s+available/i', $body)) {
            return null;
        }
        throw new Exception("Apple API request failed for {$reportType} {$date} ({$response['status']}): {$body}");
    }

    $decoded = gzdecode($response['body']);
    if ($decoded === false) {
        throw new Exception('Failed to unzip Apple report response.');
    }

    return $decoded;
}

function http_request(string $url, array $headers, ?string $body = null, bool $returnStatus = false): array
{
    $ch = curl_init($url);
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 180,
    ];
    if ($body !== null) {
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $options);
    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new Exception('HTTP request failed: ' . $error);
    }
    if (!$returnStatus && $status >= 400) {
        throw new Exception("HTTP request failed ({$status}): " . substr((string)$response, 0, 500));
    }

    return ['status' => $status, 'body' => (string)$response];
}

function days_in_month(string $reportMonth): array
{
    [$year, $month] = array_map('intval', explode('-', $reportMonth));
    $dayCount = (int)(new DateTimeImmutable("{$reportMonth}-01"))->format('t');
    $days = [];
    for ($day = 1; $day <= $dayCount; $day++) {
        $days[] = sprintf('%04d-%02d-%02d', $year, $month, $day);
    }

    return $days;
}

function report_days_from_last_saved_date(mysqli $mysqli, string $tableName): array
{
    $allowedTables = [
        'fnd_apple_sales_daily_reports',
        'fnd_apple_install_daily_reports',
        'fnd_apple_subscription_daily_reports',
    ];
    if (!in_array($tableName, $allowedTables, true)) {
        throw new Exception('Invalid Apple report table.');
    }

    $today = new DateTimeImmutable('today');
    $start = new DateTimeImmutable($today->format('Y-m') . '-01');

    $result = $mysqli->query("SELECT MAX(report_date) AS last_date FROM {$tableName}");
    if (!$result) {
        throw new Exception($mysqli->error ?: 'Unable to read last Apple report date.');
    }

    $row = $result->fetch_assoc();
    $result->free();
    $lastDate = report_date($row['last_date'] ?? '');
    if ($lastDate !== null) {
        $lastSaved = new DateTimeImmutable($lastDate);
        if ($lastSaved <= $today) {
            $start = $lastSaved;
        }
    }

    return days_between($start, $today);
}

function days_between(DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $days = [];

    for ($date = $start; $date <= $end; $date = $date->modify('+1 day')) {
        $days[] = $date->format('Y-m-d');
    }

    return $days;
}

function parse_apple_sales_csv(string $csv, string $fallbackDate): array
{
    $rows = csv_assoc_rows($csv, "\t");
    $items = [];
    foreach ($rows as $row) {
        $proceeds = number_value($row['Developer Proceeds'] ?? 0);
        if ($proceeds <= 0) {
            continue;
        }

        $currency = (string)($row['Customer Currency'] ?? 'USD');
        $price = number_value($row['Customer Price'] ?? 0);
        $items[] = [
            'sku' => (string)($row['SKU'] ?? ''),
            'appleIdentifier' => (string)($row['Apple Identifier'] ?? ''),
            'beginDate' => (string)($row['Begin Date'] ?? $fallbackDate),
            'units' => int_value($row['Units'] ?? 0),
            'customerPriceUSD' => convert_to_usd($price, $currency),
            'developerProceedsUSD' => convert_to_usd($proceeds, $currency),
        ];
    }

    return $items;
}

function parse_apple_install_csv(string $csv, string $fallbackDate): array
{
    $rows = csv_assoc_rows($csv, "\t");
    $grouped = [];
    foreach ($rows as $row) {
        $date = (string)($row['Begin Date'] ?? $fallbackDate);
        $name = (string)($row['Title'] ?? '');
        $type = (string)($row['Product Type Identifier'] ?? '');
        $appleId = (string)($row['Apple Identifier'] ?? '');
        $units = int_value($row['Units'] ?? 0);
        if ($name === '' || $units <= 0 || !in_array($type, ['1', '1F'], true)) {
            continue;
        }

        $key = "{$date}::{$name}::{$appleId}";
        if (!isset($grouped[$key])) {
            $grouped[$key] = ['date' => $date, 'name' => $name, 'appleId' => $appleId, 'units' => 0];
        }
        $grouped[$key]['units'] += $units;
    }

    return array_values($grouped);
}

function parse_apple_subscription_csv(string $csv, string $fallbackDate): array
{
    $rows = csv_assoc_rows($csv, "\t");
    $items = [];
    foreach ($rows as $row) {
        $items[] = [
            'date' => (string)($row['Begin Date'] ?? $fallbackDate),
            'appAppleId' => (string)($row['App Apple ID'] ?? ''),
            'subscriptionAppleId' => (string)($row['Subscription Apple ID'] ?? ''),
            'subscriptionName' => (string)($row['Subscription Name'] ?? ''),
            'standardSubscriptionDuration' => (string)($row['Standard Subscription Duration'] ?? ''),
            'activeStandardPriceSubscriptions' => int_value($row['Active Standard Price Subscriptions'] ?? 0),
            'activeFreeTrialIntroductoryOfferSubscriptions' => int_value($row['Active Free Trial Introductory Offer Subscriptions'] ?? 0),
        ];
    }

    return $items;
}

function group_apple_sales_rows(array $rows): array
{
    $days = [];
    foreach ($rows as $row) {
        $date = report_date($row['beginDate'] ?? '');
        if ($date === null) {
            continue;
        }
        if (!isset($days[$date])) {
            $days[$date] = ['date' => $date, 'itemCount' => 0, 'totalSalesUSD' => 0.0, 'totalProceedsUSD' => 0.0, 'items' => []];
        }
        $sales = (float)($row['customerPriceUSD'] ?? 0) * int_value($row['units'] ?? 0);
        $proceeds = (float)($row['developerProceedsUSD'] ?? 0);
        $days[$date]['totalSalesUSD'] += $sales;
        $days[$date]['totalProceedsUSD'] += $proceeds;
        $days[$date]['items'][] = [
            'sku' => (string)($row['sku'] ?? ''),
            'appleIdentifier' => (string)($row['appleIdentifier'] ?? ''),
            'salesUSD' => round($sales, 2),
            'proceedsUSD' => round($proceeds, 2),
        ];
    }
    ksort($days);
    foreach ($days as &$day) {
        $day['itemCount'] = count($day['items']);
        $day['totalSalesUSD'] = round($day['totalSalesUSD'], 2);
        $day['totalProceedsUSD'] = round($day['totalProceedsUSD'], 2);
    }

    return array_values($days);
}

function group_apple_install_rows(array $rows): array
{
    $days = [];
    foreach ($rows as $row) {
        $date = report_date($row['date'] ?? '');
        if ($date === null) {
            continue;
        }
        if (!isset($days[$date])) {
            $days[$date] = ['date' => $date, 'itemCount' => 0, 'totalUnits' => 0, 'items' => []];
        }
        $units = int_value($row['units'] ?? 0);
        $days[$date]['totalUnits'] += $units;
        $days[$date]['items'][] = ['appleId' => (string)($row['appleId'] ?? ''), 'units' => $units];
    }
    ksort($days);
    foreach ($days as &$day) {
        $day['itemCount'] = count($day['items']);
    }

    return array_values($days);
}

function group_apple_subscription_rows(array $rows): array
{
    $grouped = [];
    foreach ($rows as $row) {
        $date = report_date($row['date'] ?? '');
        $subId = (string)($row['subscriptionAppleId'] ?? '');
        $name = (string)($row['subscriptionName'] ?? '');
        if ($date === null || ($subId === '' && $name === '')) {
            continue;
        }
        $key = $date . '::' . (string)($row['appAppleId'] ?? '') . '::' . ($subId ?: $name);
        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'date' => $date,
                'appAppleId' => (string)($row['appAppleId'] ?? ''),
                'subscriptionAppleId' => $subId,
                'subscriptionName' => $name,
                'standardSubscriptionDuration' => (string)($row['standardSubscriptionDuration'] ?? ''),
                'activeSubs' => 0,
                'activeFreeTrialIntroductoryOfferSubscriptions' => 0,
            ];
        }
        if ($grouped[$key]['standardSubscriptionDuration'] === '') {
            $grouped[$key]['standardSubscriptionDuration'] = (string)($row['standardSubscriptionDuration'] ?? '');
        }
        $grouped[$key]['activeSubs'] += int_value($row['activeStandardPriceSubscriptions'] ?? 0);
        $grouped[$key]['activeFreeTrialIntroductoryOfferSubscriptions'] += int_value($row['activeFreeTrialIntroductoryOfferSubscriptions'] ?? 0);
    }

    $days = [];
    foreach ($grouped as $item) {
        $date = $item['date'];
        if (!isset($days[$date])) {
            $days[$date] = ['date' => $date, 'itemCount' => 0, 'totalActiveSubs' => 0, 'items' => []];
        }
        $days[$date]['totalActiveSubs'] += $item['activeSubs'];
        $days[$date]['items'][] = [
            'appAppleId' => $item['appAppleId'],
            'subscriptionAppleId' => $item['subscriptionAppleId'],
            'subscriptionName' => $item['subscriptionName'],
            'standardSubscriptionDuration' => $item['standardSubscriptionDuration'],
            'activeSubs' => $item['activeSubs'],
            'activeFreeTrialIntroductoryOfferSubscriptions' => $item['activeFreeTrialIntroductoryOfferSubscriptions'],
        ];
    }
    ksort($days);
    foreach ($days as &$day) {
        $day['itemCount'] = count($day['items']);
    }

    return array_values($days);
}

function save_apple_sales_report(mysqli $mysqli, array $report): array
{
    valid_report_days($report);
    $stmt = $mysqli->prepare(
        'INSERT IGNORE INTO fnd_apple_sales_daily_reports
            (report_month, report_date, item_count, total_sales_usd, total_proceeds_usd, items_json)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare Apple sales insert.');
    }

    $savedDays = 0;
    $skippedDays = 0;
    foreach ($report['days'] as $day) {
        $date = report_date($day['date'] ?? '');
        if ($date === null) {
            continue;
        }
        $reportMonth = substr($date, 0, 7);
        $itemCount = (int)($day['itemCount'] ?? count($day['items'] ?? []));
        $sales = (float)($day['totalSalesUSD'] ?? 0);
        $proceeds = (float)($day['totalProceedsUSD'] ?? 0);
        $json = encode_json($day['items'] ?? []);
        $stmt->bind_param('ssidds', $reportMonth, $date, $itemCount, $sales, $proceeds, $json);
        execute_stmt($stmt, $mysqli);
        $stmt->affected_rows > 0 ? $savedDays++ : $skippedDays++;
    }
    $stmt->close();

    return ['success' => true, 'saved_days' => $savedDays, 'skipped_existing_days' => $skippedDays];
}

function save_apple_install_report(mysqli $mysqli, array $report): array
{
    valid_report_days($report);
    $stmt = $mysqli->prepare(
        'INSERT IGNORE INTO fnd_apple_install_daily_reports
            (report_month, report_date, item_count, total_units, items_json)
         VALUES (?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare Apple install insert.');
    }

    $savedDays = 0;
    $skippedDays = 0;
    foreach ($report['days'] as $day) {
        $date = report_date($day['date'] ?? '');
        if ($date === null) {
            continue;
        }
        $reportMonth = substr($date, 0, 7);
        $itemCount = (int)($day['itemCount'] ?? count($day['items'] ?? []));
        $units = (int)($day['totalUnits'] ?? 0);
        $json = encode_json($day['items'] ?? []);
        $stmt->bind_param('ssiis', $reportMonth, $date, $itemCount, $units, $json);
        execute_stmt($stmt, $mysqli);
        $stmt->affected_rows > 0 ? $savedDays++ : $skippedDays++;
    }
    $stmt->close();

    return ['success' => true, 'saved_days' => $savedDays, 'skipped_existing_days' => $skippedDays];
}

function save_apple_subscription_report(mysqli $mysqli, array $report): array
{
    valid_report_days($report);
    $stmt = $mysqli->prepare(
        'INSERT IGNORE INTO fnd_apple_subscription_daily_reports
            (report_month, report_date, item_count, total_active_subs, items_json)
         VALUES (?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare Apple subscription insert.');
    }

    $savedDays = 0;
    $skippedDays = 0;
    foreach ($report['days'] as $day) {
        $date = report_date($day['date'] ?? '');
        if ($date === null) {
            continue;
        }
        $reportMonth = substr($date, 0, 7);
        $itemCount = (int)($day['itemCount'] ?? count($day['items'] ?? []));
        $active = (int)($day['totalActiveSubs'] ?? 0);
        $json = encode_json($day['items'] ?? []);
        $stmt->bind_param('ssiis', $reportMonth, $date, $itemCount, $active, $json);
        execute_stmt($stmt, $mysqli);
        $stmt->affected_rows > 0 ? $savedDays++ : $skippedDays++;
    }
    $stmt->close();

    return ['success' => true, 'saved_days' => $savedDays, 'skipped_existing_days' => $skippedDays];
}

function valid_report_days(array $report): void
{
    if (!is_array($report['days'] ?? null)) {
        throw new Exception('Report requires days array.');
    }
}

function skipped_report(string $reason): array
{
    return ['success' => true, 'skipped' => true, 'reason' => $reason];
}

function execute_stmt(mysqli_stmt $stmt, mysqli $mysqli): void
{
    if (!$stmt->execute()) {
        throw new Exception($stmt->error ?: $mysqli->error);
    }
}

function csv_assoc_rows(string $csv, string $delimiter): array
{
    $csv = remove_bom(str_replace(["\r\n", "\r"], "\n", trim($csv)));
    if ($csv === '') {
        return [];
    }

    $lines = explode("\n", $csv);
    $headers = str_getcsv(array_shift($lines), $delimiter);
    $headers = array_map('trim', $headers);
    $rows = [];
    foreach ($lines as $line) {
        if (trim($line) === '') {
            continue;
        }
        $values = str_getcsv($line, $delimiter);
        $row = [];
        foreach ($headers as $index => $header) {
            if ($header !== '') {
                $row[$header] = $values[$index] ?? '';
            }
        }
        $rows[] = $row;
    }

    return $rows;
}

function report_date($value): ?string
{
    $value = trim((string)$value);
    if ($value === '') {
        return null;
    }
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return $value;
    }
    $timestamp = strtotime($value);
    return $timestamp === false ? null : date('Y-m-d', $timestamp);
}

function convert_to_usd(float $amount, string $currency): float
{
    $currency = strtoupper(trim($currency));
    if ($currency === '' || $currency === 'USD') {
        return $amount;
    }

    static $rates = null;
    if ($rates === null) {
        $rates = ['USD' => 1.0, 'LKR' => 300.0];
        try {
            $response = http_request('https://open.er-api.com/v6/latest/USD', [], null, true);
            if ($response['status'] < 400) {
                $payload = json_decode($response['body'], true);
                if (is_array($payload['rates'] ?? null)) {
                    $rates = array_map('floatval', $payload['rates']);
                }
            }
        } catch (Throwable $error) {
            // Keep fallback rates.
        }
    }

    $rate = $rates[$currency] ?? null;
    return $rate ? $amount / $rate : $amount;
}

function remove_bom(string $text): string
{
    return substr($text, 0, 3) === "\xEF\xBB\xBF" ? substr($text, 3) : $text;
}

function number_value($value): float
{
    $value = str_replace(',', '', (string)$value);
    return is_numeric($value) ? (float)$value : 0.0;
}

function int_value($value): int
{
    $value = str_replace(',', '', (string)$value);
    return is_numeric($value) ? (int)$value : 0;
}

function encode_json(array $value): string
{
    $json = json_encode(array_values($value), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        throw new Exception('Failed to encode report JSON.');
    }

    return $json;
}

function base64url_json(array $value): string
{
    $json = json_encode($value, JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new Exception('Failed to encode JWT JSON.');
    }

    return base64url($json);
}

function base64url(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function ecdsa_der_to_jose(string $der, int $partLength): string
{
    $offset = 0;
    if (ord($der[$offset++]) !== 0x30) {
        throw new Exception('Invalid ECDSA DER signature.');
    }

    $sequenceLength = der_read_length($der, $offset);
    if ($sequenceLength <= 0) {
        throw new Exception('Invalid ECDSA DER sequence length.');
    }

    $r = der_read_integer($der, $offset);
    $s = der_read_integer($der, $offset);
    $half = intdiv($partLength, 2);

    return str_pad(ltrim($r, "\x00"), $half, "\x00", STR_PAD_LEFT)
        . str_pad(ltrim($s, "\x00"), $half, "\x00", STR_PAD_LEFT);
}

function der_read_length(string $der, int &$offset): int
{
    $length = ord($der[$offset++]);
    if ($length < 0x80) {
        return $length;
    }

    $bytes = $length & 0x7f;
    $length = 0;
    for ($i = 0; $i < $bytes; $i++) {
        $length = ($length << 8) | ord($der[$offset++]);
    }

    return $length;
}

function der_read_integer(string $der, int &$offset): string
{
    if (ord($der[$offset++]) !== 0x02) {
        throw new Exception('Invalid ECDSA DER integer.');
    }

    $length = der_read_length($der, $offset);
    $value = substr($der, $offset, $length);
    $offset += $length;
    return $value;
}

?>
