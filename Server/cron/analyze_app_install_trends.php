<?php

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Colombo');

const TREND_MAIN_DB_HOST = 'localhost';
const TREND_MAIN_DB_USER = 'rermedap';
const TREND_MAIN_DB_PASS = 'Med';
const TREND_MAIN_DB_NAME = 'rermedap_';
const TREND_MAIN_DB_PORT = 3306;

const TREND_APP_DB_HOST = 'localhost';
const TREND_APP_DB_USER = 'rermedap';
const TREND_APP_DB_PASS = 'Med';
const TREND_APP_DB_PORT = 3306;

trend_main($argv ?? []);

function trend_main(array $argv): void
{
    $startedAt = trend_now();
    $runId = null;
    $main_mysqli = null;

    try {
        $main_mysqli = trend_main_database();
        $args = PHP_SAPI === 'cli' ? trend_cli_args($argv) : $_GET;
        $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Colombo'));
        $slotHours = max(1, (int) trend_arg($args, 'slot-hours', 6));
        $runSlot = trend_floor_slot($now, $slotHours);
        $cutoffTime = trend_arg($args, 'cutoff-time', $now->format('H:i:s'));
        $targetDate = trend_arg($args, 'date', $now->format('Y-m-d'));
        $platformFilter = strtolower((string) trend_arg($args, 'platform', 'all'));
        $groupName = (string) trend_arg($args, 'group', getenv('APP_TREND_WHATSAPP_GROUP') ?: 'INFO');
        $twoDayThreshold = (float) trend_arg($args, 'threshold', getenv('APP_TREND_TWO_DAY_DROP_THRESHOLD') ?: 50);
        $previousDayThreshold = (float) trend_arg($args, 'previous-threshold', getenv('APP_TREND_PREVIOUS_DAY_DROP_THRESHOLD') ?: 35);
        $minBaseline = (int) trend_arg($args, 'min-baseline', getenv('APP_TREND_MIN_BASELINE_INSTALLS') ?: 20);
        $dryRun = trend_bool_arg($args, 'dry-run', false);

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $targetDate)) {
            throw new Exception('Invalid date. Use YYYY-MM-DD.');
        }
        if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $cutoffTime)) {
            throw new Exception('Invalid cutoff-time. Use HH:MM:SS.');
        }
        if (!in_array($platformFilter, ['all', 'android', 'ios'], true)) {
            throw new Exception('Invalid platform. Use all, android, or ios.');
        }

        $windows = trend_windows($targetDate, $cutoffTime);
        $runId = $dryRun ? 0 : trend_create_run(
            $main_mysqli,
            $runSlot,
            $targetDate,
            $windows['current'][0],
            $windows['current'][1],
            $startedAt
        );

        $apps = trend_active_apps($main_mysqli);
        $summary = [
            'success' => true,
            'dry_run' => $dryRun,
            'run_id' => $runId,
            'analysis_slot' => $runSlot,
            'target_date' => $targetDate,
            'window_started_at' => $windows['current'][0],
            'window_ended_at' => $windows['current'][1],
            'thresholds' => [
                'two_day_drop_percent' => $twoDayThreshold,
                'previous_day_drop_percent' => $previousDayThreshold,
                'min_baseline_installs' => $minBaseline,
            ],
            'apps_checked' => 0,
            'metrics_saved' => 0,
            'alerts_created' => 0,
            'messages_queued' => 0,
            'warnings' => [],
            'alerts' => [],
        ];
        $alertsForMessage = [];

        foreach ($apps as $app) {
            $platform = trend_platform($app);
            if ($platformFilter !== 'all' && $platform !== $platformFilter) {
                continue;
            }

            $dbName = trim((string) ($app['db_name'] ?? ''));
            if ($dbName === '') {
                $summary['warnings'][] = trend_warning($app, 'Missing app database name.');
                continue;
            }

            $appDb = trend_connect_app_database($dbName);
            if ($appDb === null) {
                $summary['warnings'][] = trend_warning($app, 'Unable to connect to app database.');
                continue;
            }

            $registrationTable = trend_registration_table($appDb, $platform);
            if ($registrationTable === '') {
                $summary['warnings'][] = trend_warning($app, 'No registration table with registered_date was found.');
                $appDb->close();
                continue;
            }

            $counts = [
                'current' => trend_count_registrations($appDb, $registrationTable, $windows['current'][0], $windows['current'][1]),
                'previous' => trend_count_registrations($appDb, $registrationTable, $windows['previous'][0], $windows['previous'][1]),
                'two_days_ago' => trend_count_registrations($appDb, $registrationTable, $windows['two_days_ago'][0], $windows['two_days_ago'][1]),
            ];
            $appDb->close();

            $summary['apps_checked']++;

            $previousDrop = trend_drop_percent($counts['current'], $counts['previous']);
            $twoDayDrop = trend_drop_percent($counts['current'], $counts['two_days_ago']);

            if (!$dryRun) {
                trend_save_metric(
                    $main_mysqli,
                    $runId,
                    $app,
                    $platform,
                    $dbName,
                    $registrationTable,
                    $targetDate,
                    $runSlot,
                    $windows['current'][0],
                    $windows['current'][1],
                    $counts,
                    $previousDrop,
                    $twoDayDrop
                );
                $summary['metrics_saved']++;
            }

            $candidateAlerts = trend_alert_candidates(
                $app,
                $platform,
                $dbName,
                $registrationTable,
                $targetDate,
                $runSlot,
                $windows,
                $counts,
                $previousDrop,
                $twoDayDrop,
                $previousDayThreshold,
                $twoDayThreshold,
                $minBaseline
            );

            foreach ($candidateAlerts as $alert) {
                if ($dryRun) {
                    $summary['alerts_created']++;
                    $summary['alerts'][] = $alert;
                    $alertsForMessage[] = $alert;
                    continue;
                }

                $alertId = trend_insert_alert($main_mysqli, $runId, $alert);
                if ($alertId <= 0) {
                    continue;
                }

                $alert['id'] = $alertId;
                $alert['whatsapp_queue_id'] = null;
                $summary['alerts_created']++;
                $summary['alerts'][] = $alert;
                $alertsForMessage[] = $alert;
            }
        }

        if (!empty($alertsForMessage)) {
            $summaryMessage = trend_summary_message($alertsForMessage, $targetDate, $windows['current'][1]);
            if ($dryRun) {
                $summary['messages_queued'] = 1;
                $summary['summary_message'] = $summaryMessage;
            } else {
                $queueId = trend_queue_whatsapp_summary_message($main_mysqli, $runId, $groupName, $summaryMessage);
                if ($queueId > 0) {
                    trend_mark_alerts_queued($main_mysqli, array_column($alertsForMessage, 'id'), $queueId);
                    foreach ($summary['alerts'] as &$summaryAlert) {
                        if (isset($summaryAlert['id']) && in_array((int) $summaryAlert['id'], array_column($alertsForMessage, 'id'), true)) {
                            $summaryAlert['whatsapp_queue_id'] = $queueId;
                        }
                    }
                    unset($summaryAlert);
                    $summary['messages_queued'] = 1;
                }
                $summary['summary_message'] = $summaryMessage;
            }
        }

        if (!$dryRun) {
            trend_finish_run($main_mysqli, $runId, 'success', $summary, null, $startedAt);
        }

        trend_output($summary);
    } catch (Throwable $error) {
        $payload = [
            'success' => false,
            'error_msg' => $error->getMessage(),
        ];

        if ($main_mysqli instanceof mysqli && $runId !== null && $runId > 0) {
            trend_finish_run($main_mysqli, $runId, 'failed', $payload, $error->getMessage(), $startedAt);
        }

        trend_output($payload);
    }
}

function trend_main_database(): mysqli
{
    return trend_connect_database(
        TREND_MAIN_DB_HOST,
        TREND_MAIN_DB_USER,
        TREND_MAIN_DB_PASS,
        TREND_MAIN_DB_NAME,
        TREND_MAIN_DB_PORT
    );
}

function trend_connect_database(string $host, string $user, string $pass, string $database, int $port): mysqli
{
    try {
        $mysqli = @new mysqli($host, $user, $pass, $database, $port);
    } catch (Throwable $error) {
        throw new Exception('Unable to connect to database: ' . $database);
    }

    if ($mysqli->connect_error) {
        throw new Exception('Unable to connect to database: ' . $database);
    }

    if (!$mysqli->set_charset('utf8mb4')) {
        throw new Exception('Unable to set database charset: ' . $database);
    }

    $mysqli->query("SET time_zone = '+05:30'");
    return $mysqli;
}

function trend_cli_args(array $argv): array
{
    $args = [];
    foreach (array_slice($argv, 1) as $arg) {
        if (strpos($arg, '--') !== 0) {
            continue;
        }
        $arg = substr($arg, 2);
        $parts = explode('=', $arg, 2);
        $args[$parts[0]] = $parts[1] ?? '1';
    }
    return $args;
}

function trend_arg(array $args, string $key, $default)
{
    return isset($args[$key]) && (string) $args[$key] !== '' ? $args[$key] : $default;
}

function trend_bool_arg(array $args, string $key, bool $default): bool
{
    if (!isset($args[$key])) {
        return $default;
    }
    return in_array(strtolower((string) $args[$key]), ['1', 'true', 'yes', 'on'], true);
}

function trend_now(): string
{
    return date('Y-m-d H:i:s');
}

function trend_floor_slot(DateTimeImmutable $now, int $slotHours): string
{
    $hour = (int) $now->format('G');
    $slotHour = intdiv($hour, $slotHours) * $slotHours;
    return $now->setTime($slotHour, 0, 0)->format('Y-m-d H:i:s');
}

function trend_windows(string $targetDate, string $cutoffTime): array
{
    $previous = date('Y-m-d', strtotime($targetDate . ' -1 day'));
    $twoDaysAgo = date('Y-m-d', strtotime($targetDate . ' -2 days'));

    return [
        'current' => [$targetDate . ' 00:00:00', $targetDate . ' ' . $cutoffTime],
        'previous' => [$previous . ' 00:00:00', $previous . ' ' . $cutoffTime],
        'two_days_ago' => [$twoDaysAgo . ' 00:00:00', $twoDaysAgo . ' ' . $cutoffTime],
        'previous_date' => $previous,
        'two_days_ago_date' => $twoDaysAgo,
    ];
}

function trend_active_apps(mysqli $mysqli): array
{
    $sql = "SELECT id, name, db_name, os
            FROM fnd_app_details_tab
            WHERE CAST(status AS UNSIGNED) = 2
              AND db_name IS NOT NULL
              AND db_name != ''
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

function trend_platform(array $app): string
{
    $os = strtolower(trim((string) ($app['os'] ?? '')));
    if (strpos($os, 'ios') !== false || strpos($os, 'apple') !== false) {
        return 'ios';
    }
    return 'android';
}

function trend_connect_app_database(string $dbName): ?mysqli
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $dbName)) {
        return null;
    }

    try {
        $mysqli = @new mysqli(TREND_APP_DB_HOST, TREND_APP_DB_USER, TREND_APP_DB_PASS, $dbName, TREND_APP_DB_PORT);
    } catch (Throwable $error) {
        return null;
    }

    if ($mysqli->connect_error) {
        return null;
    }
    $mysqli->set_charset('utf8');
    $mysqli->query("SET time_zone = '+05:30'");
    return $mysqli;
}

function trend_table_columns(mysqli $mysqli, string $table): array
{
    $columns = [];
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        return $columns;
    }

    $result = @$mysqli->query("SHOW COLUMNS FROM {$table}");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $field = (string) ($row['Field'] ?? '');
            if ($field !== '') {
                $columns[$field] = true;
            }
        }
        $result->free();
    }
    return $columns;
}

function trend_registration_table(mysqli $mysqli, string $platform): string
{
    $candidates = $platform === 'ios'
        ? ['fnd_ios_registration_tab', 'fnd_registration_tab']
        : ['fnd_registration_tab'];

    foreach ($candidates as $table) {
        $columns = trend_table_columns($mysqli, $table);
        if (isset($columns['registered_date'])) {
            return $table;
        }
    }

    return '';
}

function trend_count_registrations(mysqli $mysqli, string $table, string $fromDateTime, string $toDateTime): int
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        return 0;
    }

    $sql = "SELECT COUNT(*) AS count FROM {$table} WHERE registered_date BETWEEN ? AND ?";
    $stmt = @$mysqli->prepare($sql);
    if (!$stmt) {
        return 0;
    }

    $count = 0;
    $stmt->bind_param('ss', $fromDateTime, $toDateTime);
    if ($stmt->execute()) {
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $count = (int) ($row['count'] ?? 0);
        }
        $result->free();
    }
    $stmt->close();

    return $count;
}

function trend_drop_percent(int $current, int $baseline): ?float
{
    if ($baseline <= 0) {
        return null;
    }
    return round((($baseline - $current) / $baseline) * 100, 2);
}

function trend_alert_candidates(
    array $app,
    string $platform,
    string $dbName,
    string $registrationTable,
    string $targetDate,
    string $runSlot,
    array $windows,
    array $counts,
    ?float $previousDrop,
    ?float $twoDayDrop,
    float $previousDayThreshold,
    float $twoDayThreshold,
    int $minBaseline
): array {
    $alerts = [];

    if ($twoDayDrop !== null && $counts['two_days_ago'] >= $minBaseline && $twoDayDrop >= $twoDayThreshold) {
        $alerts[] = trend_build_alert(
            $app,
            $platform,
            $dbName,
            $registrationTable,
            $targetDate,
            $runSlot,
            $windows,
            $counts,
            $windows['two_days_ago_date'],
            $counts['two_days_ago'],
            $twoDayDrop,
            $twoDayThreshold,
            'drop_vs_two_days_ago'
        );
        return $alerts;
    }

    if ($previousDrop !== null && $counts['previous'] >= $minBaseline && $previousDrop >= $previousDayThreshold) {
        $alerts[] = trend_build_alert(
            $app,
            $platform,
            $dbName,
            $registrationTable,
            $targetDate,
            $runSlot,
            $windows,
            $counts,
            $windows['previous_date'],
            $counts['previous'],
            $previousDrop,
            $previousDayThreshold,
            'drop_vs_previous_day'
        );
    }

    return $alerts;
}

function trend_build_alert(
    array $app,
    string $platform,
    string $dbName,
    string $registrationTable,
    string $targetDate,
    string $runSlot,
    array $windows,
    array $counts,
    string $baselineDate,
    int $baselineInstalls,
    float $dropPercent,
    float $thresholdPercent,
    string $alertType
): array {
    $appName = (string) ($app['name'] ?? 'Unknown App');
    $severity = $dropPercent >= 60 ? 'critical' : 'watch';
    $message = trend_message(
        $appName,
        $platform,
        $targetDate,
        $windows['current'][1],
        $counts,
        $baselineDate,
        $baselineInstalls,
        $dropPercent,
        $alertType
    );

    return [
        'app_id' => (int) ($app['id'] ?? 0),
        'app_name' => $appName,
        'platform' => $platform,
        'app_db' => $dbName,
        'registration_table' => $registrationTable,
        'metric_date' => $targetDate,
        'analysis_slot' => $runSlot,
        'window_started_at' => $windows['current'][0],
        'window_ended_at' => $windows['current'][1],
        'current_installs' => $counts['current'],
        'previous_day_installs' => $counts['previous'],
        'two_days_ago_installs' => $counts['two_days_ago'],
        'baseline_date' => $baselineDate,
        'baseline_installs' => $baselineInstalls,
        'drop_percent' => $dropPercent,
        'threshold_percent' => $thresholdPercent,
        'alert_type' => $alertType,
        'severity' => $severity,
        'message' => $message,
    ];
}

function trend_message(
    string $appName,
    string $platform,
    string $targetDate,
    string $windowEndedAt,
    array $counts,
    string $baselineDate,
    int $baselineInstalls,
    float $dropPercent,
    string $alertType
): string {
    $comparison = $alertType === 'drop_vs_previous_day' ? 'yesterday' : 'two days ago';
    return "App Install Drop Alert\n"
        . "----------------------\n"
        . "{$appName}\n"
        . "Platform: " . strtoupper($platform) . "\n"
        . "Date: {$targetDate}\n"
        . "Checked until: {$windowEndedAt}\n\n"
        . "Today: {$counts['current']}\n"
        . "Yesterday: {$counts['previous']}\n"
        . "Two days ago: {$counts['two_days_ago']}\n\n"
        . "Drop: " . number_format($dropPercent, 1) . "% vs {$comparison} ({$baselineDate}: {$baselineInstalls})";
}

function trend_summary_message(array $alerts, string $targetDate, string $windowEndedAt): string
{
    usort($alerts, function ($a, $b) {
        $dropCompare = (float) ($b['drop_percent'] ?? 0) <=> (float) ($a['drop_percent'] ?? 0);
        if ($dropCompare !== 0) {
            return $dropCompare;
        }
        return strcmp((string) ($a['app_name'] ?? ''), (string) ($b['app_name'] ?? ''));
    });

    $lines = [
        'App Install Drop Alerts',
        '-----------------------',
        'Date: ' . $targetDate,
        'Checked until: ' . $windowEndedAt,
        'Apps: ' . count($alerts),
        '',
    ];

    $index = 1;
    foreach ($alerts as $alert) {
        $comparison = ($alert['alert_type'] ?? '') === 'drop_vs_previous_day' ? 'yesterday' : 'two days ago';
        $lines[] = $index . '. ' . (string) ($alert['app_name'] ?? 'Unknown App') . ' [' . strtoupper((string) ($alert['platform'] ?? '')) . ']';
        $lines[] = 'Today: ' . (int) ($alert['current_installs'] ?? 0)
            . ' | Yesterday: ' . (int) ($alert['previous_day_installs'] ?? 0)
            . ' | Two days ago: ' . (int) ($alert['two_days_ago_installs'] ?? 0);
        $lines[] = 'Drop: ' . number_format((float) ($alert['drop_percent'] ?? 0), 1)
            . '% vs ' . $comparison
            . ' (' . (string) ($alert['baseline_date'] ?? '') . ': ' . (int) ($alert['baseline_installs'] ?? 0) . ')';
        $lines[] = '';
        $index++;
    }

    return rtrim(implode("\n", $lines));
}

function trend_save_metric(
    mysqli $mysqli,
    int $runId,
    array $app,
    string $platform,
    string $dbName,
    string $registrationTable,
    string $targetDate,
    string $runSlot,
    string $windowStartedAt,
    string $windowEndedAt,
    array $counts,
    ?float $previousDrop,
    ?float $twoDayDrop
): void {
    $stmt = $mysqli->prepare(
        'INSERT IGNORE INTO fnd_app_install_trend_app_metrics
            (run_id, app_id, app_name, platform, app_db, registration_table, metric_date,
             analysis_slot, window_started_at, window_ended_at, current_installs,
             previous_day_installs, two_days_ago_installs, previous_day_drop_percent,
             two_day_drop_percent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare trend metric insert.');
    }

    $appId = (int) ($app['id'] ?? 0);
    $appName = (string) ($app['name'] ?? 'Unknown App');
    $current = (int) $counts['current'];
    $previous = (int) $counts['previous'];
    $twoDaysAgo = (int) $counts['two_days_ago'];
    $previousDropValue = $previousDrop === null ? null : (float) $previousDrop;
    $twoDayDropValue = $twoDayDrop === null ? null : (float) $twoDayDrop;

    $stmt->bind_param(
        'iissssssssiiidd',
        $runId,
        $appId,
        $appName,
        $platform,
        $dbName,
        $registrationTable,
        $targetDate,
        $runSlot,
        $windowStartedAt,
        $windowEndedAt,
        $current,
        $previous,
        $twoDaysAgo,
        $previousDropValue,
        $twoDayDropValue
    );
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error);
    }
    $stmt->close();
}

function trend_insert_alert(mysqli $mysqli, int $runId, array $alert): int
{
    $stmt = $mysqli->prepare(
        'INSERT IGNORE INTO fnd_app_install_trend_alerts
            (run_id, app_id, app_name, platform, app_db, registration_table, metric_date,
             analysis_slot, window_started_at, window_ended_at, current_installs,
             previous_day_installs, two_days_ago_installs, baseline_date, baseline_installs,
             drop_percent, threshold_percent, alert_type, severity, message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare trend alert insert.');
    }

    $appId = (int) $alert['app_id'];
    $appName = (string) $alert['app_name'];
    $platform = (string) $alert['platform'];
    $appDb = (string) $alert['app_db'];
    $registrationTable = (string) $alert['registration_table'];
    $metricDate = (string) $alert['metric_date'];
    $analysisSlot = (string) $alert['analysis_slot'];
    $windowStartedAt = (string) $alert['window_started_at'];
    $windowEndedAt = (string) $alert['window_ended_at'];
    $currentInstalls = (int) $alert['current_installs'];
    $previousDayInstalls = (int) $alert['previous_day_installs'];
    $twoDaysAgoInstalls = (int) $alert['two_days_ago_installs'];
    $baselineDate = (string) $alert['baseline_date'];
    $baselineInstalls = (int) $alert['baseline_installs'];
    $dropPercent = (float) $alert['drop_percent'];
    $thresholdPercent = (float) $alert['threshold_percent'];
    $alertType = (string) $alert['alert_type'];
    $severity = (string) $alert['severity'];
    $message = (string) $alert['message'];

    $stmt->bind_param(
        'iissssssssiiisiddsss',
        $runId,
        $appId,
        $appName,
        $platform,
        $appDb,
        $registrationTable,
        $metricDate,
        $analysisSlot,
        $windowStartedAt,
        $windowEndedAt,
        $currentInstalls,
        $previousDayInstalls,
        $twoDaysAgoInstalls,
        $baselineDate,
        $baselineInstalls,
        $dropPercent,
        $thresholdPercent,
        $alertType,
        $severity,
        $message
    );

    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error);
    }

    $inserted = $stmt->affected_rows > 0 ? (int) $mysqli->insert_id : 0;
    $stmt->close();
    return $inserted;
}

function trend_queue_whatsapp_summary_message(mysqli $mysqli, int $runId, string $groupName, string $message): int
{
    $sourceType = 'app_install_trend_run';
    $stmt = $mysqli->prepare(
        "INSERT IGNORE INTO fnd_whatsapp_message_queue
            (source_type, source_id, group_name, message, status, next_attempt_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())"
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare WhatsApp queue insert.');
    }

    $stmt->bind_param('siss', $sourceType, $runId, $groupName, $message);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error);
    }

    $queueId = $stmt->affected_rows > 0 ? (int) $mysqli->insert_id : 0;
    $stmt->close();
    return $queueId;
}

function trend_mark_alerts_queued(mysqli $mysqli, array $alertIds, int $queueId): void
{
    $status = 'queued';
    $alertIds = array_values(array_unique(array_filter(array_map('intval', $alertIds))));
    if (empty($alertIds)) {
        return;
    }

    $stmt = $mysqli->prepare('UPDATE fnd_app_install_trend_alerts SET status = ?, whatsapp_queue_id = ? WHERE id = ? LIMIT 1');
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare trend alert queue update.');
    }
    foreach ($alertIds as $alertId) {
        $stmt->bind_param('sii', $status, $queueId, $alertId);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            throw new Exception($error);
        }
    }
    $stmt->close();
}

function trend_create_run(
    mysqli $mysqli,
    string $runSlot,
    string $targetDate,
    string $windowStartedAt,
    string $windowEndedAt,
    string $startedAt
): int {
    $status = 'failed';
    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_app_install_trend_runs
            (run_slot, target_date, window_started_at, window_ended_at, status, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare trend run insert.');
    }
    $stmt->bind_param('sssssss', $runSlot, $targetDate, $windowStartedAt, $windowEndedAt, $status, $startedAt, $startedAt);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error);
    }
    $runId = (int) $mysqli->insert_id;
    $stmt->close();
    return $runId;
}

function trend_finish_run(mysqli $mysqli, int $runId, string $status, array $summary, ?string $error, string $startedAt): void
{
    $finishedAt = trend_now();
    $summaryJson = json_encode($summary, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $appsChecked = (int) ($summary['apps_checked'] ?? 0);
    $metricsSaved = (int) ($summary['metrics_saved'] ?? 0);
    $alertsCreated = (int) ($summary['alerts_created'] ?? 0);
    $messagesQueued = (int) ($summary['messages_queued'] ?? 0);

    $stmt = $mysqli->prepare(
        'UPDATE fnd_app_install_trend_runs
         SET status = ?, apps_checked = ?, metrics_saved = ?, alerts_created = ?,
             messages_queued = ?, summary_json = ?, error_message = ?, started_at = ?, finished_at = ?
         WHERE id = ?
         LIMIT 1'
    );
    if (!$stmt) {
        return;
    }
    $stmt->bind_param(
        'siiiissssi',
        $status,
        $appsChecked,
        $metricsSaved,
        $alertsCreated,
        $messagesQueued,
        $summaryJson,
        $error,
        $startedAt,
        $finishedAt,
        $runId
    );
    $stmt->execute();
    $stmt->close();
}

function trend_warning(array $app, string $message): array
{
    return [
        'app_id' => (int) ($app['id'] ?? 0),
        'app_name' => (string) ($app['name'] ?? ''),
        'db_name' => (string) ($app['db_name'] ?? ''),
        'message' => $message,
    ];
}

function trend_output(array $payload): void
{
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
