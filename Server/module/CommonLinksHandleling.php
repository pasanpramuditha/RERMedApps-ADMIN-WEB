<?php

function handle_get_common_links($mysqli) {
    $sql = 'SELECT id, name, link, created_at, updated_at FROM fnd_common_links_tab ORDER BY name ASC';
    $result = $mysqli->query($sql);

    if (!$result) {
        send_json([
            'success' => false,
            'error_msg' => $mysqli->error ?: 'Unable to load common links'
        ], 500);
    }

    $links = [];
    while ($row = $result->fetch_assoc()) {
        $links[] = [
            'id' => (string)$row['id'],
            'name' => (string)$row['name'],
            'link' => (string)$row['link'],
            'created_at' => (string)($row['created_at'] ?? ''),
            'updated_at' => (string)($row['updated_at'] ?? ''),
        ];
    }

    send_json([
        'success' => true,
        'links' => $links
    ]);
}

function handle_save_common_link($mysqli) {
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    $name = trim((string)($_POST['name'] ?? ''));
    $link = trim((string)($_POST['link'] ?? ''));

    if ($name === '' || $link === '') {
        send_json([
            'success' => false,
            'error_msg' => 'Name and link are required'
        ], 400);
    }

    if (!filter_var($link, FILTER_VALIDATE_URL)) {
        send_json([
            'success' => false,
            'error_msg' => 'Invalid link URL'
        ], 400);
    }

    if ($id > 0) {
        $stmt = $mysqli->prepare('UPDATE fnd_common_links_tab SET name = ?, link = ? WHERE id = ?');
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to prepare link update'], 500);
        }

        $stmt->bind_param('ssi', $name, $link, $id);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            send_json(['success' => false, 'error_msg' => $error ?: 'Unable to update link'], 500);
        }
        $stmt->close();
    } else {
        $stmt = $mysqli->prepare('INSERT INTO fnd_common_links_tab (name, link) VALUES (?, ?)');
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to prepare link insert'], 500);
        }

        $stmt->bind_param('ss', $name, $link);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            send_json(['success' => false, 'error_msg' => $error ?: 'Unable to add link'], 500);
        }
        $id = (int)$stmt->insert_id;
        $stmt->close();
    }

    send_json([
        'success' => true,
        'link' => [
            'id' => (string)$id,
            'name' => $name,
            'link' => $link
        ]
    ]);
}

function handle_delete_common_link($mysqli) {
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    if ($id <= 0) {
        send_json([
            'success' => false,
            'error_msg' => 'Link id is required'
        ], 400);
    }

    $select_stmt = $mysqli->prepare('SELECT id, name, link FROM fnd_common_links_tab WHERE id = ? LIMIT 1');
    if (!$select_stmt) {
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to prepare link lookup'], 500);
    }
    $select_stmt->bind_param('i', $id);
    $select_stmt->execute();
    $result = $select_stmt->get_result();
    $link = $result ? $result->fetch_assoc() : null;
    $select_stmt->close();

    if (!$link) {
        send_json([
            'success' => false,
            'error_msg' => 'Link not found'
        ], 404);
    }

    $delete_stmt = $mysqli->prepare('DELETE FROM fnd_common_links_tab WHERE id = ?');
    if (!$delete_stmt) {
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to prepare link delete'], 500);
    }

    $delete_stmt->bind_param('i', $id);
    if (!$delete_stmt->execute()) {
        $error = $delete_stmt->error ?: $mysqli->error;
        $delete_stmt->close();
        send_json(['success' => false, 'error_msg' => $error ?: 'Unable to delete link'], 500);
    }
    $delete_stmt->close();

    send_json([
        'success' => true,
        'link' => [
            'id' => (string)$link['id'],
            'name' => (string)$link['name'],
            'link' => (string)$link['link']
        ]
    ]);
}
