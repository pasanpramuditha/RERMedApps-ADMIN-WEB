<?php

function handle_save_activity_log($mysqli) {
    $user_email = trim((string)($_POST['user_email'] ?? ''));
    $user_uid = trim((string)($_POST['user_uid'] ?? ''));
    $action = trim((string)($_POST['action'] ?? ''));
    $operation = trim((string)($_POST['operation'] ?? ''));
    $entity_type = trim((string)($_POST['entity_type'] ?? ''));
    $entity_id = trim((string)($_POST['entity_id'] ?? ''));
    $entity_name = trim((string)($_POST['entity_name'] ?? ''));
    $changes_json = trim((string)($_POST['changes_json'] ?? ''));
    $ip_address = trim((string)($_POST['ip_address'] ?? ($_SERVER['REMOTE_ADDR'] ?? '')));
    $user_agent = trim((string)($_POST['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? '')));

    if ($user_email === '') {
        $user_email = 'system@unknown';
    }
    if ($action === '' || $entity_type === '' || $entity_id === '') {
        send_json([
            'success' => false,
            'error_msg' => 'Required activity fields are missing'
        ], 400);
    }
    if ($operation === '') {
        $operation = activity_log_operation_from_action($action);
    }
    if ($entity_name === '') {
        $entity_name = $entity_id;
    }
    if ($changes_json !== '') {
        json_decode($changes_json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $changes_json = json_encode(['raw' => $changes_json], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
    } else {
        $changes_json = null;
    }

    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_activity_logs_tab
            (user_email, user_uid, action, operation, entity_type, entity_id, entity_name, changes_json, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt) {
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to prepare activity log insert'], 500);
    }

    $stmt->bind_param(
        'ssssssssss',
        $user_email,
        $user_uid,
        $action,
        $operation,
        $entity_type,
        $entity_id,
        $entity_name,
        $changes_json,
        $ip_address,
        $user_agent
    );

    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        send_json(['success' => false, 'error_msg' => $error ?: 'Unable to save activity log'], 500);
    }

    $id = (int)$stmt->insert_id;
    $stmt->close();

    send_json([
        'success' => true,
        'id' => (string)$id
    ]);
}

function handle_get_activity_logs($mysqli) {
    $limit = isset($_POST['limit']) ? max(1, min(500, (int)$_POST['limit'])) : 200;
    $operation = trim((string)($_POST['operation'] ?? ''));

    if ($operation !== '') {
        $stmt = $mysqli->prepare(
            'SELECT id, user_email, user_uid, action, operation, entity_type, entity_id, entity_name, changes_json, ip_address, created_at
             FROM fnd_activity_logs_tab
             WHERE operation = ?
             ORDER BY created_at DESC, id DESC
             LIMIT ?'
        );
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to prepare activity log query'], 500);
        }
        $stmt->bind_param('si', $operation, $limit);
    } else {
        $stmt = $mysqli->prepare(
            'SELECT id, user_email, user_uid, action, operation, entity_type, entity_id, entity_name, changes_json, ip_address, created_at
             FROM fnd_activity_logs_tab
             ORDER BY created_at DESC, id DESC
             LIMIT ?'
        );
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to prepare activity log query'], 500);
        }
        $stmt->bind_param('i', $limit);
    }

    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        send_json(['success' => false, 'error_msg' => $error ?: 'Unable to load activity logs'], 500);
    }

    $result = $stmt->get_result();
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = [
            'id' => (string)$row['id'],
            'user_email' => (string)$row['user_email'],
            'user_uid' => (string)($row['user_uid'] ?? ''),
            'action' => (string)$row['action'],
            'operation' => (string)$row['operation'],
            'entity_type' => (string)$row['entity_type'],
            'entity_id' => (string)$row['entity_id'],
            'entity_name' => (string)$row['entity_name'],
            'changes_json' => (string)($row['changes_json'] ?? ''),
            'ip_address' => (string)($row['ip_address'] ?? ''),
            'created_at' => (string)$row['created_at'],
        ];
    }
    $stmt->close();

    send_json([
        'success' => true,
        'logs' => $logs
    ]);
}

function activity_log_operation_from_action($action) {
    $action = strtoupper($action);
    if (strpos($action, 'DELETE') !== false) {
        return 'delete';
    }
    if (strpos($action, 'UPDATE') !== false || strpos($action, 'RENAME') !== false || strpos($action, 'SAVE') !== false) {
        return 'update';
    }
    if (strpos($action, 'CREATE') !== false || strpos($action, 'ADD') !== false) {
        return 'insert';
    }
    if (strpos($action, 'UPLOAD') !== false || strpos($action, 'SEND') !== false || strpos($action, 'ACTIVATE') !== false) {
        return 'action';
    }

    return 'action';
}
