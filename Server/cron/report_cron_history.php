<?php

function report_cron_history_now(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('Asia/Colombo')))->format('Y-m-d H:i:s');
}

function report_cron_history_record(mysqli $mysqli, array $run): bool
{
    try {
        $jobKey = substr((string)($run['job_key'] ?? ''), 0, 64);
        if ($jobKey === '') {
            return false;
        }

        $jobName = substr((string)($run['job_name'] ?? $jobKey), 0, 120);
        $platform = substr((string)($run['platform'] ?? 'reports'), 0, 32);
        $reportType = substr((string)($run['report_type'] ?? 'all'), 0, 32);
        $status = ($run['status'] ?? '') === 'success' ? 'success' : 'failed';
        $mode = report_cron_history_nullable_string($run['mode'] ?? null, 64);
        $startedAt = report_cron_history_datetime($run['started_at'] ?? null);
        $finishedAt = report_cron_history_datetime($run['finished_at'] ?? null);
        $durationSeconds = report_cron_history_duration_seconds($startedAt, $finishedAt);
        $rowsSaved = max(0, (int)($run['rows_saved'] ?? 0));
        $reportRange = report_cron_history_nullable_string($run['report_range'] ?? null, 255);
        $summaryJson = report_cron_history_summary_json($run['summary'] ?? null);
        $errorMessage = report_cron_history_nullable_string($run['error_message'] ?? null, 2000);
        $triggerSource = PHP_SAPI === 'cli' ? 'cli' : 'http';

        $stmt = $mysqli->prepare(
            'INSERT INTO fnd_report_cron_run_history
                (job_key, job_name, platform, report_type, status, mode, started_at, finished_at,
                 duration_seconds, rows_saved, report_range, summary_json, error_message, trigger_source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        if (!$stmt) {
            error_log('Cron history prepare failed: ' . $mysqli->error);
            return false;
        }

        $stmt->bind_param(
            'ssssssssdissss',
            $jobKey,
            $jobName,
            $platform,
            $reportType,
            $status,
            $mode,
            $startedAt,
            $finishedAt,
            $durationSeconds,
            $rowsSaved,
            $reportRange,
            $summaryJson,
            $errorMessage,
            $triggerSource
        );

        $ok = $stmt->execute();
        if (!$ok) {
            error_log('Cron history insert failed: ' . ($stmt->error ?: $mysqli->error));
        }
        $stmt->close();

        return $ok;
    } catch (Throwable $error) {
        error_log('Cron history logging failed: ' . $error->getMessage());
        return false;
    }
}

function report_cron_history_payload_stats(array $payload): array
{
    return [
        'rows_saved' => report_cron_history_rows_saved($payload),
        'report_range' => report_cron_history_report_range($payload),
    ];
}

function report_cron_history_rows_saved(array $payload): int
{
    if (isset($payload['result']) && is_array($payload['result']) && isset($payload['result']['rows_saved'])) {
        return max(0, (int)$payload['result']['rows_saved']);
    }

    $total = 0;
    if (isset($payload['reports']) && is_array($payload['reports'])) {
        foreach ($payload['reports'] as $report) {
            if (!is_array($report)) {
                continue;
            }

            if (isset($report['rows_saved'])) {
                $total += max(0, (int)$report['rows_saved']);
            } elseif (isset($report['saved_days'])) {
                $total += max(0, (int)$report['saved_days']);
            }
        }
    }

    return $total;
}

function report_cron_history_report_range(array $payload): ?string
{
    if (isset($payload['result']) && is_array($payload['result'])) {
        $result = $payload['result'];
        if (isset($result['from'], $result['to'])) {
            return (string)$result['from'] . '..' . (string)$result['to'];
        }

        if (isset($result['date'])) {
            return (string)$result['date'];
        }
    }

    $ranges = [];
    if (isset($payload['reports']) && is_array($payload['reports'])) {
        foreach ($payload['reports'] as $report) {
            if (!is_array($report) || empty($report['report_range'])) {
                continue;
            }
            $ranges[] = (string)$report['report_range'];
        }
    }

    $ranges = array_values(array_unique(array_filter($ranges)));
    if (empty($ranges)) {
        return null;
    }

    return implode('; ', array_slice($ranges, 0, 4));
}

function report_cron_history_datetime($value): string
{
    $value = trim((string)$value);
    if ($value === '') {
        return report_cron_history_now();
    }

    return $value;
}

function report_cron_history_duration_seconds(string $startedAt, string $finishedAt): float
{
    $started = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $startedAt, new DateTimeZone('Asia/Colombo'));
    $finished = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $finishedAt, new DateTimeZone('Asia/Colombo'));
    if (!$started || !$finished) {
        return 0.0;
    }

    return max(0.0, round(((float)$finished->format('U.u')) - ((float)$started->format('U.u')), 3));
}

function report_cron_history_nullable_string($value, int $maxLength): ?string
{
    if ($value === null) {
        return null;
    }

    $value = trim((string)$value);
    if ($value === '') {
        return null;
    }

    return substr($value, 0, $maxLength);
}

function report_cron_history_summary_json($summary): ?string
{
    if ($summary === null) {
        return null;
    }

    $json = json_encode($summary, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return null;
    }

    return $json;
}

?>
