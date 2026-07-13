<?php

require_once dirname(__DIR__) . '/include/db_connect.php';
require_once dirname(__DIR__) . '/include/functions.php';

date_default_timezone_set('Asia/Colombo');

// Fill these only if the server cannot provide environment variables.
// Environment variables still take priority when they exist.
const ADMOB_CLIENT_ID_FALLBACK = '';
const ADMOB_CLIENT_SECRET_FALLBACK = '';
const ADMOB_REFRESH_TOKEN_FALLBACK = '';
const ADMOB_PUBLISHER_ID_FALLBACK = 'pub-xxxxxxxxxxxxxxxx';

function admob_standalone_json_response(array $payload, int $statusCode = 200): void
{
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
    }

    echo json_encode($payload, JSON_PRETTY_PRINT) . PHP_EOL;
    exit($statusCode >= 400 ? 1 : 0);
}

function admob_standalone_db(): mysqli
{
    $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT);
    if ($mysqli->connect_error) {
        throw new Exception('Database connection failed: ' . $mysqli->connect_error);
    }

    $mysqli->set_charset('utf8mb4');
    return $mysqli;
}

function admob_standalone_request(string $url, array $options = []): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => true,
    ]);

    if (!empty($options['headers'])) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $options['headers']);
    }

    if (!empty($options['post'])) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $options['post']);
    }

    $body = curl_exec($ch);
    $error = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false) {
        throw new Exception($error ?: 'cURL request failed');
    }

    return ['status' => $status, 'body' => $body];
}

function admob_standalone_access_token(): string
{
    if (ADMOB_CLIENT_ID === '' || ADMOB_CLIENT_SECRET === '' || ADMOB_REFRESH_TOKEN === '') {
        throw new Exception('ADMOB_CLIENT_ID, ADMOB_CLIENT_SECRET, and ADMOB_REFRESH_TOKEN must be filled in this file.');
    }

    $response = admob_standalone_request('https://oauth2.googleapis.com/token', [
        'post' => http_build_query([
            'client_id' => ADMOB_CLIENT_ID,
            'client_secret' => ADMOB_CLIENT_SECRET,
            'refresh_token' => ADMOB_REFRESH_TOKEN,
            'grant_type' => 'refresh_token',
        ]),
        'headers' => ['Content-Type: application/x-www-form-urlencoded'],
    ]);

    $payload = json_decode($response['body'], true);
    if ($response['status'] < 200 || $response['status'] >= 300 || !is_array($payload) || empty($payload['access_token'])) {
        throw new Exception('Unable to refresh AdMob access token: ' . $response['body']);
    }

    return (string)$payload['access_token'];
}

function admob_standalone_metric_int(array $metricValues, string $name): int
{
    $metric = $metricValues[$name] ?? [];
    if (isset($metric['integerValue'])) {
        return (int)$metric['integerValue'];
    }

    if (isset($metric['microsValue'])) {
        return (int)$metric['microsValue'];
    }

    if (isset($metric['doubleValue'])) {
        return (int)round((float)$metric['doubleValue']);
    }

    return 0;
}

function admob_standalone_metric_money(array $metricValues, string $name): float
{
    $metric = $metricValues[$name] ?? [];
    if (isset($metric['microsValue'])) {
        return round(((int)$metric['microsValue']) / 1000000, 6);
    }

    if (isset($metric['doubleValue'])) {
        return round((float)$metric['doubleValue'], 6);
    }

    if (isset($metric['decimalValue'])) {
        return round((float)$metric['decimalValue'], 6);
    }

    return 0.0;
}

function admob_standalone_parse_report_response(string $body): array
{
    $trimmed = trim($body);
    if ($trimmed === '') {
        return [];
    }

    $decoded = json_decode($trimmed, true);
    if (is_array($decoded)) {
        if (array_key_exists('row', $decoded) || array_key_exists('header', $decoded) || array_key_exists('footer', $decoded)) {
            return [$decoded];
        }

        return $decoded;
    }

    $items = [];
    $lines = preg_split('/\r\n|\r|\n/', $trimmed);
    foreach ($lines as $line) {
        $payload = json_decode(trim($line), true);
        if (is_array($payload)) {
            $items[] = $payload;
        }
    }

    return $items;
}

function admob_standalone_normalize_platform(string $platform): string
{
    $value = strtolower(trim($platform));
    if ($value === 'ios' || $value === 'apple') {
        return 'apple';
    }

    if ($value === 'android' || strpos($value, 'android') !== false) {
        return 'android';
    }

    return 'unknown';
}

function admob_standalone_app_platform_map(mysqli $mysqli): array
{
    $map = [];
    $sql = "
        SELECT admob_app_id, platform
        FROM fnd_admob_app_map_tab
        WHERE valid = 1
          AND admob_app_id IS NOT NULL
          AND admob_app_id <> ''
    ";

    $result = $mysqli->query($sql);
    if (!$result) {
        return $map;
    }

    while ($row = $result->fetch_assoc()) {
        $map[(string)$row['admob_app_id']] = admob_standalone_normalize_platform((string)$row['platform']);
    }

    $result->free();
    return $map;
}

function admob_standalone_sync_daily_report(mysqli $mysqli, string $date, bool $debug = false): array
{
    if (ADMOB_PUBLISHER_ID === '') {
        throw new Exception('ADMOB_PUBLISHER_ID must be filled in this file. Example: pub-1234567890123456');
    }

    $dateObj = DateTime::createFromFormat('Y-m-d', $date, new DateTimeZone('Asia/Colombo'));
    if (!$dateObj) {
        throw new Exception('Invalid date. Use YYYY-MM-DD.');
    }

    $accessToken = admob_standalone_access_token();
    $platformMap = admob_standalone_app_platform_map($mysqli);

    $requestBody = [
        'reportSpec' => [
            'dateRange' => [
                'startDate' => [
                    'year' => (int)$dateObj->format('Y'),
                    'month' => (int)$dateObj->format('n'),
                    'day' => (int)$dateObj->format('j'),
                ],
                'endDate' => [
                    'year' => (int)$dateObj->format('Y'),
                    'month' => (int)$dateObj->format('n'),
                    'day' => (int)$dateObj->format('j'),
                ],
            ],
            'dimensions' => ['APP'],
            'metrics' => ['IMPRESSIONS', 'CLICKS', 'ESTIMATED_EARNINGS'],
            'localizationSettings' => [
                'currencyCode' => 'USD',
                'languageCode' => 'en-US',
            ],
        ],
    ];

    $url = 'https://admob.googleapis.com/v1/accounts/' . rawurlencode(ADMOB_PUBLISHER_ID) . '/networkReport:generate';
    $response = admob_standalone_request($url, [
        'post' => json_encode($requestBody),
        'headers' => [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json',
        ],
    ]);

    if ($response['status'] < 200 || $response['status'] >= 300) {
        throw new Exception('AdMob report request failed: ' . $response['body']);
    }

    $responseItems = admob_standalone_parse_report_response($response['body']);
    $rows = [];
    foreach ($responseItems as $payload) {
        if (!is_array($payload) || empty($payload['row'])) {
            continue;
        }

        $row = $payload['row'];
        $dimensionValues = $row['dimensionValues'] ?? [];
        $metricValues = $row['metricValues'] ?? [];
        $app = $dimensionValues['APP'] ?? [];
        $admobAppId = (string)($app['value'] ?? '');

        if ($admobAppId === '') {
            continue;
        }

        $appName = (string)($app['displayLabel'] ?? $admobAppId);
        $platform = $platformMap[$admobAppId] ?? 'unknown';
        $impressions = admob_standalone_metric_int($metricValues, 'IMPRESSIONS');
        $clicks = admob_standalone_metric_int($metricValues, 'CLICKS');
        $earningsUsd = admob_standalone_metric_money($metricValues, 'ESTIMATED_EARNINGS');
        $ctr = $impressions > 0 ? round(($clicks / $impressions) * 100, 4) : 0;

        $rows[] = [
            'report_date' => $date,
            'platform' => $platform,
            'admob_app_id' => $admobAppId,
            'app_name' => $appName,
            'impressions' => $impressions,
            'clicks' => $clicks,
            'estimated_earnings_usd' => $earningsUsd,
            'ctr' => $ctr,
        ];
    }

    $stmt = $mysqli->prepare("
        INSERT INTO fnd_admob_daily_report_tab
            (report_date, platform, admob_app_id, app_name, impressions, clicks, estimated_earnings_usd, ctr, source, updated_at)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, 'admob_api', NOW())
        ON DUPLICATE KEY UPDATE
            platform = VALUES(platform),
            app_name = VALUES(app_name),
            impressions = VALUES(impressions),
            clicks = VALUES(clicks),
            estimated_earnings_usd = VALUES(estimated_earnings_usd),
            ctr = VALUES(ctr),
            source = VALUES(source),
            updated_at = NOW()
    ");

    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare AdMob upsert.');
    }

    $saved = 0;
    $totalEarningsUsd = 0.0;
    foreach ($rows as $row) {
        $stmt->bind_param(
            'ssssiidd',
            $row['report_date'],
            $row['platform'],
            $row['admob_app_id'],
            $row['app_name'],
            $row['impressions'],
            $row['clicks'],
            $row['estimated_earnings_usd'],
            $row['ctr']
        );

        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            throw new Exception($error ?: 'Unable to save AdMob row.');
        }

        $saved++;
        $totalEarningsUsd += (float)$row['estimated_earnings_usd'];
    }

    $stmt->close();

    $result = [
        'date' => $date,
        'rows_received' => count($rows),
        'rows_saved' => $saved,
        'estimated_earnings_usd' => round($totalEarningsUsd, 6),
    ];

    if ($debug) {
        $result['debug'] = [
            'http_status' => $response['status'],
            'response_items' => count($responseItems),
            'body_preview' => substr($response['body'], 0, 2000),
        ];
    }

    return $result;
}

function admob_standalone_sync_date_range(mysqli $mysqli, string $fromDate, string $toDate, bool $debug = false): array
{
    $from = DateTime::createFromFormat('Y-m-d', $fromDate, new DateTimeZone('Asia/Colombo'));
    $to = DateTime::createFromFormat('Y-m-d', $toDate, new DateTimeZone('Asia/Colombo'));

    if (!$from || !$to) {
        throw new Exception('Invalid range. Use YYYY-MM-DD for from/to.');
    }

    $today = new DateTime('today', new DateTimeZone('Asia/Colombo'));
    if ($to > $today) {
        $to = $today;
        $toDate = $to->format('Y-m-d');
    }

    if ($from > $to) {
        throw new Exception('from date cannot be after to date.');
    }

    $results = [];
    $totalReceived = 0;
    $totalSaved = 0;
    $totalEarningsUsd = 0.0;

    while ($from <= $to) {
        $result = admob_standalone_sync_daily_report($mysqli, $from->format('Y-m-d'), $debug);
        $results[] = $result;
        $totalReceived += (int)$result['rows_received'];
        $totalSaved += (int)$result['rows_saved'];
        $totalEarningsUsd += (float)($result['estimated_earnings_usd'] ?? 0);
        $from->modify('+1 day');
    }

    return [
        'from' => $fromDate,
        'to' => $toDate,
        'days_synced' => count($results),
        'rows_received' => $totalReceived,
        'rows_saved' => $totalSaved,
        'estimated_earnings_usd' => round($totalEarningsUsd, 6),
        'daily' => $results,
    ];
}

function admob_standalone_month_range(string $month): array
{
    $date = DateTime::createFromFormat('Y-m-d', $month . '-01', new DateTimeZone('Asia/Colombo'));
    if (!$date) {
        throw new Exception('Invalid month. Use YYYY-MM.');
    }

    return [
        $date->format('Y-m-01'),
        $date->format('Y-m-t'),
    ];
}

try {
    $mysqli = admob_standalone_db();
    $date = $_GET['date'] ?? null;
    $month = $_GET['month'] ?? null;
    $fromDate = $_GET['from'] ?? null;
    $toDate = $_GET['to'] ?? null;
    $debug = isset($_GET['debug']) && $_GET['debug'] === '1';

    if (PHP_SAPI === 'cli') {
        foreach ($argv as $arg) {
            if (strpos($arg, '--date=') === 0) {
                $date = substr($arg, 7);
            } elseif (strpos($arg, '--month=') === 0) {
                $month = substr($arg, 8);
            } elseif (strpos($arg, '--from=') === 0) {
                $fromDate = substr($arg, 7);
            } elseif (strpos($arg, '--to=') === 0) {
                $toDate = substr($arg, 5);
            } elseif ($arg === '--debug') {
                $debug = true;
            }
        }
    }

    if ($month) {
        [$fromDate, $toDate] = admob_standalone_month_range($month);
    }

    if ($fromDate && $toDate) {
        admob_standalone_json_response([
            'success' => true,
            'result' => admob_standalone_sync_date_range($mysqli, $fromDate, $toDate, $debug),
        ]);
    }

    if (!$date) {
        $date = (new DateTime('yesterday', new DateTimeZone('Asia/Colombo')))->format('Y-m-d');
    }

    admob_standalone_json_response([
        'success' => true,
        'result' => admob_standalone_sync_daily_report($mysqli, $date, $debug),
    ]);
} catch (Throwable $error) {
    admob_standalone_json_response([
        'success' => false,
        'error_msg' => $error->getMessage(),
    ], 500);
}