<?php

if ($tag === 'GET_APP_TREND_TELEMETRY') {
    handle_get_app_trend_telemetry($main_mysqli);
}

function handle_get_app_trend_telemetry($main_mysqli) {
    $period_days = app_trend_period_days($_POST['period'] ?? 'last7days');
    $latest_data_date = app_trend_latest_main_report_date($main_mysqli);
    $to_date = $latest_data_date ?: date('Y-m-d');
    $from_date = date('Y-m-d', strtotime($to_date . ' -' . ($period_days - 1) . ' days'));
    $previous_from = date('Y-m-d', strtotime($from_date . ' -' . $period_days . ' days'));
    $previous_to = date('Y-m-d', strtotime($from_date . ' -1 day'));

    $apps = app_trend_get_android_live_apps($main_mysqli);
    $daily_rows = app_trend_build_empty_daily_rows($from_date, $to_date);
    $summary = [
        'registrations' => 0,
        'returning' => 0,
        'premium' => 0,
        'activeSubs' => 0,
        'installs' => 0,
        'purchases' => 0,
        'refunds' => 0,
    ];
    $rows = [];

    $install_metrics = app_trend_get_google_install_metrics($main_mysqli, $from_date, $to_date, $previous_from, $previous_to);
    $sales_metrics = app_trend_get_google_sales_metrics($main_mysqli, $from_date, $to_date, $previous_from, $previous_to);
    $sub_metrics = app_trend_get_google_subscription_metrics($main_mysqli, $from_date, $to_date, $previous_from, $previous_to);

    foreach ($apps as $app) {
        $db_name = trim((string)($app['db_name'] ?? ''));
        $package_name = trim((string)($app['package_name'] ?? ''));
        $app_current = app_trend_empty_app_metric();
        $app_previous = app_trend_empty_app_metric();
        $app_daily = app_trend_build_empty_daily_rows($from_date, $to_date);

        if ($db_name !== '') {
            $registration_metrics = app_trend_get_registration_metrics($main_mysqli, $db_name, $from_date, $to_date, $previous_from, $previous_to);
            $app_current = app_trend_merge_metric($app_current, $registration_metrics['current']);
            $app_previous = app_trend_merge_metric($app_previous, $registration_metrics['previous']);
            foreach ($registration_metrics['daily'] as $date => $day) {
                if (isset($app_daily[$date])) {
                    $app_daily[$date]['registrations'] += (int)$day['registrations'];
                    $app_daily[$date]['returning'] += (int)$day['returning'];
                    $app_daily[$date]['premium'] += (int)$day['premium'];
                    $app_daily[$date]['activeSubs'] += (int)$day['activeSubs'];
                }
            }
        }

        if ($package_name !== '') {
            $package_current = app_trend_find_metric($install_metrics['current'], $package_name);
            $package_previous = app_trend_find_metric($install_metrics['previous'], $package_name);
            $sales_current = app_trend_find_metric($sales_metrics['current'], $package_name);
            $sales_previous = app_trend_find_metric($sales_metrics['previous'], $package_name);
            $subs_current = app_trend_find_metric($sub_metrics['current'], $package_name);
            $subs_previous = app_trend_find_metric($sub_metrics['previous'], $package_name);

            $app_current = app_trend_merge_metric($app_current, $package_current);
            $app_previous = app_trend_merge_metric($app_previous, $package_previous);
            $app_current = app_trend_merge_metric($app_current, $sales_current);
            $app_previous = app_trend_merge_metric($app_previous, $sales_previous);
            $app_current = app_trend_merge_metric($app_current, $subs_current);
            $app_previous = app_trend_merge_metric($app_previous, $subs_previous);

            app_trend_merge_daily_package($app_daily, $install_metrics['daily'], $package_name, ['installs']);
            app_trend_merge_daily_package($app_daily, $sales_metrics['daily'], $package_name, ['purchases', 'refunds']);
            app_trend_merge_daily_package($app_daily, $sub_metrics['daily'], $package_name, ['activeSubs']);
        }

        foreach ($app_daily as $date => $day) {
            foreach ($day as $key => $value) {
                if ($key !== 'date') {
                    $daily_rows[$date][$key] += (int)$value;
                }
            }
        }

        foreach ($summary as $key => $_value) {
            $summary[$key] += (int)($app_current[$key] ?? 0);
        }

        $install_delta = app_trend_percent_delta($app_current['installs'], $app_previous['installs']);
        $purchase_delta = app_trend_percent_delta($app_current['purchases'], $app_previous['purchases']);
        $refund_delta = app_trend_percent_delta($app_current['refunds'], $app_previous['refunds']);
        $login_delta = app_trend_percent_delta($app_current['returning'], $app_previous['returning']);
        $subs_delta = app_trend_percent_delta($app_current['activeSubs'], $app_previous['activeSubs']);

        $rows[] = [
            'appId' => (string)($app['id'] ?? ''),
            'name' => (string)($app['name'] ?? ''),
            'packageName' => $package_name,
            'dbName' => $db_name,
            'iconUrl' => (string)($app['icon_url'] ?? ''),
            'version' => (string)($app['current_ver'] ?? ''),
            'installs' => (int)$app_current['installs'],
            'purchases' => (int)$app_current['purchases'],
            'refunds' => (int)$app_current['refunds'],
            'returning' => (int)$app_current['returning'],
            'registrations' => (int)$app_current['registrations'],
            'premium' => (int)$app_current['premium'],
            'activeSubs' => (int)$app_current['activeSubs'],
            'installDelta' => $install_delta,
            'purchaseDelta' => $purchase_delta,
            'refundDelta' => $refund_delta,
            'loginDelta' => $login_delta,
            'subsDelta' => $subs_delta,
            'status' => app_trend_status($install_delta, $purchase_delta, $refund_delta),
            'daily' => array_values($app_daily),
        ];
    }

    usort($rows, function ($a, $b) {
        $score = ['Alarm' => 0, 'Watch' => 1, 'Robust' => 2];
        $status_compare = ($score[$a['status']] ?? 9) <=> ($score[$b['status']] ?? 9);
        if ($status_compare !== 0) {
            return $status_compare;
        }
        return ((int)$b['registrations'] + (int)$b['installs']) <=> ((int)$a['registrations'] + (int)$a['installs']);
    });

    send_json([
        'success' => true,
        'periodDays' => $period_days,
        'latestDataDate' => $latest_data_date,
        'fromDate' => $from_date,
        'toDate' => $to_date,
        'summary' => $summary,
        'daily' => array_values($daily_rows),
        'apps' => $rows,
        'sources' => [
            'registrations' => 'app_databases.fnd_registration_tab',
            'installs' => 'main.fnd_google_play_installation_daily_reports',
            'purchases' => 'main.fnd_google_play_sales_daily_reports',
            'subscriptions' => 'main.fnd_google_play_subscription_daily_reports',
        ],
    ]);
}

function app_trend_latest_main_report_date($mysqli) {
    $dates = [];
    foreach ([
        'fnd_google_play_installation_daily_reports',
        'fnd_google_play_sales_daily_reports',
        'fnd_google_play_subscription_daily_reports',
    ] as $table) {
        $result = $mysqli->query("SELECT MAX(report_date) AS latest_date FROM {$table}");
        if ($result) {
            $row = $result->fetch_assoc();
            $latest = trim((string)($row['latest_date'] ?? ''));
            if ($latest !== '') {
                $dates[] = $latest;
            }
            $result->free();
        }
    }

    if (empty($dates)) {
        return null;
    }

    rsort($dates);
    return $dates[0];
}

function app_trend_period_days($period) {
    switch ((string)$period) {
        case 'today': return 1;
        case 'this_month': return 30;
        case 'last3months': return 90;
        case 'last6months': return 180;
        case 'last_year': return 365;
        case 'last7days':
        default: return 7;
    }
}

function app_trend_get_android_live_apps($mysqli) {
    $sql = "SELECT id, package_name, db_name, name, icon_url, current_ver, status, os
            FROM fnd_app_details_tab
            WHERE LOWER(os) LIKE '%android%' AND CAST(status AS UNSIGNED) = 2
            ORDER BY app_order ASC, name ASC";
    $rows = [];
    if ($result = $mysqli->query($sql)) {
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        $result->free();
    }
    return $rows;
}

function app_trend_empty_app_metric() {
    return [
        'registrations' => 0,
        'returning' => 0,
        'premium' => 0,
        'activeSubs' => 0,
        'installs' => 0,
        'purchases' => 0,
        'refunds' => 0,
    ];
}

function app_trend_merge_metric($base, $next) {
    foreach (app_trend_empty_app_metric() as $key => $_value) {
        $base[$key] = (int)($base[$key] ?? 0) + (int)($next[$key] ?? 0);
    }
    return $base;
}

function app_trend_build_empty_daily_rows($from_date, $to_date) {
    $rows = [];
    $cursor = strtotime($from_date);
    $end = strtotime($to_date);
    while ($cursor <= $end) {
        $date = date('Y-m-d', $cursor);
        $rows[$date] = [
            'date' => $date,
            'registrations' => 0,
            'returning' => 0,
            'premium' => 0,
            'activeSubs' => 0,
            'installs' => 0,
            'purchases' => 0,
            'refunds' => 0,
        ];
        $cursor = strtotime('+1 day', $cursor);
    }
    return $rows;
}

function app_trend_get_registration_metrics($main_mysqli, $db_name, $from_date, $to_date, $previous_from, $previous_to) {
    $empty = app_trend_empty_app_metric();
    $daily = app_trend_build_empty_daily_rows($from_date, $to_date);
    try {
        $app_mysqli = SwapDatabase($main_mysqli, $db_name);
        $current = app_trend_query_registration_period($app_mysqli, $from_date, $to_date);
        $previous = app_trend_query_registration_period($app_mysqli, $previous_from, $previous_to);
        $daily = app_trend_query_registration_daily($app_mysqli, $from_date, $to_date, $daily);
        $app_mysqli->close();
        return ['current' => $current, 'previous' => $previous, 'daily' => $daily];
    } catch (Throwable $error) {
        return ['current' => $empty, 'previous' => $empty, 'daily' => $daily];
    }
}

function app_trend_query_registration_period($mysqli, $from_date, $to_date) {
    $metric = app_trend_empty_app_metric();
    $sql = "SELECT
                COUNT(*) AS registrations,
                SUM(CASE WHEN last_online IS NOT NULL AND last_online >= registered_date THEN 1 ELSE 0 END) AS returning,
                SUM(CASE WHEN CAST(premium AS UNSIGNED) = 1 OR CAST(ads_free AS UNSIGNED) = 1 THEN 1 ELSE 0 END) AS premium,
                SUM(CASE WHEN CAST(ss_enabled AS UNSIGNED) = 1 OR CAST(chat_enabled AS UNSIGNED) = 1 THEN 1 ELSE 0 END) AS activeSubs
            FROM fnd_registration_tab
            WHERE DATE(registered_date) BETWEEN ? AND ?";
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return $metric;
    }
    $stmt->bind_param('ss', $from_date, $to_date);
    if ($stmt->execute()) {
        $rows = get_result($stmt);
        if (isset($rows[0])) {
            $metric['registrations'] = (int)($rows[0]['registrations'] ?? 0);
            $metric['returning'] = (int)($rows[0]['returning'] ?? 0);
            $metric['premium'] = (int)($rows[0]['premium'] ?? 0);
            $metric['activeSubs'] = (int)($rows[0]['activeSubs'] ?? 0);
        }
    }
    $stmt->close();
    return $metric;
}

function app_trend_query_registration_daily($mysqli, $from_date, $to_date, $daily) {
    $sql = "SELECT
                DATE(registered_date) AS report_date,
                COUNT(*) AS registrations,
                SUM(CASE WHEN last_online IS NOT NULL AND last_online >= registered_date THEN 1 ELSE 0 END) AS returning,
                SUM(CASE WHEN CAST(premium AS UNSIGNED) = 1 OR CAST(ads_free AS UNSIGNED) = 1 THEN 1 ELSE 0 END) AS premium,
                SUM(CASE WHEN CAST(ss_enabled AS UNSIGNED) = 1 OR CAST(chat_enabled AS UNSIGNED) = 1 THEN 1 ELSE 0 END) AS activeSubs
            FROM fnd_registration_tab
            WHERE DATE(registered_date) BETWEEN ? AND ?
            GROUP BY DATE(registered_date)";
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return $daily;
    }
    $stmt->bind_param('ss', $from_date, $to_date);
    if ($stmt->execute()) {
        foreach (get_result($stmt) as $row) {
            $date = (string)($row['report_date'] ?? '');
            if (isset($daily[$date])) {
                $daily[$date]['registrations'] = (int)($row['registrations'] ?? 0);
                $daily[$date]['returning'] = (int)($row['returning'] ?? 0);
                $daily[$date]['premium'] = (int)($row['premium'] ?? 0);
                $daily[$date]['activeSubs'] = (int)($row['activeSubs'] ?? 0);
            }
        }
    }
    $stmt->close();
    return $daily;
}

function app_trend_get_google_install_metrics($mysqli, $from_date, $to_date, $previous_from, $previous_to) {
    return app_trend_get_json_report_metrics(
        $mysqli,
        'fnd_google_play_installation_daily_reports',
        'packages_json',
        $from_date,
        $to_date,
        $previous_from,
        $previous_to,
        'app_trend_extract_install_package'
    );
}

function app_trend_get_google_sales_metrics($mysqli, $from_date, $to_date, $previous_from, $previous_to) {
    return app_trend_get_json_report_metrics(
        $mysqli,
        'fnd_google_play_sales_daily_reports',
        'items_json',
        $from_date,
        $to_date,
        $previous_from,
        $previous_to,
        'app_trend_extract_sales_item'
    );
}

function app_trend_get_google_subscription_metrics($mysqli, $from_date, $to_date, $previous_from, $previous_to) {
    return app_trend_get_json_report_metrics(
        $mysqli,
        'fnd_google_play_subscription_daily_reports',
        'products_json',
        $from_date,
        $to_date,
        $previous_from,
        $previous_to,
        'app_trend_extract_subscription_product'
    );
}

function app_trend_get_json_report_metrics($mysqli, $table, $json_column, $from_date, $to_date, $previous_from, $previous_to, $extractor) {
    $current = [];
    $previous = [];
    $daily = [];
    app_trend_read_json_report_period($mysqli, $table, $json_column, $from_date, $to_date, $extractor, $current, $daily);
    $ignored_daily = [];
    app_trend_read_json_report_period($mysqli, $table, $json_column, $previous_from, $previous_to, $extractor, $previous, $ignored_daily);
    return ['current' => $current, 'previous' => $previous, 'daily' => $daily];
}

function app_trend_read_json_report_period($mysqli, $table, $json_column, $from_date, $to_date, $extractor, &$bucket, &$daily) {
    $allowed = [
        'fnd_google_play_installation_daily_reports' => true,
        'fnd_google_play_sales_daily_reports' => true,
        'fnd_google_play_subscription_daily_reports' => true,
    ];
    if (!isset($allowed[$table])) {
        return;
    }
    $sql = "SELECT report_date, {$json_column} AS items_json FROM {$table} WHERE report_date BETWEEN ? AND ?";
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return;
    }
    $stmt->bind_param('ss', $from_date, $to_date);
    if ($stmt->execute()) {
        foreach (get_result($stmt) as $row) {
            $date = (string)($row['report_date'] ?? '');
            $items = json_decode((string)($row['items_json'] ?? '[]'), true);
            if (!is_array($items)) {
                continue;
            }
            foreach ($items as $item) {
                $metric = call_user_func($extractor, is_array($item) ? $item : []);
                $package = (string)($metric['packageName'] ?? '');
                if ($package === '') {
                    continue;
                }
                if (!isset($bucket[$package])) {
                    $bucket[$package] = app_trend_empty_app_metric();
                }
                $bucket[$package] = app_trend_merge_metric($bucket[$package], $metric);
                if (!isset($daily[$date])) {
                    $daily[$date] = [];
                }
                if (!isset($daily[$date][$package])) {
                    $daily[$date][$package] = app_trend_empty_app_metric();
                }
                $daily[$date][$package] = app_trend_merge_metric($daily[$date][$package], $metric);
            }
        }
    }
    $stmt->close();
}

function app_trend_extract_install_package($item) {
    $metric = app_trend_empty_app_metric();
    $metric['packageName'] = app_trend_item_package($item);
    $metric['installs'] = (int)($item['dailyUserInstalls'] ?? $item['daily_user_installs'] ?? $item['userInstalls'] ?? $item['installs'] ?? 0);
    return $metric;
}

function app_trend_extract_sales_item($item) {
    $metric = app_trend_empty_app_metric();
    $metric['packageName'] = app_trend_item_package($item);
    $transaction_type = strtolower((string)($item['transactionType'] ?? $item['transaction_type'] ?? ''));
    if (strpos($transaction_type, 'refund') !== false || strpos($transaction_type, 'chargeback') !== false) {
        $metric['refunds'] = 1;
    } elseif ($transaction_type === '' || strpos($transaction_type, 'charge') !== false || strpos($transaction_type, 'sale') !== false) {
        $metric['purchases'] = 1;
    }
    return $metric;
}

function app_trend_extract_subscription_product($item) {
    $metric = app_trend_empty_app_metric();
    $metric['packageName'] = app_trend_item_package($item);
    $metric['activeSubs'] = (int)($item['activeSubscriptions'] ?? $item['totalActiveSubscriptions'] ?? $item['active_subscriptions'] ?? 0);
    return $metric;
}

function app_trend_item_package($item) {
    foreach (['packageName', 'package_name', 'Package Name', 'package', 'appPackageName'] as $key) {
        if (isset($item[$key]) && trim((string)$item[$key]) !== '') {
            return trim((string)$item[$key]);
        }
    }
    return '';
}

function app_trend_find_metric($bucket, $package_name) {
    return $bucket[$package_name] ?? app_trend_empty_app_metric();
}

function app_trend_merge_daily_package(&$app_daily, $source_daily, $package_name, $keys) {
    foreach ($source_daily as $date => $packages) {
        if (!isset($app_daily[$date]) || !isset($packages[$package_name])) {
            continue;
        }
        foreach ($keys as $key) {
            $app_daily[$date][$key] += (int)($packages[$package_name][$key] ?? 0);
        }
    }
}

function app_trend_percent_delta($current, $previous) {
    $current = (int)$current;
    $previous = (int)$previous;
    if ($previous <= 0) {
        return $current > 0 ? 100 : 0;
    }
    return round((($current - $previous) / $previous) * 100, 1);
}

function app_trend_status($install_delta, $purchase_delta, $refund_delta) {
    if ($install_delta <= -20 || $purchase_delta <= -20 || $refund_delta >= 20) {
        return 'Alarm';
    }
    if ($install_delta < 0 || $purchase_delta < 0 || $refund_delta > 0) {
        return 'Watch';
    }
    return 'Robust';
}

?>
