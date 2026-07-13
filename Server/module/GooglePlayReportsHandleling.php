<?php

if ($tag === 'SAVE_GOOGLE_PLAY_SALES_REPORT' || $tag === 'SAVE_GOOGLE_PLAY_EARNINGS_REPORT') {
    handle_save_google_play_earnings_report($main_mysqli);
}

if ($tag === 'SAVE_GOOGLE_PLAY_INSTALLATION_DAILY_REPORT') {
    handle_save_google_play_installation_daily_report($main_mysqli);
}

if ($tag === 'SAVE_GOOGLE_PLAY_SUBSCRIPTION_DAILY_REPORT') {
    handle_save_google_play_subscription_daily_report($main_mysqli);
}

function handle_save_google_play_earnings_report($mysqli) {
    $raw = (string)($_POST['report_json'] ?? '');
    if ($raw === '') {
        send_json(['success' => false, 'error_msg' => 'report_json is required'], 400);
    }

    $report = json_decode($raw, true);
    if (!is_array($report)) {
        send_json(['success' => false, 'error_msg' => 'Invalid report_json payload'], 400);
    }

    $report_date = trim((string)($report['reportDate'] ?? ''));
    $rows = $report['rows'] ?? null;

    if (!preg_match('/^\d{4}-\d{2}$/', $report_date) || !is_array($rows) || count($rows) === 0) {
        send_json(['success' => false, 'error_msg' => 'Required report fields are missing or invalid'], 400);
    }

    $days = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $transaction_date = google_play_report_date($row, 'transactionDate');
        if ($transaction_date === null) {
            continue;
        }

        if (!isset($days[$transaction_date])) {
            $days[$transaction_date] = [
                'currency' => 'USD',
                'total_revenue' => 0.0,
                'total_google_fee' => 0.0,
                'total_proceeds' => 0.0,
                'items' => [],
            ];
        }

        $row_currency = trim((string)($row['merchantCurrency'] ?? ''));
        if ($row_currency !== '') {
            $days[$transaction_date]['currency'] = strtoupper(substr($row_currency, 0, 3));
        }

        $amount = google_play_report_float($row, 'amountMerchantCurrency');
        $transaction_type = google_play_report_string($row, 'transactionType');
        $transaction_type_normalized = strtolower($transaction_type);

        if ($transaction_type_normalized === 'google fee') {
            $days[$transaction_date]['total_google_fee'] += $amount;
        } elseif ($transaction_type_normalized === 'charge') {
            $days[$transaction_date]['total_revenue'] += $amount;
        }

        $days[$transaction_date]['total_proceeds'] += $amount;

        if ($transaction_type_normalized !== 'google fee') {
            $days[$transaction_date]['items'][] = [
                'sku' => google_play_report_string($row, 'skuId') ?: google_play_report_string($row, 'productId'),
                'productId' => google_play_report_string($row, 'productId'),
                'description' => google_play_report_string($row, 'description'),
                'transactionType' => $transaction_type,
                'buyerCountry' => google_play_report_string($row, 'buyerCountry'),
                'amountMerchantCurrency' => $amount,
            ];
        }
    }

    if (empty($days)) {
        send_json(['success' => false, 'error_msg' => 'No valid dated rows were found in the report'], 400);
    }

    try {
        $mysqli->begin_transaction();

        $delete_stmt = $mysqli->prepare('DELETE FROM fnd_google_play_sales_daily_reports WHERE report_month = ?');
        if (!$delete_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare cleanup statement');
        }
        $delete_stmt->bind_param('s', $report_date);
        if (!$delete_stmt->execute()) {
            $error = $delete_stmt->error ?: $mysqli->error;
            $delete_stmt->close();
            throw new Exception($error);
        }
        $delete_stmt->close();

        $insert_stmt = $mysqli->prepare(
            'INSERT INTO fnd_google_play_sales_daily_reports
                (report_month, report_date, item_count, total_revenue, total_google_fee, total_proceeds, currency, items_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        if (!$insert_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare insert statement');
        }

        ksort($days);
        $saved_days = 0;
        $saved_rows = 0;
        $total_revenue = 0.0;
        $total_google_fee = 0.0;
        $total_proceeds = 0.0;
        foreach ($days as $transaction_date => $day) {
            $items = $day['items'];
            $item_count = count($items);
            $day_total_revenue = (float)$day['total_revenue'];
            $day_total_google_fee = (float)$day['total_google_fee'];
            $day_total_proceeds = (float)$day['total_proceeds'];
            $currency = (string)$day['currency'];
            $items_json = json_encode(array_values($items), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $insert_stmt->bind_param(
                'ssidddss',
                $report_date,
                $transaction_date,
                $item_count,
                $day_total_revenue,
                $day_total_google_fee,
                $day_total_proceeds,
                $currency,
                $items_json
            );

            if (!$insert_stmt->execute()) {
                $error = $insert_stmt->error ?: $mysqli->error;
                $insert_stmt->close();
                throw new Exception($error);
            }

            $saved_days += 1;
            $saved_rows += $item_count;
            $total_revenue += $day_total_revenue;
            $total_google_fee += $day_total_google_fee;
            $total_proceeds += $day_total_proceeds;
        }

        $insert_stmt->close();
        $mysqli->commit();

        send_json([
            'success' => true,
            'saved_days' => $saved_days,
            'row_count' => $saved_rows,
            'total_revenue' => round($total_revenue, 2),
            'total_google_fee' => round($total_google_fee, 2),
            'total_proceeds' => round($total_proceeds, 2),
            'currency' => 'USD'
        ]);
    } catch (Throwable $error) {
        $mysqli->rollback();
        send_json(['success' => false, 'error_msg' => 'Failed to save Google Play report: ' . $error->getMessage()], 500);
    }
}

function handle_save_google_play_installation_daily_report($mysqli) {
    $raw = (string)($_POST['report_json'] ?? '');
    if ($raw === '') {
        send_json(['success' => false, 'error_msg' => 'report_json is required'], 400);
    }

    $report = json_decode($raw, true);
    if (!is_array($report)) {
        send_json(['success' => false, 'error_msg' => 'Invalid report_json payload'], 400);
    }

    $report_month = trim((string)($report['reportDate'] ?? ''));
    $days = $report['days'] ?? null;

    if (!preg_match('/^\d{4}-\d{2}$/', $report_month) || !is_array($days)) {
        send_json(['success' => false, 'error_msg' => 'Required report fields are missing or invalid'], 400);
    }

    try {
        $mysqli->begin_transaction();

        $delete_stmt = $mysqli->prepare('DELETE FROM fnd_google_play_installation_daily_reports WHERE report_month = ?');
        if (!$delete_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare cleanup statement');
        }
        $delete_stmt->bind_param('s', $report_month);
        if (!$delete_stmt->execute()) {
            $error = $delete_stmt->error ?: $mysqli->error;
            $delete_stmt->close();
            throw new Exception($error);
        }
        $delete_stmt->close();

        $insert_stmt = $mysqli->prepare(
            'INSERT INTO fnd_google_play_installation_daily_reports
                (report_month, report_date, package_count, total_daily_user_installs,
                 total_daily_user_uninstalls, total_active_device_installs, packages_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        if (!$insert_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare insert statement');
        }

        $saved_days = 0;
        foreach ($days as $day) {
            if (!is_array($day)) {
                continue;
            }

            $report_date = google_play_report_date_value($day['date'] ?? '');
            if ($report_date === null) {
                continue;
            }

            $packages = $day['packages'] ?? [];
            if (!is_array($packages)) {
                $packages = [];
            }

            $package_count = (int)($day['packageCount'] ?? count($packages));
            $total_daily_user_installs = (int)($day['totalDailyUserInstalls'] ?? 0);
            $total_daily_user_uninstalls = (int)($day['totalDailyUserUninstalls'] ?? 0);
            $total_active_device_installs = (int)($day['totalActiveDeviceInstalls'] ?? 0);
            $packages_json = json_encode(array_values($packages), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $insert_stmt->bind_param(
                'ssiiiis',
                $report_month,
                $report_date,
                $package_count,
                $total_daily_user_installs,
                $total_daily_user_uninstalls,
                $total_active_device_installs,
                $packages_json
            );

            if (!$insert_stmt->execute()) {
                $error = $insert_stmt->error ?: $mysqli->error;
                $insert_stmt->close();
                throw new Exception($error);
            }

            $saved_days += 1;
        }

        $insert_stmt->close();
        $mysqli->commit();

        send_json([
            'success' => true,
            'saved_days' => $saved_days
        ]);
    } catch (Throwable $error) {
        $mysqli->rollback();
        send_json(['success' => false, 'error_msg' => 'Failed to save installation report: ' . $error->getMessage()], 500);
    }
}

function handle_save_google_play_subscription_daily_report($mysqli) {
    $raw = (string)($_POST['report_json'] ?? '');
    if ($raw === '') {
        send_json(['success' => false, 'error_msg' => 'report_json is required'], 400);
    }

    $report = json_decode($raw, true);
    if (!is_array($report)) {
        send_json(['success' => false, 'error_msg' => 'Invalid report_json payload'], 400);
    }

    $report_month = trim((string)($report['reportDate'] ?? ''));
    $days = $report['days'] ?? null;

    if (!preg_match('/^\d{4}-\d{2}$/', $report_month) || !is_array($days)) {
        send_json(['success' => false, 'error_msg' => 'Required report fields are missing or invalid'], 400);
    }

    try {
        $mysqli->begin_transaction();

        $delete_stmt = $mysqli->prepare('DELETE FROM fnd_google_play_subscription_daily_reports WHERE report_month = ?');
        if (!$delete_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare cleanup statement');
        }
        $delete_stmt->bind_param('s', $report_month);
        if (!$delete_stmt->execute()) {
            $error = $delete_stmt->error ?: $mysqli->error;
            $delete_stmt->close();
            throw new Exception($error);
        }
        $delete_stmt->close();

        $insert_stmt = $mysqli->prepare(
            'INSERT INTO fnd_google_play_subscription_daily_reports
                (report_month, report_date, product_count, total_new_subscriptions,
                 total_cancelled_subscriptions, total_active_subscriptions, products_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        if (!$insert_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare insert statement');
        }

        $saved_days = 0;
        foreach ($days as $day) {
            if (!is_array($day)) {
                continue;
            }

            $report_date = google_play_report_date_value($day['date'] ?? '');
            if ($report_date === null) {
                continue;
            }

            $products = $day['products'] ?? [];
            if (!is_array($products)) {
                $products = [];
            }

            $product_count = (int)($day['productCount'] ?? count($products));
            $total_new_subscriptions = (int)($day['totalNewSubscriptions'] ?? 0);
            $total_cancelled_subscriptions = (int)($day['totalCancelledSubscriptions'] ?? 0);
            $total_active_subscriptions = (int)($day['totalActiveSubscriptions'] ?? 0);
            $products_json = json_encode(array_values($products), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $insert_stmt->bind_param(
                'ssiiiis',
                $report_month,
                $report_date,
                $product_count,
                $total_new_subscriptions,
                $total_cancelled_subscriptions,
                $total_active_subscriptions,
                $products_json
            );

            if (!$insert_stmt->execute()) {
                $error = $insert_stmt->error ?: $mysqli->error;
                $insert_stmt->close();
                throw new Exception($error);
            }

            $saved_days += 1;
        }

        $insert_stmt->close();
        $mysqli->commit();

        send_json([
            'success' => true,
            'saved_days' => $saved_days
        ]);
    } catch (Throwable $error) {
        $mysqli->rollback();
        send_json(['success' => false, 'error_msg' => 'Failed to save subscription report: ' . $error->getMessage()], 500);
    }
}

function google_play_report_string($row, $key) {
    if (!isset($row[$key]) || $row[$key] === null) {
        return null;
    }

    $value = trim((string)$row[$key]);
    return $value === '' ? null : $value;
}

function google_play_report_float($row, $key) {
    if (!isset($row[$key]) || $row[$key] === null || $row[$key] === '') {
        return 0.0;
    }

    return (float)$row[$key];
}

function google_play_report_date($row, $key) {
    $value = google_play_report_string($row, $key);
    return google_play_report_date_value($value);
}

function google_play_report_date_value($value) {
    $value = trim((string)$value);
    if ($value === null) {
        return null;
    }

    if ($value === '') {
        return null;
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return $value;
    }

    $timestamp = strtotime($value);
    if ($timestamp === false) {
        return null;
    }

    return date('Y-m-d', $timestamp);
}

?>
