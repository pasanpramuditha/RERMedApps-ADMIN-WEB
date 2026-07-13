<?php

/**
 * Home dashboard page configuration API.
 *
 * Page visibility settings live in `fnd_admin_page_config_tab` so the React
 * home screen can decide which widgets to render and which backend calls to
 * skip before loading expensive dashboard data.
 */

function handle_get_home_page_config($mysqli) {
    $config = default_home_page_config();

    $stmt = $mysqli->prepare(
        'SELECT card_id, visibility, sort_order, refresh_interval_seconds, display_name
         FROM fnd_admin_page_config_tab
         WHERE page_key = ? AND valid = 1
         ORDER BY sort_order ASC, id ASC'
    );

    if (!$stmt) {
        send_json([
            'success' => true,
            'config' => $config,
            'warning' => $mysqli->error ?: 'Home page config table is not available.'
        ]);
    }

    $page_key = 'home';
    $stmt->bind_param('s', $page_key);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        send_json([
            'success' => true,
            'config' => $config,
            'warning' => $error ?: 'Unable to load home page config.'
        ]);
    }

    $rows = get_result($stmt);
    $stmt->close();

    foreach ($rows as $row) {
        $card_id = (string)($row['card_id'] ?? '');
        if ($card_id === '__page__') {
            $config['refreshIntervalSeconds'] = (int)($row['refresh_interval_seconds'] ?? 0);
            continue;
        }

        if ($card_id !== '') {
            $config['visibility'][$card_id] = (int)($row['visibility'] ?? 1) === 1;
        }
    }

    $config['showDebugInfo'] = get_home_debug_visibility($mysqli);

    send_json([
        'success' => true,
        'config' => $config
    ]);
}

function handle_save_home_page_config($mysqli) {
    $visibility_json = (string)($_POST['visibility_json'] ?? '{}');
    $visibility = json_decode($visibility_json, true);
    if (!is_array($visibility)) {
        send_json([
            'success' => false,
            'error_msg' => 'Invalid visibility_json payload.'
        ], 400);
    }

    $refresh_interval_seconds = max(0, (int)($_POST['refresh_interval_seconds'] ?? 0));
    $page_result = upsert_home_page_config_row($mysqli, '__page__', 1, 0, $refresh_interval_seconds, 'Home Page');
    if (!$page_result['success']) {
        send_json($page_result, 500);
    }

    $items = default_home_page_items();
    foreach ($items as $index => $item) {
        $key = $item['key'];
        $visible = array_key_exists($key, $visibility) ? ((bool)$visibility[$key]) : true;
        $result = upsert_home_page_config_row(
            $mysqli,
            $key,
            $visible ? 1 : 0,
            ($index + 1) * 10,
            0,
            $item['label']
        );

        if (!$result['success']) {
            send_json($result, 500);
        }
    }

    handle_get_home_page_config($mysqli);
}

function default_home_page_config() {
    $visibility = [];
    foreach (default_home_page_items() as $item) {
        $visibility[$item['key']] = true;
    }

    return [
        'visibility' => $visibility,
        'refreshIntervalSeconds' => 0,
        'showDebugInfo' => 0,
    ];
}

function default_home_page_items() {
    return [
        ['key' => 'netRevenue', 'label' => 'Net Revenue'],
        ['key' => 'appInstalls', 'label' => 'App Installs'],
        ['key' => 'activeUsers', 'label' => 'Active Users'],
        ['key' => 'purchaseEvents', 'label' => 'Purchase Events'],
        ['key' => 'refundEvents', 'label' => 'Refund Amount'],
        ['key' => 'appRevenue', 'label' => 'App Revenue'],
        ['key' => 'activeFunnel', 'label' => 'Active Funnel'],
        ['key' => 'purchaseEventsDetails', 'label' => 'Purchase Events Details'],
        ['key' => 'admobStatus', 'label' => 'AdMob Status'],
        ['key' => 'revenueBreakdown', 'label' => 'Monthly Revenue Chart'],
        ['key' => 'referralSource', 'label' => 'Referral Source'],
        ['key' => 'adExpenses', 'label' => 'Ad Expenses'],
        ['key' => 'revenueFlow', 'label' => 'Revenue Flow'],
        ['key' => 'purchaseEventsLog', 'label' => 'Purchase Events Log'],
    ];
}

function upsert_home_page_config_row($mysqli, $card_id, $visibility, $sort_order, $refresh_interval_seconds, $display_name) {
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

    $page_key = 'home';
    $stmt->bind_param('ssiiis', $page_key, $card_id, $visibility, $sort_order, $refresh_interval_seconds, $display_name);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();

    return $ok ? ['success' => true] : ['success' => false, 'error_msg' => $error];
}

function get_home_debug_visibility($mysqli) {
    $stmt = $mysqli->prepare(
        'SELECT int_value
         FROM fnd_admin_global_settings_tab
         WHERE app_param = ? AND valid = 1
         LIMIT 1'
    );

    if (!$stmt) {
        return 0;
    }

    $param = 'debug_info_visibility';
    $stmt->bind_param('s', $param);
    if (!$stmt->execute()) {
        $stmt->close();
        return 0;
    }

    $rows = get_result($stmt);
    $stmt->close();

    return isset($rows[0]['int_value']) ? (int)$rows[0]['int_value'] : 0;
}

?>
