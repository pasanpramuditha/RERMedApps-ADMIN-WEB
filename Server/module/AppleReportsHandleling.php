<?php

if ($tag === 'SAVE_APPLE_SALES_DAILY_REPORT') {
    handle_save_apple_sales_daily_report($main_mysqli);
}

if ($tag === 'SAVE_APPLE_INSTALL_DAILY_REPORT') {
    handle_save_apple_install_daily_report($main_mysqli);
}

if ($tag === 'SAVE_APPLE_SUBSCRIPTION_DAILY_REPORT') {
    handle_save_apple_subscription_daily_report($main_mysqli);
}

function handle_save_apple_sales_daily_report($mysqli) {
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

        $delete_stmt = $mysqli->prepare('DELETE FROM fnd_apple_sales_daily_reports WHERE report_month = ?');
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
            'INSERT INTO fnd_apple_sales_daily_reports
                (report_month, report_date, item_count, total_sales_usd, total_proceeds_usd, items_json)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        if (!$insert_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare insert statement');
        }

        $saved_days = 0;
        foreach ($days as $day) {
            if (!is_array($day)) {
                continue;
            }

            $report_date = apple_report_date($day['date'] ?? '');
            if ($report_date === null) {
                continue;
            }

            $items = $day['items'] ?? [];
            if (!is_array($items)) {
                $items = [];
            }

            $item_count = (int)($day['itemCount'] ?? count($items));
            $total_sales_usd = (float)($day['totalSalesUSD'] ?? 0);
            $total_proceeds_usd = (float)($day['totalProceedsUSD'] ?? 0);
            $items_json = json_encode(array_values($items), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $insert_stmt->bind_param(
                'ssidds',
                $report_month,
                $report_date,
                $item_count,
                $total_sales_usd,
                $total_proceeds_usd,
                $items_json
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
        send_json(['success' => false, 'error_msg' => 'Failed to save Apple sales report: ' . $error->getMessage()], 500);
    }
}

function handle_save_apple_install_daily_report($mysqli) {
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

        $delete_stmt = $mysqli->prepare('DELETE FROM fnd_apple_install_daily_reports WHERE report_month = ?');
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
            'INSERT INTO fnd_apple_install_daily_reports
                (report_month, report_date, item_count, total_units, items_json)
             VALUES (?, ?, ?, ?, ?)'
        );
        if (!$insert_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare insert statement');
        }

        $saved_days = 0;
        foreach ($days as $day) {
            if (!is_array($day)) {
                continue;
            }

            $report_date = apple_report_date($day['date'] ?? '');
            if ($report_date === null) {
                continue;
            }

            $items = $day['items'] ?? [];
            if (!is_array($items)) {
                $items = [];
            }

            $item_count = (int)($day['itemCount'] ?? count($items));
            $total_units = (int)($day['totalUnits'] ?? 0);
            $items_json = json_encode(array_values($items), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $insert_stmt->bind_param(
                'ssiis',
                $report_month,
                $report_date,
                $item_count,
                $total_units,
                $items_json
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
        send_json(['success' => false, 'error_msg' => 'Failed to save Apple install report: ' . $error->getMessage()], 500);
    }
}

function handle_save_apple_subscription_daily_report($mysqli) {
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

        $delete_stmt = $mysqli->prepare('DELETE FROM fnd_apple_subscription_daily_reports WHERE report_month = ?');
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
            'INSERT INTO fnd_apple_subscription_daily_reports
                (report_month, report_date, item_count, total_active_subs, items_json)
             VALUES (?, ?, ?, ?, ?)'
        );
        if (!$insert_stmt) {
            throw new Exception($mysqli->error ?: 'Unable to prepare insert statement');
        }

        $saved_days = 0;
        foreach ($days as $day) {
            if (!is_array($day)) {
                continue;
            }

            $report_date = apple_report_date($day['date'] ?? '');
            if ($report_date === null) {
                continue;
            }

            $items = $day['items'] ?? [];
            if (!is_array($items)) {
                $items = [];
            }

            $item_count = (int)($day['itemCount'] ?? count($items));
            $total_active_subs = (int)($day['totalActiveSubs'] ?? 0);
            $items_json = json_encode(array_values($items), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $insert_stmt->bind_param(
                'ssiis',
                $report_month,
                $report_date,
                $item_count,
                $total_active_subs,
                $items_json
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
        send_json(['success' => false, 'error_msg' => 'Failed to save Apple subscription report: ' . $error->getMessage()], 500);
    }
}

function apple_report_date($value) {
    $value = trim((string)$value);
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
