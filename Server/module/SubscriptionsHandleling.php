<?php

if ($tag === 'GET_SUBSCRIPTIONS_DASHBOARD') {
    handle_subscriptions_dashboard($main_mysqli);
}

function subscriptions_json(array $payload, int $statusCode = 200): void
{
    if (function_exists('send_json')) {
        send_json($payload, $statusCode);
    }

    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
    }

    echo json_encode($payload);
    exit();
}

function subscriptions_bounds(): array
{
    $period = strtolower(trim((string)($_POST['period'] ?? 'this_month')));
    $from = trim((string)($_POST['from_date'] ?? ''));
    $to = trim((string)($_POST['to_date'] ?? ''));
    $tz = new DateTimeZone('Asia/Colombo');
    $today = new DateTime('today', $tz);

    if ($from !== '' && $to !== '') {
        return [$from . ' 00:00:00', $to . ' 23:59:59', 'custom'];
    }

    if ($period === 'today') {
        return [$today->format('Y-m-d 00:00:00'), $today->format('Y-m-d 23:59:59'), $period];
    }

    if ($period === 'yesterday') {
        $day = (clone $today)->modify('-1 day');
        return [$day->format('Y-m-d 00:00:00'), $day->format('Y-m-d 23:59:59'), $period];
    }

    if ($period === 'last7days') {
        $start = (clone $today)->modify('-6 days');
        return [$start->format('Y-m-d 00:00:00'), $today->format('Y-m-d 23:59:59'), $period];
    }

    if ($period === 'last_month') {
        $start = new DateTime('first day of last month', $tz);
        $end = new DateTime('last day of last month', $tz);
        return [$start->format('Y-m-d 00:00:00'), $end->format('Y-m-d 23:59:59'), $period];
    }

    $start = new DateTime('first day of this month', $tz);
    return [$start->format('Y-m-d 00:00:00'), $today->format('Y-m-d 23:59:59'), 'this_month'];
}

function subscriptions_table_exists(mysqli $mysqli, string $table): bool
{
    $safe = $mysqli->real_escape_string($table);
    $result = $mysqli->query("SHOW TABLES LIKE '{$safe}'");
    if (!$result) {
        return false;
    }
    $exists = $result->num_rows > 0;
    $result->free();
    return $exists;
}

function subscriptions_columns(mysqli $mysqli, string $table): array
{
    $cols = [];
    $safe = str_replace('`', '', $table);
    $result = $mysqli->query("SHOW COLUMNS FROM `{$safe}`");
    if (!$result) {
        return $cols;
    }
    while ($row = $result->fetch_assoc()) {
        $cols[] = (string)$row['Field'];
    }
    $result->free();
    return $cols;
}

function subscriptions_pick_col(array $cols, array $candidates): ?string
{
    $lowerMap = [];
    foreach ($cols as $col) {
        $lowerMap[strtolower($col)] = $col;
    }

    foreach ($candidates as $candidate) {
        $key = strtolower($candidate);
        if (isset($lowerMap[$key])) {
            return $lowerMap[$key];
        }
    }
    return null;
}

function subscriptions_fetch_rows(mysqli $mysqli, string $table, string $from, string $to, int $limit = 500): array
{
    if (!subscriptions_table_exists($mysqli, $table)) {
        return [];
    }

    $cols = subscriptions_columns($mysqli, $table);
    $dateCol = subscriptions_pick_col($cols, [
        'created_at',
        'created_date',
        'purchased_date',
        'purchased_datetime',
        'purchased_date_time',
        'purchase_date',
        'purchase_time',
        'event_date',
        'event_time',
        'notification_date',
        'notification_time',
        'updated_at',
        'date'
    ]);
    if (!$dateCol) {
        return [];
    }

    $safeTable = str_replace('`', '', $table);
    $safeDate = str_replace('`', '', $dateCol);
    $sql = "SELECT * FROM `{$safeTable}` WHERE `{$safeDate}` BETWEEN ? AND ? ORDER BY `{$safeDate}` DESC LIMIT ?";
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('ssi', $from, $to, $limit);
    if (!$stmt->execute()) {
        $stmt->close();
        return [];
    }

    $rows = get_result($stmt);
    $stmt->close();
    return $rows ?: [];
}

function subscriptions_recent_rows(mysqli $mysqli, string $table, int $limit = 500): array
{
    if (!subscriptions_table_exists($mysqli, $table)) {
        return [];
    }

    $cols = subscriptions_columns($mysqli, $table);
    $dateCol = subscriptions_pick_col($cols, [
        'created_at',
        'created_date',
        'purchased_date',
        'purchased_datetime',
        'purchased_date_time',
        'purchase_date',
        'event_date',
        'updated_at',
        'date'
    ]);

    $safeTable = str_replace('`', '', $table);
    $orderBy = $dateCol ? ' ORDER BY `' . str_replace('`', '', $dateCol) . '` DESC' : '';
    $safeLimit = max(1, min(1000, $limit));
    $result = $mysqli->query("SELECT * FROM `{$safeTable}`{$orderBy} LIMIT {$safeLimit}");
    if (!$result) {
        return [];
    }

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    $result->free();
    return $rows;
}

function subscriptions_value(array $row, array $keys, $default = '')
{
    $lowerMap = [];
    foreach ($row as $key => $value) {
        $lowerMap[strtolower((string)$key)] = $value;
    }

    foreach ($keys as $key) {
        if (array_key_exists($key, $row) && $row[$key] !== null && $row[$key] !== '') {
            return $row[$key];
        }
        $lowerKey = strtolower($key);
        if (array_key_exists($lowerKey, $lowerMap) && $lowerMap[$lowerKey] !== null && $lowerMap[$lowerKey] !== '') {
            return $lowerMap[$lowerKey];
        }
    }
    return $default;
}

function subscriptions_type_from_row(array $row): string
{
    $text = strtolower((string)subscriptions_value($row, ['duration', 'subscription_type', 'type', 'sku', 'product_id', 'productId'], ''));
    $status = strtolower((string)subscriptions_value($row, ['status'], ''));
    if (strpos($text, 'trial') !== false || $status === 'trial') {
        return 'Trial';
    }
    if (strpos($text, 'year') !== false || strpos($text, 'annual') !== false) {
        return 'Yearly';
    }
    if (strpos($text, 'month') !== false) {
        return 'Monthly';
    }
    if (strpos($text, 'life') !== false) {
        return 'Lifetime';
    }
    return 'Other';
}

function subscriptions_status_from_row(array $row): string
{
    $status = strtoupper(trim((string)subscriptions_value($row, ['status', 'subscription_status'], '')));
    $notification = strtoupper(trim((string)subscriptions_value($row, ['notification_type', 'event_type'], '')));
    $subtype = strtoupper(trim((string)subscriptions_value($row, ['subtype'], '')));

    $text = $status . ' ' . $notification . ' ' . $subtype;
    if (strpos($text, 'SUBSCRIBED') !== false || strpos($text, 'DID_RENEW') !== false || strpos($text, 'RENEWAL') !== false) {
        return 'ACTIVE';
    }
    if (strpos($text, 'REFUND') !== false || strpos($text, 'REVOKE') !== false) {
        return 'REFUNDED';
    }
    if (strpos($text, 'CANCEL') !== false || strpos($text, 'VOLUNTARY') !== false) {
        return 'CANCELLED';
    }
    if (strpos($text, 'FAIL') !== false || strpos($text, 'DECLIN') !== false) {
        return 'FAILED';
    }
    if (strpos($text, 'EXPIRE') !== false) {
        return 'EXPIRED';
    }
    if ($status === 'TRIAL') {
        return 'ACTIVE';
    }
    if ($status === 'ACTIVE' || $status === 'LIVE' || $status === 'PAID' || $status === 'PURCHASED') {
        return 'ACTIVE';
    }
    if ($status !== '') {
        return $status;
    }
    return 'ACTIVE';
}

function subscriptions_status_color(string $status): string
{
    switch (strtoupper($status)) {
        case 'ACTIVE':
        case 'SUBSCRIBED':
            return '#10B981';
        case 'CANCELLED':
            return '#F97316';
        case 'FAILED':
            return '#EF4444';
        case 'REFUNDED':
            return '#F43F5E';
        case 'EXPIRED':
            return '#64748B';
        default:
            return '#8B5CF6';
    }
}

function subscriptions_tag(string $type, string $status): string
{
    if ($status === 'REFUNDED') return 'Refunds';
    if ($status === 'CANCELLED') return 'Cancelled';
    if ($status === 'FAILED') return 'Failed';
    if ($status === 'EXPIRED') return 'Expired';
    if ($type === 'Trial') return 'Trials';
    if ($type === 'Yearly') return 'Yearly';
    if ($type === 'Monthly') return 'Monthly';
    return 'Other';
}

function subscriptions_money($amount, $lkr, string $currency = 'USD'): array
{
    $amountValue = is_numeric($amount) ? (float)$amount : 0;
    $lkrValue = is_numeric($lkr) ? (float)$lkr : 0;
    $currency = strtoupper(trim($currency)) !== '' ? strtoupper(trim($currency)) : 'USD';
    $usdValue = $currency === 'USD' ? $amountValue : 0;

    if ($lkrValue <= 0 && $currency === 'LKR' && $amountValue !== 0) {
        $lkrValue = $amountValue;
    }

    return [
        'amount' => number_format($amountValue, 2),
        'currency' => $currency,
        'amount_lkr' => $lkrValue > 0 ? 'Rs ' . number_format($lkrValue, 0) : '',
        'amount_usd_raw' => $usdValue,
        'amount_lkr_raw' => $lkrValue,
    ];
}

function subscriptions_currency_rate(mysqli $mysqli, string $currencyCode): float
{
    if (function_exists('home_get_currency_rate')) {
        return home_get_currency_rate($mysqli, $currencyCode);
    }

    $stmt = $mysqli->prepare('SELECT rate FROM currency_rates WHERE base_currency = ? AND currency_code = ? LIMIT 1');
    if (!$stmt) {
        return 300.0;
    }

    $base = 'USD';
    $code = strtoupper($currencyCode);
    $stmt->bind_param('ss', $base, $code);
    if (!$stmt->execute()) {
        $stmt->close();
        return 300.0;
    }

    $rows = get_result($stmt);
    $stmt->close();
    $rate = (float)($rows[0]['rate'] ?? 0);
    return $rate > 0 ? $rate : 300.0;
}

function subscriptions_price_bucket(string $duration): array
{
    return [
        'duration' => $duration,
        'lkr_values' => [],
        'usd_values' => [],
    ];
}

function subscriptions_add_price_sample(array &$bucket, $lkr, $usd, float $usdToLkr): void
{
    $lkrValue = is_numeric($lkr) ? (float)$lkr : 0.0;
    $usdValue = is_numeric($usd) ? (float)$usd : 0.0;

    if ($lkrValue <= 0 && $usdValue > 0) {
        $lkrValue = $usdValue * $usdToLkr;
    }
    if ($usdValue <= 0 && $lkrValue > 0 && $usdToLkr > 0) {
        $usdValue = $lkrValue / $usdToLkr;
    }

    if ($lkrValue > 0) {
        $bucket['lkr_values'][] = $lkrValue;
    }
    if ($usdValue > 0) {
        $bucket['usd_values'][] = $usdValue;
    }
}

function subscriptions_median(array $values): float
{
    $values = array_values(array_filter($values, fn($value) => is_numeric($value) && (float)$value > 0));
    if (empty($values)) {
        return 0.0;
    }

    sort($values, SORT_NUMERIC);
    $count = count($values);
    $middle = intdiv($count, 2);
    if ($count % 2 === 1) {
        return (float)$values[$middle];
    }

    return ((float)$values[$middle - 1] + (float)$values[$middle]) / 2;
}

function subscriptions_observed_prices(mysqli $main_mysqli, float $usdToLkr): array
{
    $prices = [
        'monthly' => subscriptions_price_bucket('monthly'),
        'yearly' => subscriptions_price_bucket('yearly'),
    ];

    try {
        $androidMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
        $rows = subscriptions_recent_rows($androidMysqli, 'fnd_global_purchase_tab', 500);
        if (!empty($rows)) {
            foreach ($rows as $row) {
                $sku = strtolower((string)subscriptions_value($row, ['sku', 'product_id', 'productId', 'subscription_type'], ''));
                if (strpos($sku, 'monthly') === false && strpos($sku, 'yearly') === false && strpos($sku, 'annual') === false) {
                    continue;
                }
                $duration = (strpos($sku, 'yearly') !== false || strpos($sku, 'annual') !== false) ? 'yearly' : 'monthly';
                subscriptions_add_price_sample(
                    $prices[$duration],
                    subscriptions_value($row, ['amount_lkr', 'price_lkr', 'revenue_lkr', 'estimated_lkr', 'amount_lkr_raw'], 0),
                    subscriptions_value($row, ['amount_usd', 'price_usd', 'revenue_usd', 'estimated_usd', 'amount_usd_raw', 'amount', 'price'], 0),
                    $usdToLkr
                );
            }
        }
        $androidMysqli->close();
    } catch (Throwable $error) {
        $prices['android_error'] = $error->getMessage();
    }

    try {
        $rows = subscriptions_recent_rows($main_mysqli, 'ios_subscription_events', 500);
        if (!empty($rows)) {
            foreach ($rows as $row) {
                $label = strtolower((string)subscriptions_value($row, ['duration'], '') . ' ' . (string)subscriptions_value($row, ['product_id', 'productId'], ''));
                if (strpos($label, 'monthly') === false && strpos($label, 'yearly') === false && strpos($label, 'annual') === false) {
                    continue;
                }
                $duration = (strpos($label, 'yearly') !== false || strpos($label, 'annual') !== false) ? 'yearly' : 'monthly';
                subscriptions_add_price_sample(
                    $prices[$duration],
                    subscriptions_value($row, ['amount_lkr', 'price_lkr', 'revenue_lkr', 'amount_lkr_raw'], 0),
                    subscriptions_value($row, ['amount_usd', 'price_usd', 'revenue_usd', 'amount_usd_raw', 'price', 'amount'], 0),
                    $usdToLkr
                );
            }
        }
    } catch (Throwable $error) {
        $prices['ios_error'] = $error->getMessage();
    }

    foreach (['monthly', 'yearly'] as $duration) {
        $prices[$duration]['lkr'] = subscriptions_median($prices[$duration]['lkr_values']);
        $prices[$duration]['usd'] = subscriptions_median($prices[$duration]['usd_values']);
    }

    return $prices;
}

function subscriptions_active_funnel(mysqli $main_mysqli): array
{
    $empty = [
        'monthly' => ['android' => 0, 'apple' => 0, 'total' => 0],
        'yearly' => ['android' => 0, 'apple' => 0, 'total' => 0],
        'debug' => [],
    ];

    try {
        $android = function_exists('GetHomeAndroidActiveFunnel') ? GetHomeAndroidActiveFunnel($main_mysqli) : [];
        $ios = function_exists('GetHomeIosActiveFunnel') ? GetHomeIosActiveFunnel($main_mysqli) : [];

        $empty['monthly']['android'] = (int)($android['monthly'] ?? 0);
        $empty['monthly']['apple'] = (int)($ios['monthly'] ?? 0);
        $empty['yearly']['android'] = (int)($android['yearly'] ?? 0);
        $empty['yearly']['apple'] = (int)($ios['yearly'] ?? 0);
        $empty['monthly']['total'] = $empty['monthly']['android'] + $empty['monthly']['apple'];
        $empty['yearly']['total'] = $empty['yearly']['android'] + $empty['yearly']['apple'];
        $empty['debug'] = [
            'android' => $android['debug'] ?? null,
            'ios' => $ios['debug'] ?? null,
        ];
    } catch (Throwable $error) {
        $empty['debug']['error'] = $error->getMessage();
    }

    return $empty;
}

function subscriptions_recurring_revenue(mysqli $main_mysqli): array
{
    $usdToLkr = subscriptions_currency_rate($main_mysqli, 'LKR');
    $funnel = subscriptions_active_funnel($main_mysqli);
    $prices = subscriptions_observed_prices($main_mysqli, $usdToLkr);

    $monthlyLkr = (float)($prices['monthly']['lkr'] ?? 0);
    $yearlyLkr = (float)($prices['yearly']['lkr'] ?? 0);
    $monthlyUsd = (float)($prices['monthly']['usd'] ?? 0);
    $yearlyUsd = (float)($prices['yearly']['usd'] ?? 0);

    $mrrLkr =
        ((int)$funnel['monthly']['total'] * $monthlyLkr) +
        (((int)$funnel['yearly']['total'] * $yearlyLkr) / 12);
    $mrrUsd =
        ((int)$funnel['monthly']['total'] * $monthlyUsd) +
        (((int)$funnel['yearly']['total'] * $yearlyUsd) / 12);

    return [
        'mrr_lkr' => round($mrrLkr),
        'mrr_usd' => round($mrrUsd, 2),
        'debug' => [
            'definition' => 'monthly active * observed monthly price + yearly active * observed yearly price / 12',
            'usd_to_lkr' => $usdToLkr,
            'active_funnel' => $funnel,
            'prices' => [
                'monthly_lkr' => $monthlyLkr,
                'yearly_lkr' => $yearlyLkr,
                'monthly_usd' => $monthlyUsd,
                'yearly_usd' => $yearlyUsd,
            ],
        ],
    ];
}

function subscriptions_app_lookup(mysqli $main_mysqli): array
{
    $lookup = [];
    $result = $main_mysqli->query("SELECT package_name, app_id, db_name, name, icon_url FROM fnd_app_details_tab WHERE id NOT IN (0, 100)");
    if (!$result) {
        return $lookup;
    }

    while ($row = $result->fetch_assoc()) {
        $icon = trim((string)($row['icon_url'] ?? ''));
        if ($icon === '') {
            continue;
        }

        foreach (['package_name', 'app_id', 'db_name', 'name'] as $key) {
            $value = strtolower(trim((string)($row[$key] ?? '')));
            if ($value !== '') {
                $lookup[$value] = $icon;
            }
        }
    }

    $result->free();
    return $lookup;
}

function subscriptions_find_app_icon(array $lookup, array $row): string
{
    $terms = [
        strtolower(trim((string)subscriptions_value($row, ['app_apple_id', 'app_id'], ''))),
        strtolower(trim((string)subscriptions_value($row, ['bundle_id', 'package', 'package_name'], ''))),
        strtolower(trim((string)subscriptions_value($row, ['product_id', 'productId', 'sku'], ''))),
        strtolower(trim((string)subscriptions_value($row, ['app_name', 'db_name', 'name'], ''))),
    ];

    foreach ($terms as $term) {
        if ($term !== '' && isset($lookup[$term])) {
            return $lookup[$term];
        }
    }

    foreach ($terms as $term) {
        if ($term === '') {
            continue;
        }
        foreach ($lookup as $key => $icon) {
            if ($key !== '' && (strpos($term, $key) !== false || strpos($key, $term) !== false)) {
                return $icon;
            }
        }
    }

    return '';
}

function subscriptions_map_android(array $row, array $appLookup): array
{
    $type = subscriptions_type_from_row($row);
    $status = subscriptions_status_from_row($row);
    $money = subscriptions_money(
        subscriptions_value($row, ['amount', 'amount_usd', 'price_usd', 'revenue_usd', 'estimated_usd', 'amount_usd_raw'], 0),
        subscriptions_value($row, ['amount_lkr', 'price_lkr', 'revenue_lkr', 'estimated_lkr', 'amount_lkr_raw'], 0),
        (string)subscriptions_value($row, ['currency', 'currency_code'], 'USD')
    );
    $email = (string)subscriptions_value($row, ['email', 'payload', 'user_email', 'account_email'], 'Unknown Android User');
    $date = (string)subscriptions_value($row, ['created_at', 'created_date', 'purchased_date', 'purchased_datetime', 'purchase_date', 'event_date', 'updated_at'], '');

    return [
        'id' => 'android-' . md5(json_encode($row)),
        'platform' => 'android',
        'appIcon' => subscriptions_find_app_icon($appLookup, $row),
        'subCount' => 1,
        'type' => $type,
        'user' => $email,
        'geo' => strtoupper((string)subscriptions_value($row, ['country', 'country_code', 'region'], 'ANDROID')) . ' • VERIFIED EMAIL',
        'language' => strtoupper((string)subscriptions_value($row, ['language', 'lang', 'user_language', 'device_language', 'locale', 'app_language'], '')),
        'flag' => 'android',
        'appHint' => (string)subscriptions_value($row, ['package', 'package_name', 'app_name', 'name'], ''),
        'product' => (string)subscriptions_value($row, ['sku', 'product_id', 'productId', 'package', 'package_name', 'subscription_type'], 'ANDROID.SUBSCRIPTION'),
        'sku' => (string)subscriptions_value($row, ['order_id', 'orderId', 'token', 'purchase_token', 'signature'], ''),
        'amount' => $money['amount'],
        'amountCurrency' => $money['currency'],
        'amountLkr' => $money['amount_lkr'],
        'totalSpent' => $money['amount'],
        'totalLkr' => $money['amount_lkr'],
        'amountUsdRaw' => $money['amount_usd_raw'],
        'amountLkrRaw' => $money['amount_lkr_raw'],
        'time' => $date,
        'activity' => (string)subscriptions_value($row, ['last_online', 'updated_at'], ''),
        'status' => $status,
        'statusColor' => subscriptions_status_color($status),
        'action' => in_array($status, ['CANCELLED', 'FAILED', 'REFUNDED'], true) ? 'WINBACK' : '',
        'tag' => subscriptions_tag($type, $status),
    ];
}

function subscriptions_map_ios(array $row, array $appLookup): array
{
    $type = subscriptions_type_from_row($row);
    $status = subscriptions_status_from_row($row);
    $money = subscriptions_money(
        subscriptions_value($row, ['amount', 'price', 'amount_usd', 'price_usd', 'revenue_usd'], 0),
        subscriptions_value($row, ['amount_lkr', 'price_lkr', 'revenue_lkr'], 0),
        (string)subscriptions_value($row, ['currency', 'currency_code'], 'USD')
    );
    $date = (string)subscriptions_value($row, ['created_at', 'event_date', 'purchased_date', 'updated_at'], '');
    $original = (string)subscriptions_value($row, ['original_transaction_id', 'transaction_id'], '');

    return [
        'id' => 'apple-' . md5(json_encode($row)),
        'platform' => 'apple',
        'appIcon' => subscriptions_find_app_icon($appLookup, $row),
        'subCount' => (int)subscriptions_value($row, ['active_count'], 1),
        'type' => $type,
        'user' => $original !== '' ? 'Apple User ' . substr($original, -6) : 'Apple User',
        'geo' => strtoupper((string)subscriptions_value($row, ['country'], 'APPLE')) . ' • SECURE DEVICE ID',
        'language' => strtoupper((string)subscriptions_value($row, ['language', 'lang', 'user_language', 'device_language', 'locale', 'app_language'], '')),
        'flag' => 'apple',
        'appHint' => (string)subscriptions_value($row, ['bundle_id', 'app_apple_id', 'app_name', 'name'], ''),
        'product' => (string)subscriptions_value($row, ['product_id', 'productId', 'subscription_group_id', 'duration'], 'IOS.SUBSCRIPTION'),
        'sku' => $original,
        'amount' => $money['amount'],
        'amountCurrency' => $money['currency'],
        'amountLkr' => $money['amount_lkr'],
        'totalSpent' => $money['amount'],
        'totalLkr' => $money['amount_lkr'],
        'amountUsdRaw' => $money['amount_usd_raw'],
        'amountLkrRaw' => $money['amount_lkr_raw'],
        'time' => $date,
        'activity' => (string)subscriptions_value($row, ['expires_date', 'updated_at'], ''),
        'status' => $status,
        'statusColor' => subscriptions_status_color($status),
        'action' => in_array($status, ['CANCELLED', 'FAILED', 'REFUNDED'], true) ? 'WINBACK' : '',
        'tag' => subscriptions_tag($type, $status),
    ];
}

function handle_subscriptions_dashboard(mysqli $main_mysqli): void
{
    [$from, $to, $period] = subscriptions_bounds();
    $limit = max(1, min(1000, (int)($_POST['limit'] ?? 500)));
    $records = [];
    $debug = ['period' => $period, 'from' => $from, 'to' => $to];
    $appLookup = subscriptions_app_lookup($main_mysqli);

    try {
        $androidMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
        $androidRows = subscriptions_fetch_rows($androidMysqli, 'fnd_global_purchase_tab', $from, $to, $limit);
        if (empty($androidRows)) {
            $androidRows = subscriptions_fetch_rows($androidMysqli, 'fnd_global_subscriptions_tab', $from, $to, $limit);
        }
        $debug['android_rows'] = count($androidRows);
        foreach ($androidRows as $row) {
            $records[] = subscriptions_map_android($row, $appLookup);
        }
        $androidMysqli->close();
    } catch (Throwable $error) {
        $debug['android_error'] = $error->getMessage();
    }

    try {
        $iosRows = subscriptions_fetch_rows($main_mysqli, 'ios_subscription_events', $from, $to, $limit);
        $debug['ios_rows'] = count($iosRows);
        foreach ($iosRows as $row) {
            $records[] = subscriptions_map_ios($row, $appLookup);
        }
    } catch (Throwable $error) {
        $debug['ios_error'] = $error->getMessage();
    }

    usort($records, function ($a, $b) {
        return strcmp((string)$b['time'], (string)$a['time']);
    });
    $records = array_slice($records, 0, $limit);

    $summary = [
        'Yearly' => 0,
        'Monthly' => 0,
        'Trials' => 0,
        'Expired' => 0,
        'Cancelled' => 0,
        'Failed' => 0,
        'Refunds' => 0,
        'mrr_lkr' => 0,
        'mrr_usd' => 0,
    ];
    foreach ($records as $record) {
        if (isset($summary[$record['tag']])) {
            $summary[$record['tag']]++;
        }
        if ($record['tag'] === 'Monthly' || $record['tag'] === 'Yearly') {
            $summary['mrr_lkr'] += (float)$record['amountLkrRaw'];
            $summary['mrr_usd'] += (float)$record['amountUsdRaw'];
        }
    }
    $debug['recurring_revenue'] = [
        'definition' => 'sum of visible Yearly and Monthly subscription row amounts for the selected date range',
    ];

    subscriptions_json([
        'success' => true,
        'period' => $period,
        'from' => substr($from, 0, 10),
        'to' => substr($to, 0, 10),
        'summary' => $summary,
        'records' => $records,
        'debug' => $debug,
    ]);
}
