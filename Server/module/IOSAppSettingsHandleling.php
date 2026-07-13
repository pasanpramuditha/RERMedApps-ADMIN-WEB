<?php

require_once __DIR__ . '/../include.php';

ios_settings_configure_headers();
ios_settings_handle_preflight_request();
ios_settings_require_tag();

$tag = $_POST['tag'];
ios_settings_require_backend_authorized();

if ($tag === 'GET_LIVE_IOS_APPS') {
    ios_settings_send_json([
        'success' => true,
        'apps' => ios_settings_get_live_ios_apps($main_mysqli),
    ]);
}

$mysqli = ios_settings_connect_requested_app_database($main_mysqli);

if ($tag === 'GET_APP_SETTINGS') {
    ios_settings_send_json([
        'success' => true,
        'result' => ios_settings_select_all($mysqli, "SELECT category, name, int_value, string_value FROM fnd_ios_settings_tab ORDER BY category ASC, name ASC"),
    ]);
}

if ($tag === 'GET_APP_CONFIG') {
    ios_settings_send_json([
        'success' => true,
        'result' => ios_settings_select_all($mysqli, "SELECT id, param, int_value, string_value, comment FROM fnd_ios_app_config_tab ORDER BY id ASC"),
    ]);
}

if ($tag === 'GET_SIMILAR_APPS') {
    ios_settings_send_json([
        'success' => true,
        'feedback' => ios_settings_select_all($mysqli, "SELECT id, app_name, app_name_en, app_name_de, app_name_es, app_name_fr, app_name_pt, app_name_ru, app_name_zh, app_name_ja, app_name_ko, app_name_it, app_name_id, app_name_vi, app_name_tr, app_icon_url, apple_id, visible FROM fnd_ios_similar_apps ORDER BY id ASC"),
    ]);
}

if ($tag === 'GET_APP_UPDATE') {
    ios_settings_send_json([
        'success' => true,
        'feedback' => ios_settings_select_all($mysqli, "SELECT ver, app_update, mandatory, maintenance FROM fnd_ios_app_update_tab ORDER BY ver ASC"),
    ]);
}

if ($tag === 'GET_APP_FONTSIZE') {
    ios_settings_send_json([
        'success' => true,
        'result' => ios_settings_select_all($mysqli, "SELECT device, base_font_small_size, heading_font_small_size, subheading_font_small_size, base_font_medium_size, heading_font_medium_size, subheading_font_medium_size, base_font_large_size, heading_font_large_size, subheading_font_large_size FROM fnd_ios_fontsize_tab ORDER BY device ASC"),
    ]);
}

if ($tag === 'GET_ADMOB') {
    ios_settings_send_json([
        'success' => true,
        'result' => ios_settings_select_all($mysqli, "SELECT ad_type, active, ad_id, top_margin, bottom_margin, custom, custom_width, custom_height, frequency, home_screen, fav_screen, content_screen FROM fnd_ios_admob_tab ORDER BY ad_type ASC"),
    ]);
}

if ($tag === 'GET_NAVIGATION') {
    ios_settings_send_json([
        'success' => true,
        'result' => ios_settings_select_all($mysqli, "SELECT param, active FROM fnd_ios_nav_tab ORDER BY param ASC"),
    ]);
}

if ($tag === 'GET_PROMO') {
    ios_settings_send_json([
        'success' => true,
        'result' => ios_settings_select_all($mysqli, "SELECT id, param, int_value, string_value, date_value, comment FROM fnd_ios_promo_tab ORDER BY id ASC"),
    ]);
}

if ($tag === 'SAVE_IOS_APP_CONFIG_SETTINGS') {
    $settings = ios_settings_decode_json_post_field('settings');
    ios_settings_send_json(ios_settings_save_settings($mysqli, $settings));
}

if ($tag === 'SAVE_NAVIGATION') {
    $settings = ios_settings_decode_json_post_field('settings');
    ios_settings_send_json(ios_settings_save_navigation_settings($mysqli, $settings));
}

if ($tag === 'SAVE_APP_PROMO') {
    $promos = ios_settings_decode_json_post_field('promos');
    ios_settings_send_json(ios_settings_save_promo_settings($mysqli, $promos));
}

if ($tag === 'UPDATE_APP_UPDATE_TAB') {
    ios_settings_send_json(ios_settings_update_app_update($mysqli));
}

if ($tag === 'SAVE_APP_FONTSIZE') {
    $font_sizes = ios_settings_decode_json_post_field('fontsizes');
    ios_settings_send_json(ios_settings_save_font_sizes($mysqli, $font_sizes));
}

if ($tag === 'UPDATE_SIMILAR_APP_VISIBILITY') {
    ios_settings_send_json(ios_settings_update_similar_app_visibility($mysqli));
}

if ($tag === 'ADD_SIMILAR_APP') {
    ios_settings_send_json(ios_settings_save_similar_app($mysqli, false));
}

if ($tag === 'UPDATE_SIMILAR_APP') {
    ios_settings_send_json(ios_settings_save_similar_app($mysqli, true));
}

ios_settings_send_json([
    'success' => false,
    'error_msg' => 'Unknown request tag',
], 404);

function ios_settings_configure_headers() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed_origins = array_filter(array_map('trim', explode(',', getenv('PHP_ALLOWED_ORIGINS') ?: 'https://admin.rermedapps.com,http://localhost:9002,http://localhost:9003,http://localhost:9010')));

    if ($origin !== '' && in_array($origin, $allowed_origins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
}

function ios_settings_handle_preflight_request() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
}

function ios_settings_require_tag() {
    if (!isset($_POST['tag']) || trim((string) $_POST['tag']) === '') {
        ios_settings_send_json([
            'success' => false,
            'error_msg' => 'Required tag parameter is missing.',
        ], 400);
    }
}

function ios_settings_expected_backend_token() {
    $token = getenv('PHP_BACKEND_AUTH_TOKEN');
    if ($token === false || $token === '') {
        $token = getenv('PHP_AUTH_TOKEN');
    }

    return $token === false ? '' : trim((string) $token);
}

function ios_settings_bearer_token() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
    if ($header !== '' && preg_match('/^Bearer\s+(.+)$/i', $header, $match)) {
        return $match[1];
    }

    return null;
}

function ios_settings_require_backend_authorized() {
    $expected_token = ios_settings_expected_backend_token();
    if ($expected_token === '') {
        ios_settings_send_json([
            'success' => false,
            'error_msg' => 'Backend auth token is not configured.',
        ], 503);
    }

    $provided_token = ios_settings_bearer_token();
    if ($provided_token === null || !hash_equals($expected_token, $provided_token)) {
        ios_settings_send_json([
            'success' => false,
            'error_msg' => 'Unauthorized',
        ], 401);
    }
}

function ios_settings_send_json($payload, $status_code = 200) {
    if (!headers_sent()) {
        http_response_code($status_code);
        header('Content-Type: application/json');
    }

    echo json_encode($payload);
    exit();
}

function ios_settings_connect_requested_app_database($main_mysqli) {
    $db = '';
    if (isset($_POST['app_id']) && trim((string) $_POST['app_id']) !== '') {
        $db = ios_settings_get_app_db_name($main_mysqli, (int) $_POST['app_id']);
    } else if (isset($_POST['db']) && trim((string) $_POST['db']) !== '') {
        $db = trim((string) $_POST['db']);
    }

    if ($db === '' || $db === '0' || strtoupper($db) === 'MAIN') {
        ios_settings_send_json([
            'success' => false,
            'error_msg' => 'Valid iOS app database target is required.',
        ], 400);
    }

    return SwapDatabase($main_mysqli, $db);
}

function ios_settings_get_app_db_name($mysqli, $id) {
    $stmt = $mysqli->prepare("SELECT db_name FROM fnd_app_details_tab WHERE id = ? AND status = 2 AND (LOWER(REPLACE(os, ' ', '')) LIKE '%ios%' OR LOWER(os) LIKE '%apple%') LIMIT 1");
    if (!$stmt) {
        return '';
    }

    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) {
        $stmt->close();
        return '';
    }

    $rows = get_result($stmt);
    $stmt->close();

    return $rows[0]['db_name'] ?? '';
}

function ios_settings_get_live_ios_apps($mysqli) {
    $stmt = $mysqli->prepare("SELECT id, package_name, app_id, db_name, name, theme_color, current_ver, release_date, paid, os, url, private_key, endpoint, client_id, client_email, app_order, icon_url, landscapeSupport, status, log_level, server_folder, auth_account, nav_param FROM fnd_app_details_tab WHERE status = 2 AND (LOWER(REPLACE(os, ' ', '')) LIKE '%ios%' OR LOWER(os) LIKE '%apple%') ORDER BY app_order ASC, id ASC");
    if (!$stmt || !$stmt->execute()) {
        return [];
    }

    $rows = get_result($stmt);
    $stmt->close();
    return $rows;
}

function ios_settings_select_all($mysqli, $sql) {
    $stmt = $mysqli->prepare($sql);
    if (!$stmt || !$stmt->execute()) {
        return [];
    }

    $rows = get_result($stmt);
    $stmt->close();
    return $rows;
}

function ios_settings_decode_json_post_field($field) {
    $raw = $_POST[$field] ?? '[]';
    $decoded = json_decode((string) $raw, true);
    if (!is_array($decoded)) {
        ios_settings_send_json([
            'success' => false,
            'error_msg' => "Invalid $field payload.",
        ], 400);
    }

    return $decoded;
}

function ios_settings_save_settings($mysqli, $settings) {
    foreach ($settings as $setting) {
        if (!is_array($setting)) {
            return ['success' => false, 'message' => 'Invalid setting row.'];
        }

        $param = trim((string) ($setting['param'] ?? $setting['name'] ?? ''));
        if ($param === '') {
            continue;
        }

        $int_value = array_key_exists('int_value', $setting) && $setting['int_value'] !== null && $setting['int_value'] !== '' ? (int) $setting['int_value'] : null;
        $string_value = array_key_exists('string_value', $setting) && $setting['string_value'] !== null ? (string) $setting['string_value'] : null;

        $updated = ios_settings_update_named_setting($mysqli, 'fnd_ios_settings_tab', 'name', $param, $int_value, $string_value);
        if (!$updated['success']) {
            return $updated;
        }

        $updated = ios_settings_update_named_setting($mysqli, 'fnd_ios_app_config_tab', 'param', $param, $int_value, $string_value);
        if (!$updated['success']) {
            return $updated;
        }
    }

    return ['success' => true];
}

function ios_settings_update_named_setting($mysqli, $table, $key_column, $param, $int_value, $string_value) {
    $sql = "UPDATE $table SET int_value = ?, string_value = ? WHERE $key_column = ?";
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return ['success' => false, 'message' => $mysqli->error];
    }

    $stmt->bind_param('iss', $int_value, $string_value, $param);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['success' => false, 'message' => $error];
    }

    $stmt->close();
    return ['success' => true];
}

function ios_settings_update_app_update($mysqli) {
    $ver = trim((string) ($_POST['ver'] ?? ''));
    if ($ver === '') {
        return ['success' => false, 'message' => 'Version key is required.'];
    }

    $app_update = (int) ($_POST['app_update'] ?? 0);
    $mandatory = (int) ($_POST['mandatory'] ?? 0);
    $maintenance = (int) ($_POST['maintenance'] ?? 0);

    $stmt = $mysqli->prepare('UPDATE fnd_ios_app_update_tab SET app_update = ?, mandatory = ?, maintenance = ? WHERE ver = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => $mysqli->error];
    }

    $stmt->bind_param('iiis', $app_update, $mandatory, $maintenance, $ver);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['success' => false, 'message' => $error];
    }

    $stmt->close();
    return ['success' => true];
}

function ios_settings_save_font_sizes($mysqli, $font_sizes) {
    $stmt = $mysqli->prepare('UPDATE fnd_ios_fontsize_tab SET base_font_small_size = ?, heading_font_small_size = ?, subheading_font_small_size = ?, base_font_medium_size = ?, heading_font_medium_size = ?, subheading_font_medium_size = ?, base_font_large_size = ?, heading_font_large_size = ?, subheading_font_large_size = ? WHERE device = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => $mysqli->error];
    }

    foreach ($font_sizes as $row) {
        $device = trim((string) ($row['device'] ?? ''));
        if ($device === '') {
            continue;
        }

        $base_small = (int) ($row['base_font_small_size'] ?? 0);
        $heading_small = (int) ($row['heading_font_small_size'] ?? 0);
        $subheading_small = (int) ($row['subheading_font_small_size'] ?? 0);
        $base_medium = (int) ($row['base_font_medium_size'] ?? 0);
        $heading_medium = (int) ($row['heading_font_medium_size'] ?? 0);
        $subheading_medium = (int) ($row['subheading_font_medium_size'] ?? 0);
        $base_large = (int) ($row['base_font_large_size'] ?? 0);
        $heading_large = (int) ($row['heading_font_large_size'] ?? 0);
        $subheading_large = (int) ($row['subheading_font_large_size'] ?? 0);

        $stmt->bind_param('iiiiiiiiis', $base_small, $heading_small, $subheading_small, $base_medium, $heading_medium, $subheading_medium, $base_large, $heading_large, $subheading_large, $device);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            return ['success' => false, 'message' => $error];
        }
    }

    $stmt->close();
    return ['success' => true];
}

function ios_settings_save_navigation_settings($mysqli, $settings) {
    $stmt = $mysqli->prepare('UPDATE fnd_ios_nav_tab SET active = ? WHERE param = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => $mysqli->error];
    }

    foreach ($settings as $row) {
        $param = trim((string) ($row['param'] ?? ''));
        if ($param === '') {
            continue;
        }

        $active = (int) ($row['active'] ?? $row['int_value'] ?? 0);
        $stmt->bind_param('is', $active, $param);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            return ['success' => false, 'message' => $error];
        }
    }

    $stmt->close();
    return ['success' => true];
}

function ios_settings_save_promo_settings($mysqli, $promos) {
    $stmt = $mysqli->prepare('UPDATE fnd_ios_promo_tab SET int_value = ?, string_value = ?, date_value = ? WHERE param = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => $mysqli->error];
    }

    foreach ($promos as $row) {
        $param = trim((string) ($row['param'] ?? ''));
        if ($param === '') {
            continue;
        }

        $int_value = array_key_exists('int_value', $row) && $row['int_value'] !== null && $row['int_value'] !== '' ? (int) $row['int_value'] : null;
        $string_value = array_key_exists('string_value', $row) && $row['string_value'] !== null && $row['string_value'] !== '' ? (string) $row['string_value'] : null;
        $date_value = array_key_exists('date_value', $row) && $row['date_value'] !== null && $row['date_value'] !== '' ? (string) $row['date_value'] : null;

        $stmt->bind_param('isss', $int_value, $string_value, $date_value, $param);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            return ['success' => false, 'message' => $error];
        }
    }

    $stmt->close();
    return ['success' => true];
}

function ios_settings_update_similar_app_visibility($mysqli) {
    $id = (int) ($_POST['id'] ?? 0);
    $visible = (int) ($_POST['visible'] ?? 0);
    if ($id <= 0) {
        return ['success' => false, 'message' => 'Similar app id is required.'];
    }

    $stmt = $mysqli->prepare('UPDATE fnd_ios_similar_apps SET visible = ? WHERE id = ?');
    if (!$stmt) {
        return ['success' => false, 'message' => $mysqli->error];
    }

    $stmt->bind_param('ii', $visible, $id);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['success' => false, 'message' => $error];
    }

    $stmt->close();
    return ['success' => true];
}

function ios_settings_save_similar_app($mysqli, $is_update) {
    $fields = ['app_name', 'app_name_en', 'app_name_de', 'app_name_es', 'app_name_fr', 'app_name_pt', 'app_name_ru', 'app_name_zh', 'app_name_ja', 'app_name_ko', 'app_name_it', 'app_name_id', 'app_name_vi', 'app_name_tr', 'app_icon_url', 'apple_id'];
    $values = [];
    foreach ($fields as $field) {
        $values[$field] = (string) ($_POST[$field] ?? '');
    }

    if ($is_update) {
        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            return ['success' => false, 'message' => 'Similar app id is required.'];
        }

        $stmt = $mysqli->prepare('UPDATE fnd_ios_similar_apps SET app_name = ?, app_name_en = ?, app_name_de = ?, app_name_es = ?, app_name_fr = ?, app_name_pt = ?, app_name_ru = ?, app_name_zh = ?, app_name_ja = ?, app_name_ko = ?, app_name_it = ?, app_name_id = ?, app_name_vi = ?, app_name_tr = ?, app_icon_url = ?, apple_id = ? WHERE id = ?');
        if (!$stmt) {
            return ['success' => false, 'message' => $mysqli->error];
        }

        $stmt->bind_param('ssssssssssssssssi', $values['app_name'], $values['app_name_en'], $values['app_name_de'], $values['app_name_es'], $values['app_name_fr'], $values['app_name_pt'], $values['app_name_ru'], $values['app_name_zh'], $values['app_name_ja'], $values['app_name_ko'], $values['app_name_it'], $values['app_name_id'], $values['app_name_vi'], $values['app_name_tr'], $values['app_icon_url'], $values['apple_id'], $id);
    } else {
        $visible = 1;
        $stmt = $mysqli->prepare('INSERT INTO fnd_ios_similar_apps (app_name, app_name_en, app_name_de, app_name_es, app_name_fr, app_name_pt, app_name_ru, app_name_zh, app_name_ja, app_name_ko, app_name_it, app_name_id, app_name_vi, app_name_tr, app_icon_url, apple_id, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        if (!$stmt) {
            return ['success' => false, 'message' => $mysqli->error];
        }

        $stmt->bind_param('ssssssssssssssssi', $values['app_name'], $values['app_name_en'], $values['app_name_de'], $values['app_name_es'], $values['app_name_fr'], $values['app_name_pt'], $values['app_name_ru'], $values['app_name_zh'], $values['app_name_ja'], $values['app_name_ko'], $values['app_name_it'], $values['app_name_id'], $values['app_name_vi'], $values['app_name_tr'], $values['app_icon_url'], $values['apple_id'], $visible);
    }

    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['success' => false, 'message' => $error];
    }

    $stmt->close();
    return ['success' => true];
}

?>
