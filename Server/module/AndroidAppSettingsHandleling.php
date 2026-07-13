<?php

if ($_POST['db'] != 0) {
    if ($tag == "GET_ANDROID_APP_SETTINGS") {
        android_app_settings_send_json([
            "success" => TRUE,
            "settings" => GetAndroidAppSettings($mysqli)
        ]);
    } else if ($tag == "SAVE_ANDROID_APP_SETTINGS") {
        $settings_json = $_POST['settings'] ?? '[]';
        $settings = json_decode($settings_json, true);
        if (!is_array($settings)) {
            android_app_settings_send_json([
                "success" => FALSE,
                "error_msg" => "Invalid settings payload"
            ], 400);
        }

        android_app_settings_send_json(SaveAndroidAppSettings($mysqli, $settings));
    }
}

function android_app_settings_send_json($payload, $status_code = 200) {
    if (!headers_sent()) {
        http_response_code($status_code);
        header('Content-Type: application/json');
    }
    echo json_encode($payload);
    EXIT();
}

function GetAndroidAppSettings($mysqli) {
    $prep_stmt = "SELECT category, name, int_value, string_value, description FROM fnd_settings_tab ORDER BY COALESCE(category, 'Uncategorized') ASC, name ASC";
    $stmt = $mysqli->prepare($prep_stmt);
    if ($stmt) {
        if ($stmt->execute()) {
            $lst = get_result($stmt);
            $stmt->close();
            return $lst;
        }

        $stmt->close();
        return [];
    }

    return [];
}

function SaveAndroidAppSettings($mysqli, $settings) {
    foreach ($settings as $setting) {
        if (!is_array($setting)) {
            return ["success" => false, "error_msg" => "Invalid setting row"];
        }

        $name = trim((string)($setting['name'] ?? ''));
        if ($name === '') {
            return ["success" => false, "error_msg" => "Setting name is required"];
        }

        $category = isset($setting['category']) && $setting['category'] !== '' ? (string)$setting['category'] : null;
        $int_value = array_key_exists('int_value', $setting) && $setting['int_value'] !== '' && $setting['int_value'] !== null ? (int)$setting['int_value'] : null;
        $string_value = array_key_exists('string_value', $setting) && $setting['string_value'] !== '' && $setting['string_value'] !== null ? (string)$setting['string_value'] : null;
        $description = isset($setting['description']) && $setting['description'] !== '' ? (string)$setting['description'] : null;

        $result = UpsertAndroidAppSetting($mysqli, $category, $name, $int_value, $string_value, $description);
        if (!$result["success"]) {
            return $result;
        }
    }

    return ["success" => true];
}

function UpsertAndroidAppSetting($mysqli, $category, $name, $int_value, $string_value, $description) {
    $stmt = $mysqli->prepare("UPDATE fnd_settings_tab SET category=?, int_value=?, string_value=?, description=? WHERE name=?");
    if (!$stmt) {
        return ["success" => false, "error_msg" => $mysqli->error];
    }

    $stmt->bind_param('sisss', $category, $int_value, $string_value, $description, $name);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "error_msg" => $error];
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected !== 0) {
        return ["success" => true];
    }

    $stmt = $mysqli->prepare("SELECT name FROM fnd_settings_tab WHERE name=? LIMIT 1");
    if (!$stmt) {
        return ["success" => false, "error_msg" => $mysqli->error];
    }

    $stmt->bind_param('s', $name);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "error_msg" => $error];
    }

    $existing = get_result($stmt);
    $stmt->close();

    if (!empty($existing)) {
        return ["success" => true];
    }

    $stmt = $mysqli->prepare("INSERT INTO fnd_settings_tab (category, name, int_value, string_value, description) VALUES (?, ?, ?, ?, ?)");
    if (!$stmt) {
        return ["success" => false, "error_msg" => $mysqli->error];
    }

    $stmt->bind_param('ssiss', $category, $name, $int_value, $string_value, $description);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "error_msg" => $error];
    }

    $stmt->close();
    return ["success" => true];
}

?>
