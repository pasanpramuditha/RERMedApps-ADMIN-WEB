<?php

/**
 * In-app ads admin API.
 *
 * These handlers keep template/campaign data in MySQL so the admin panel no
 * longer depends on Firebase for in-app ad management.
 */

if ($tag === 'GET_IN_APP_AD_TEMPLATES') {
    handle_get_in_app_ad_templates($main_mysqli);
}

if ($tag === 'GET_IN_APP_AD_TEMPLATE') {
    handle_get_in_app_ad_template($main_mysqli);
}

if ($tag === 'SAVE_IN_APP_AD_TEMPLATE') {
    handle_save_in_app_ad_template($main_mysqli);
}

if ($tag === 'DELETE_IN_APP_AD_TEMPLATE') {
    handle_delete_in_app_ad_template($main_mysqli);
}

if ($tag === 'GET_IN_APP_ADS') {
    handle_get_in_app_ads($main_mysqli);
}

if ($tag === 'GET_IN_APP_AD') {
    handle_get_in_app_ad($main_mysqli);
}

if ($tag === 'SAVE_IN_APP_AD') {
    handle_save_in_app_ad($main_mysqli);
}

if ($tag === 'UPDATE_IN_APP_AD_STATUS') {
    handle_update_in_app_ad_status($main_mysqli);
}

if ($tag === 'DELETE_IN_APP_AD') {
    handle_delete_in_app_ad($main_mysqli);
}

if ($tag === 'UPLOAD_IN_APP_AD_IMAGE') {
    handle_upload_in_app_ad_image($main_mysqli);
}

function handle_get_in_app_ad_templates($mysqli) {
    $stmt = $mysqli->prepare(
        'SELECT id, name, platform, android_json, ios_json, created_by, last_updated_by, created_at, updated_at
         FROM fnd_in_app_ad_template_tab
         WHERE valid = 1
         ORDER BY updated_at DESC, id DESC'
    );

    if (!$stmt || !$stmt->execute()) {
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load templates'], 500);
    }

    $rows = get_result($stmt);
    $stmt->close();

    send_json(['success' => true, 'templates' => array_map('map_in_app_template_row', $rows)]);
}

function handle_get_in_app_ad_template($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) {
        send_json(['success' => false, 'error_msg' => 'Template id is required'], 400);
    }

    $template = get_in_app_template_by_id($mysqli, $id);
    if (!$template) {
        send_json(['success' => false, 'error_msg' => 'Template not found'], 404);
    }

    send_json(['success' => true, 'template' => $template]);
}

function handle_save_in_app_ad_template($mysqli) {
    try {
        $id = (int)($_POST['id'] ?? 0);
        $name = trim((string)($_POST['name'] ?? ''));
        $platform = trim((string)($_POST['platform'] ?? 'android'));
        $android_json = in_app_ads_post_json_value('android_json');
        $ios_json = in_app_ads_post_json_value('ios_json');
        $user = trim((string)($_POST['user'] ?? 'admin'));

        if ($name === '' || !in_array($platform, ['android', 'ios'], true)) {
            send_json(['success' => false, 'error_msg' => 'Template name and platform are required'], 400);
        }

        if ($id > 0) {
            $existing = get_in_app_template_by_id($mysqli, $id);
            if (!$existing) {
                send_json(['success' => false, 'error_msg' => 'Template not found for update'], 404);
            }

            $stmt = $mysqli->prepare(
                'UPDATE fnd_in_app_ad_template_tab
                 SET name = ?, platform = ?, android_json = ?, ios_json = ?, last_updated_by = ?, valid = 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?'
            );
            if (!$stmt) {
                send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
            }
            $stmt->bind_param('sssssi', $name, $platform, $android_json, $ios_json, $user, $id);
        } else {
            $stmt = $mysqli->prepare(
                'INSERT INTO fnd_in_app_ad_template_tab
                    (name, platform, android_json, ios_json, created_by, last_updated_by, valid)
                 VALUES (?, ?, ?, ?, ?, ?, 1)'
            );
            if (!$stmt) {
                send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
            }
            $stmt->bind_param('ssssss', $name, $platform, $android_json, $ios_json, $user, $user);
        }

        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            send_json(['success' => false, 'error_msg' => $error], 500);
        }

        $saved_id = $id > 0 ? $id : $mysqli->insert_id;
        $stmt->close();

        send_json(['success' => true, 'template' => get_in_app_template_by_id($mysqli, $saved_id)]);
    } catch (Throwable $error) {
        send_json([
            'success' => false,
            'error_msg' => 'Failed to save template: ' . $error->getMessage()
        ], 500);
    }
}

function handle_delete_in_app_ad_template($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) {
        send_json(['success' => false, 'error_msg' => 'Template id is required'], 400);
    }

    $stmt = $mysqli->prepare('UPDATE fnd_in_app_ad_template_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt) {
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    }

    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();

    send_json($ok ? ['success' => true] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_get_in_app_ads($mysqli) {
    $stmt = $mysqli->prepare(
        'SELECT a.id, a.app_id, a.template_id, a.template_name, a.start_date, a.end_date, a.one_time,
                a.target_group, a.language, a.platform, a.status, a.android_json, a.ios_json,
                app.name app_name, app.icon_url app_icon, app.db_name app_db_name, app.package_name app_package_name, app.os app_os
         FROM fnd_in_app_ad_campaign_tab a
         LEFT JOIN fnd_app_details_tab app ON app.id = a.app_id
         WHERE a.valid = 1
         ORDER BY a.created_at DESC, a.id DESC'
    );

    if (!$stmt || !$stmt->execute()) {
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load in-app ads'], 500);
    }

    $rows = get_result($stmt);
    $stmt->close();

    send_json(['success' => true, 'ads' => array_map('map_in_app_ad_row', $rows)]);
}

function handle_get_in_app_ad($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) {
        send_json(['success' => false, 'error_msg' => 'Ad id is required'], 400);
    }

    $ad = get_in_app_ad_by_id($mysqli, $id);
    if (!$ad) {
        send_json(['success' => false, 'error_msg' => 'Ad not found'], 404);
    }

    send_json(['success' => true, 'ad' => $ad]);
}

function handle_save_in_app_ad($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    $app_id = (int)($_POST['app_id'] ?? 0);
    $template_id = (int)($_POST['template_id'] ?? 0);
    $template_name = trim((string)($_POST['template_name'] ?? ''));
    $start_date = substr((string)($_POST['start_date'] ?? ''), 0, 10);
    $end_date = substr((string)($_POST['end_date'] ?? ''), 0, 10);
    $one_time = (int)($_POST['one_time'] ?? 0);
    $target_group = trim((string)($_POST['target_group'] ?? 'ALL'));
    $language = trim((string)($_POST['language'] ?? 'all'));
    $platform = trim((string)($_POST['platform'] ?? 'Android'));
    $status = trim((string)($_POST['status'] ?? 'Pending'));
    $android_json = in_app_ads_post_json_value('android_json');
    $ios_json = in_app_ads_post_json_value('ios_json');

    if ($app_id <= 0 || $template_id <= 0 || $template_name === '' || $start_date === '' || $end_date === '') {
        send_json(['success' => false, 'error_msg' => 'Required ad fields are missing'], 400);
    }

    if ($id > 0) {
        $stmt = $mysqli->prepare(
            'UPDATE fnd_in_app_ad_campaign_tab
             SET app_id = ?, template_id = ?, template_name = ?, start_date = ?, end_date = ?, one_time = ?,
                 target_group = ?, language = ?, platform = ?, status = ?, android_json = ?, ios_json = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        }
        $stmt->bind_param('iisssissssssi', $app_id, $template_id, $template_name, $start_date, $end_date, $one_time, $target_group, $language, $platform, $status, $android_json, $ios_json, $id);
    } else {
        $stmt = $mysqli->prepare(
            'INSERT INTO fnd_in_app_ad_campaign_tab
                (app_id, template_id, template_name, start_date, end_date, one_time, target_group, language, platform, status, android_json, ios_json, valid)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
        );
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        }
        $stmt->bind_param('iisssissssss', $app_id, $template_id, $template_name, $start_date, $end_date, $one_time, $target_group, $language, $platform, $status, $android_json, $ios_json);
    }

    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        send_json(['success' => false, 'error_msg' => $error], 500);
    }

    $saved_id = $id > 0 ? $id : $mysqli->insert_id;
    $stmt->close();

    send_json(['success' => true, 'ad' => get_in_app_ad_by_id($mysqli, $saved_id)]);
}

function handle_update_in_app_ad_status($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    $status = trim((string)($_POST['status'] ?? 'Pending'));

    if ($id <= 0) {
        send_json(['success' => false, 'error_msg' => 'Ad id is required'], 400);
    }

    $stmt = $mysqli->prepare('UPDATE fnd_in_app_ad_campaign_tab SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt) {
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    }
    $stmt->bind_param('si', $status, $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();

    send_json($ok ? ['success' => true] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_delete_in_app_ad($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) {
        send_json(['success' => false, 'error_msg' => 'Ad id is required'], 400);
    }

    $stmt = $mysqli->prepare('UPDATE fnd_in_app_ad_campaign_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt) {
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    }
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();

    send_json($ok ? ['success' => true] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_upload_in_app_ad_image($mysqli) {
    $settings = function_exists('GetGlobalSettings') ? GetGlobalSettings($mysqli) : [];
    $upload_dir = rtrim((string)($settings['in_app_ad_upload_path'] ?? ''), '/');
    $public_url = rtrim((string)($settings['in_app_ad_upload_url'] ?? ''), '/');

    if ($upload_dir === '') {
        $upload_dir = dirname(__DIR__) . '/uploads/in-app-ads';
    }

    if ($public_url === '') {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $public_url = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'admin.rermedapps.com') . '/web/1.0/uploads/in-app-ads';
    }

    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        send_json(['success' => false, 'error_msg' => 'Image file is required'], 400);
    }

    if (!is_dir($upload_dir) && !mkdir($upload_dir, 0755, true)) {
        send_json(['success' => false, 'error_msg' => 'Unable to create upload directory'], 500);
    }

    $tmp = $_FILES['image']['tmp_name'];
    $info = getimagesize($tmp);
    if ($info === false) {
        send_json(['success' => false, 'error_msg' => 'Only image uploads are allowed'], 400);
    }

    $extensions = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_WEBP => 'webp',
        IMAGETYPE_GIF => 'gif',
    ];
    $extension = $extensions[$info[2]] ?? null;
    if ($extension === null) {
        send_json(['success' => false, 'error_msg' => 'Unsupported image type'], 400);
    }

    $filename = 'inapp_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $target = $upload_dir . '/' . $filename;

    if (!move_uploaded_file($tmp, $target)) {
        send_json(['success' => false, 'error_msg' => 'Failed to save uploaded image'], 500);
    }

    send_json([
        'success' => true,
        'url' => $public_url . '/' . $filename,
        'path' => $target,
    ]);
}

function get_in_app_template_by_id($mysqli, $id) {
    $stmt = $mysqli->prepare(
        'SELECT id, name, platform, android_json, ios_json, created_by, last_updated_by, created_at, updated_at
         FROM fnd_in_app_ad_template_tab
         WHERE id = ? AND valid = 1
         LIMIT 1'
    );
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $rows = get_result($stmt);
    $stmt->close();
    return empty($rows) ? false : map_in_app_template_row($rows[0]);
}

function in_app_ads_post_json_value($name) {
    $base64_name = $name . '_b64';
    if (isset($_POST[$base64_name]) && $_POST[$base64_name] !== '') {
        $decoded = base64_decode((string)$_POST[$base64_name], true);
        if ($decoded !== false) {
            return $decoded;
        }
    }

    return (string)($_POST[$name] ?? '');
}

function get_in_app_ad_by_id($mysqli, $id) {
    $stmt = $mysqli->prepare(
        'SELECT a.id, a.app_id, a.template_id, a.template_name, a.start_date, a.end_date, a.one_time,
                a.target_group, a.language, a.platform, a.status, a.android_json, a.ios_json,
                app.name app_name, app.icon_url app_icon, app.db_name app_db_name, app.package_name app_package_name, app.os app_os
         FROM fnd_in_app_ad_campaign_tab a
         LEFT JOIN fnd_app_details_tab app ON app.id = a.app_id
         WHERE a.id = ? AND a.valid = 1
         LIMIT 1'
    );
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $rows = get_result($stmt);
    $stmt->close();
    return empty($rows) ? false : map_in_app_ad_row($rows[0]);
}

function map_in_app_template_row($row) {
    return [
        'id' => (string)$row['id'],
        'name' => (string)$row['name'],
        'platform' => (string)$row['platform'],
        'android' => json_decode((string)($row['android_json'] ?? ''), true) ?: null,
        'ios' => json_decode((string)($row['ios_json'] ?? ''), true) ?: null,
        'createdBy' => (string)($row['created_by'] ?? ''),
        'lastUpdatedBy' => (string)($row['last_updated_by'] ?? ''),
        'lastUpdatedAt' => (string)($row['updated_at'] ?? ''),
    ];
}

function map_in_app_ad_row($row) {
    $end_date = (string)$row['end_date'];
    $status = (string)$row['status'];
    if ($status !== 'Archived' && $end_date !== '' && strtotime($end_date . ' 23:59:59') < time()) {
        $status = 'Expired';
    }

    return [
        'id' => (string)$row['id'],
        'appId' => (string)$row['app_id'],
        'appName' => (string)($row['app_name'] ?? 'Unknown App'),
        'appIcon' => (string)($row['app_icon'] ?? 'https://placehold.co/40x40.png'),
        'appDbName' => (string)($row['app_db_name'] ?? ''),
        'appPackageName' => (string)($row['app_package_name'] ?? ''),
        'templateId' => (string)$row['template_id'],
        'templateName' => (string)$row['template_name'],
        'startDate' => (string)$row['start_date'],
        'endDate' => $end_date,
        'oneTime' => (int)$row['one_time'] === 1,
        'targetGroup' => (string)$row['target_group'],
        'language' => (string)$row['language'],
        'platform' => (string)($row['platform'] ?: $row['app_os'] ?: 'Android'),
        'status' => $status,
        'android' => json_decode((string)($row['android_json'] ?? ''), true) ?: null,
        'ios' => json_decode((string)($row['ios_json'] ?? ''), true) ?: null,
    ];
}
