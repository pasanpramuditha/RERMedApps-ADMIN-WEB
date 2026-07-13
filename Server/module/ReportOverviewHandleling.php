<?php

if ($tag === 'GET_REPORT_OVERVIEW') {
    handle_get_report_overview($main_mysqli);
}

function handle_get_report_overview($mysqli): void
{
    $year = isset($_POST['year']) ? (int)$_POST['year'] : (int)date('Y');
    if ($year < 2020 || $year > 2100) {
        send_json([
            'success' => false,
            'error_msg' => 'Invalid year.'
        ], 400);
    }

    try {
        send_json([
            'success' => true,
            'year' => $year,
            'statuses' => report_overview_build_statuses($mysqli, $year),
            'cronJobs' => report_overview_cron_runs($mysqli),
        ]);
    } catch (Throwable $error) {
        send_json([
            'success' => false,
            'error_msg' => 'Unable to load report overview: ' . $error->getMessage(),
        ], 500);
    }
}

function report_overview_definitions(): array
{
    return [
        'android' => [
            'title' => 'Android',
            'reports' => [
                'androidSales' => [
                    'name' => 'Android Sales',
                    'href' => '/google-play-reports',
                    'table' => 'fnd_google_play_sales_daily_reports',
                    'month_column' => 'report_month',
                    'total_column' => 'total_proceeds',
                    'total_label' => 'proceeds',
                    'format' => 'currency',
                ],
                'androidInstalls' => [
                    'name' => 'Android Installs',
                    'href' => '/installation-reports',
                    'table' => 'fnd_google_play_installation_daily_reports',
                    'month_column' => 'report_month',
                    'total_column' => 'total_daily_user_installs',
                    'total_label' => 'installs',
                    'format' => 'number',
                ],
                'androidSubscriptions' => [
                    'name' => 'Android Subscriptions',
                    'href' => '/android-subscription-reports',
                    'table' => 'fnd_google_play_subscription_daily_reports',
                    'month_column' => 'report_month',
                    'total_column' => 'total_active_subscriptions',
                    'total_label' => 'active subs',
                    'format' => 'number',
                ],
            ],
        ],
        'apple' => [
            'title' => 'Apple',
            'reports' => [
                'appleSales' => [
                    'name' => 'Apple Sales',
                    'href' => '/apple-sales-reports',
                    'table' => 'fnd_apple_sales_daily_reports',
                    'month_column' => 'report_month',
                    'total_column' => 'total_proceeds_usd',
                    'total_label' => 'proceeds',
                    'format' => 'currency',
                ],
                'appleInstalls' => [
                    'name' => 'Apple Installs',
                    'href' => '/apple-install-reports',
                    'table' => 'fnd_apple_install_daily_reports',
                    'month_column' => 'report_month',
                    'total_column' => 'total_units',
                    'total_label' => 'units',
                    'format' => 'number',
                ],
                'appleSubscriptions' => [
                    'name' => 'Apple Subscriptions',
                    'href' => '/apple-subscription-reports',
                    'table' => 'fnd_apple_subscription_daily_reports',
                    'month_column' => 'report_month',
                    'total_column' => 'total_active_subs',
                    'total_label' => 'active subs',
                    'format' => 'number',
                ],
            ],
        ],
    ];
}

function report_overview_cron_definitions(): array
{
    return [
        'sync_admob_daily_standalone' => [
            'jobKey' => 'sync_admob_daily_standalone',
            'jobName' => 'AdMob Daily Sync',
            'platform' => 'AdMob',
            'script' => 'sync_admob_daily_standalone.php',
        ],
        'sync_android_reports_standalone' => [
            'jobKey' => 'sync_android_reports_standalone',
            'jobName' => 'Android Reports Sync',
            'platform' => 'Android',
            'script' => 'sync_android_reports_standalone.php',
        ],
        'sync_apple_reports_standalone' => [
            'jobKey' => 'sync_apple_reports_standalone',
            'jobName' => 'Apple Reports Sync',
            'platform' => 'Apple',
            'script' => 'sync_apple_reports_standalone.php',
        ],
    ];
}

function report_overview_cron_runs(mysqli $mysqli): array
{
    $definitions = report_overview_cron_definitions();
    $table = 'fnd_report_cron_run_history';
    $tableExists = report_overview_table_exists($mysqli, $table);
    $runs = [];

    foreach ($definitions as $key => $definition) {
        $runs[$key] = [
            'jobKey' => $definition['jobKey'],
            'jobName' => $definition['jobName'],
            'platform' => $definition['platform'],
            'script' => $definition['script'],
            'status' => 'never',
            'mode' => null,
            'reportType' => null,
            'startedAt' => null,
            'finishedAt' => null,
            'durationSeconds' => 0,
            'rowsSaved' => 0,
            'reportRange' => null,
            'errorMessage' => null,
            'triggerSource' => null,
            'hasHistory' => false,
            'historyTableExists' => $tableExists,
        ];
    }

    if (!$tableExists) {
        return array_values($runs);
    }

    $quotedKeys = array_map(
        fn($key) => "'" . $mysqli->real_escape_string($key) . "'",
        array_keys($definitions)
    );
    $jobKeyList = implode(',', $quotedKeys);
    $sql = "
        SELECT id, job_key, job_name, platform, report_type, status, mode, started_at, finished_at,
               duration_seconds, rows_saved, report_range, error_message, trigger_source
        FROM {$table}
        WHERE id IN (
            SELECT MAX(id)
            FROM {$table}
            WHERE job_key IN ({$jobKeyList})
            GROUP BY job_key
        )
        ORDER BY FIELD(job_key, {$jobKeyList})
    ";

    $result = $mysqli->query($sql);
    if (!$result) {
        return array_values($runs);
    }

    while ($row = $result->fetch_assoc()) {
        $key = (string)($row['job_key'] ?? '');
        if (!isset($runs[$key])) {
            continue;
        }

        $runs[$key] = array_merge($runs[$key], [
            'jobName' => (string)($row['job_name'] ?: $runs[$key]['jobName']),
            'platform' => (string)($row['platform'] ?: $runs[$key]['platform']),
            'status' => (string)($row['status'] ?: 'never'),
            'mode' => $row['mode'] !== null ? (string)$row['mode'] : null,
            'reportType' => $row['report_type'] !== null ? (string)$row['report_type'] : null,
            'startedAt' => $row['started_at'] !== null ? (string)$row['started_at'] : null,
            'finishedAt' => $row['finished_at'] !== null ? (string)$row['finished_at'] : null,
            'durationSeconds' => round((float)($row['duration_seconds'] ?? 0), 3),
            'rowsSaved' => (int)($row['rows_saved'] ?? 0),
            'reportRange' => $row['report_range'] !== null ? (string)$row['report_range'] : null,
            'errorMessage' => $row['error_message'] !== null ? (string)$row['error_message'] : null,
            'triggerSource' => $row['trigger_source'] !== null ? (string)$row['trigger_source'] : null,
            'hasHistory' => true,
            'historyTableExists' => true,
        ]);
    }
    $result->free();

    return array_values($runs);
}

function report_overview_build_statuses(mysqli $mysqli, int $year): array
{
    $definitions = report_overview_definitions();
    $aggregates = [];

    foreach ($definitions as $section) {
        foreach ($section['reports'] as $key => $report) {
            $aggregates[$key] = report_overview_monthly_aggregate($mysqli, $report, $year);
        }
    }

    $month_names = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    $statuses = [];
    for ($month = 1; $month <= 12; $month++) {
        $month_key = sprintf('%04d-%02d', $year, $month);
        $sections = [];

        foreach ($definitions as $section_key => $section) {
            $reports = [];
            $uploaded_count = 0;

            foreach ($section['reports'] as $report_key => $report) {
                $row = $aggregates[$report_key][$month_key] ?? [
                    'days_count' => 0,
                    'row_count' => 0,
                    'total_value' => 0,
                    'table_exists' => $aggregates[$report_key]['__table_exists'] ?? false,
                ];

                $uploaded = ((int)($row['days_count'] ?? 0)) > 0;
                if ($uploaded) {
                    $uploaded_count++;
                }

                $reports[] = [
                    'key' => $report_key,
                    'name' => $report['name'],
                    'uploaded' => $uploaded,
                    'href' => $report['href'],
                    'daysCount' => (int)($row['days_count'] ?? 0),
                    'rowCount' => (int)($row['row_count'] ?? 0),
                    'totalValue' => round((float)($row['total_value'] ?? 0), 2),
                    'totalLabel' => $report['total_label'],
                    'format' => $report['format'],
                    'tableExists' => (bool)($row['table_exists'] ?? false),
                ];
            }

            $report_count = count($reports);
            $sections[$section_key] = [
                'title' => $section['title'],
                'uploadedCount' => $uploaded_count,
                'reportCount' => $report_count,
                'allUploaded' => $report_count > 0 && $uploaded_count === $report_count,
                'reports' => $reports,
            ];
        }

        $statuses[] = [
            'month' => $month_names[$month - 1],
            'monthKey' => $month_key,
            'sections' => $sections,
        ];
    }

    return $statuses;
}

function report_overview_table_exists(mysqli $mysqli, string $table): bool
{
    $stmt = $mysqli->prepare(
        'SELECT 1
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
         LIMIT 1'
    );

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('s', $table);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $rows = get_result($stmt);
    $stmt->close();

    return !empty($rows);
}

function report_overview_monthly_aggregate(mysqli $mysqli, array $report, int $year): array
{
    $table = (string)$report['table'];
    $exists = report_overview_table_exists($mysqli, $table);
    $result = ['__table_exists' => $exists];

    if (!$exists) {
        return $result;
    }

    $total_column = preg_replace('/[^a-zA-Z0-9_]/', '', (string)$report['total_column']);
    $from_month = sprintf('%04d-01', $year);
    $to_month = sprintf('%04d-12', $year);

    if (isset($report['month_column'])) {
        $month_column = preg_replace('/[^a-zA-Z0-9_]/', '', (string)$report['month_column']);
        $sql = "
            SELECT
                {$month_column} AS month_key,
                COUNT(*) AS days_count,
                COUNT(*) AS row_count,
                COALESCE(SUM({$total_column}), 0) AS total_value
            FROM {$table}
            WHERE {$month_column} BETWEEN ? AND ?
            GROUP BY {$month_column}
        ";
    } else {
        $date_column = preg_replace('/[^a-zA-Z0-9_]/', '', (string)$report['date_column']);
        $from_date = sprintf('%04d-01-01', $year);
        $to_date = sprintf('%04d-12-31', $year);
        $sql = "
            SELECT
                DATE_FORMAT({$date_column}, '%Y-%m') AS month_key,
                COUNT(DISTINCT {$date_column}) AS days_count,
                COUNT(*) AS row_count,
                COALESCE(SUM({$total_column}), 0) AS total_value
            FROM {$table}
            WHERE {$date_column} BETWEEN ? AND ?
            GROUP BY DATE_FORMAT({$date_column}, '%Y-%m')
        ";
        $from_month = $from_date;
        $to_month = $to_date;
    }

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return $result;
    }

    $stmt->bind_param('ss', $from_month, $to_month);
    if (!$stmt->execute()) {
        $stmt->close();
        return $result;
    }

    $rows = get_result($stmt);
    $stmt->close();

    foreach ($rows as $row) {
        $month_key = (string)($row['month_key'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}$/', $month_key)) {
            continue;
        }

        $result[$month_key] = [
            'days_count' => (int)($row['days_count'] ?? 0),
            'row_count' => (int)($row['row_count'] ?? 0),
            'total_value' => (float)($row['total_value'] ?? 0),
            'table_exists' => true,
        ];
    }

    return $result;
}

?>
