<?php

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Colombo');

const WHATSAPP_QUEUE_DB_HOST = 'localhost';
const WHATSAPP_QUEUE_DB_USER = 'rermedap';
const WHATSAPP_QUEUE_DB_PASS = 'Med';
const WHATSAPP_QUEUE_DB_NAME = 'rermedap_';
const WHATSAPP_QUEUE_DB_PORT = 3306;

whatsapp_queue_main($argv ?? []);

function whatsapp_queue_main(array $argv): void
{
    try {
        $main_mysqli = whatsapp_queue_database();
        $args = PHP_SAPI === 'cli' ? whatsapp_queue_cli_args($argv) : $_GET;
        $limit = max(1, min(50, (int) whatsapp_queue_arg($args, 'limit', 5)));
        $dryRun = whatsapp_queue_bool_arg($args, 'dry-run', false);
        $sendUrl = (string) whatsapp_queue_arg(
            $args,
            'url',
            getenv('WHATSAPP_SEND_URL') ?: 'https://admin.rermedapps.com/whatsappAPI/sendMessage.php'
        );

        $messages = whatsapp_queue_pending_messages($main_mysqli, $limit);
        $result = [
            'success' => true,
            'dry_run' => $dryRun,
            'checked' => count($messages),
            'sent' => 0,
            'failed' => 0,
            'messages' => [],
        ];

        foreach ($messages as $message) {
            $queueId = (int) $message['id'];

            if ($dryRun) {
                $result['messages'][] = [
                    'id' => $queueId,
                    'group_name' => $message['group_name'],
                    'status' => 'dry_run',
                ];
                continue;
            }

            if (!whatsapp_queue_lock_message($main_mysqli, $queueId)) {
                continue;
            }

            $sendResult = whatsapp_queue_send(
                $sendUrl,
                (string) $message['group_name'],
                (string) $message['message']
            );

            if ($sendResult['success']) {
                whatsapp_queue_mark_sent($main_mysqli, $queueId, (string) ($sendResult['response'] ?? ''));
                whatsapp_queue_mark_source_sent($main_mysqli, $message);
                $result['sent']++;
            } else {
                whatsapp_queue_mark_failed(
                    $main_mysqli,
                    $queueId,
                    (int) $message['attempt_count'] + 1,
                    (string) ($sendResult['error'] ?? 'Unknown WhatsApp send error'),
                    (string) ($sendResult['response'] ?? '')
                );
                $result['failed']++;
            }

            $result['messages'][] = [
                'id' => $queueId,
                'group_name' => $message['group_name'],
                'source_type' => $message['source_type'],
                'source_id' => (int) $message['source_id'],
                'send_success' => (bool) $sendResult['success'],
                'error' => $sendResult['error'] ?? null,
            ];
        }

        whatsapp_queue_output($result);
    } catch (Throwable $error) {
        whatsapp_queue_output([
            'success' => false,
            'error_msg' => $error->getMessage(),
        ]);
    }
}

function whatsapp_queue_database(): mysqli
{
    try {
        $mysqli = @new mysqli(
            WHATSAPP_QUEUE_DB_HOST,
            WHATSAPP_QUEUE_DB_USER,
            WHATSAPP_QUEUE_DB_PASS,
            WHATSAPP_QUEUE_DB_NAME,
            WHATSAPP_QUEUE_DB_PORT
        );
    } catch (Throwable $error) {
        throw new Exception('Unable to connect to WhatsApp queue database.');
    }

    if ($mysqli->connect_error) {
        throw new Exception('Unable to connect to WhatsApp queue database.');
    }

    if (!$mysqli->set_charset('utf8mb4')) {
        throw new Exception('Unable to set WhatsApp queue database charset.');
    }

    $mysqli->query("SET time_zone = '+05:30'");
    return $mysqli;
}

function whatsapp_queue_cli_args(array $argv): array
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

function whatsapp_queue_arg(array $args, string $key, $default)
{
    return isset($args[$key]) && (string) $args[$key] !== '' ? $args[$key] : $default;
}

function whatsapp_queue_bool_arg(array $args, string $key, bool $default): bool
{
    if (!isset($args[$key])) {
        return $default;
    }
    return in_array(strtolower((string) $args[$key]), ['1', 'true', 'yes', 'on'], true);
}

function whatsapp_queue_pending_messages(mysqli $mysqli, int $limit): array
{
    $sql = "SELECT *
            FROM fnd_whatsapp_message_queue
            WHERE (
                status = 'pending'
                OR (status = 'failed' AND attempt_count < max_attempts AND next_attempt_at <= NOW())
                OR (status = 'processing' AND locked_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE))
            )
            ORDER BY created_at ASC, id ASC
            LIMIT ?";
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare WhatsApp queue select.');
    }

    $stmt->bind_param('i', $limit);
    $rows = [];
    if ($stmt->execute()) {
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        $result->free();
    }
    $stmt->close();
    return $rows;
}

function whatsapp_queue_lock_message(mysqli $mysqli, int $queueId): bool
{
    $stmt = $mysqli->prepare(
        "UPDATE fnd_whatsapp_message_queue
         SET status = 'processing', locked_at = NOW(), attempt_count = attempt_count + 1
         WHERE id = ?
           AND (
                status = 'pending'
                OR (status = 'failed' AND attempt_count < max_attempts AND next_attempt_at <= NOW())
                OR (status = 'processing' AND locked_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE))
           )
         LIMIT 1"
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare WhatsApp queue lock.');
    }
    $stmt->bind_param('i', $queueId);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error);
    }
    $locked = $stmt->affected_rows > 0;
    $stmt->close();
    return $locked;
}

function whatsapp_queue_send(string $url, string $groupName, string $message): array
{
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => [
            'group' => $groupName,
            'message' => $message,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        return [
            'success' => false,
            'error' => $error,
            'response' => $response === false ? '' : (string) $response,
        ];
    }

    curl_close($ch);
    $responseText = $response === false ? '' : (string) $response;
    $decoded = json_decode($responseText, true);
    $explicitFailure = is_array($decoded)
        && ((isset($decoded['success']) && $decoded['success'] === false)
            || (isset($decoded['status']) && $decoded['status'] === false));

    if ($httpCode < 200 || $httpCode >= 300 || $explicitFailure) {
        return [
            'success' => false,
            'error' => 'WhatsApp API returned HTTP ' . $httpCode,
            'response' => $responseText,
        ];
    }

    return [
        'success' => true,
        'response' => $responseText,
    ];
}

function whatsapp_queue_mark_sent(mysqli $mysqli, int $queueId, string $responseText): void
{
    $stmt = $mysqli->prepare(
        "UPDATE fnd_whatsapp_message_queue
         SET status = 'sent', sent_at = NOW(), locked_at = NULL, last_error = NULL, response_text = ?
         WHERE id = ?
         LIMIT 1"
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare WhatsApp sent update.');
    }
    $stmt->bind_param('si', $responseText, $queueId);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error);
    }
    $stmt->close();
}

function whatsapp_queue_mark_failed(mysqli $mysqli, int $queueId, int $attemptCount, string $error, string $responseText): void
{
    $delayMinutes = min(60, max(5, (int) pow(2, min(5, $attemptCount))));
    $stmt = $mysqli->prepare(
        "UPDATE fnd_whatsapp_message_queue
         SET status = 'failed', locked_at = NULL, last_error = ?, response_text = ?,
             next_attempt_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
         WHERE id = ?
         LIMIT 1"
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare WhatsApp failed update.');
    }
    $stmt->bind_param('ssii', $error, $responseText, $delayMinutes, $queueId);
    if (!$stmt->execute()) {
        $dbError = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($dbError);
    }
    $stmt->close();
}

function whatsapp_queue_mark_source_sent(mysqli $mysqli, array $message): void
{
    $sourceType = (string) ($message['source_type'] ?? '');
    $sourceId = (int) ($message['source_id'] ?? 0);
    if ($sourceId <= 0) {
        return;
    }

    if ($sourceType === 'app_install_trend_run') {
        $stmt = $mysqli->prepare("UPDATE fnd_app_install_trend_alerts SET status = 'sent' WHERE run_id = ?");
    } elseif ($sourceType === 'app_install_trend_alert') {
        $stmt = $mysqli->prepare("UPDATE fnd_app_install_trend_alerts SET status = 'sent' WHERE id = ? LIMIT 1");
    } else {
        return;
    }

    if (!$stmt) {
        return;
    }
    $stmt->bind_param('i', $sourceId);
    $stmt->execute();
    $stmt->close();
}

function whatsapp_queue_output(array $payload): void
{
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
