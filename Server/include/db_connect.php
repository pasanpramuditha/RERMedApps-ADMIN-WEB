<?php

function env_value($name, $default = '') {
    $value = getenv($name);
    return ($value === false || $value === '') ? $default : $value;
}

function fail_db_request($message, $status_code = 500) {
    if (!headers_sent()) {
        http_response_code($status_code);
        header('Content-Type: application/json');
    }

    echo json_encode([
        'success' => false,
        'error_msg' => $message
    ]);
    exit();
}

function required_env_value($name) {
    $value = env_value($name);
    if ($value === '') {
        fail_db_request('Missing required server configuration: ' . $name, 500);
    }

    return $value;
}

define('MAIN_DB_HOST', required_env_value('MAIN_DB_HOST'));
define('MAIN_DB_USER', required_env_value('MAIN_DB_USER'));
define('MAIN_DB_PASS', required_env_value('MAIN_DB_PASS'));
define('MAIN_DB_NAME', required_env_value('MAIN_DB_NAME'));

define('APP_DB_HOST', required_env_value('APP_DB_HOST'));
define('APP_DB_USER', required_env_value('APP_DB_USER'));
define('APP_DB_PASS', required_env_value('APP_DB_PASS'));

function connect_mysql($host, $username, $password, $database) {
    $mysqli = new mysqli($host, $username, $password, $database);

    if ($mysqli->connect_error) {
        fail_db_request('Unable to connect to database');
    }

    if (!$mysqli->set_charset('utf8')) {
        fail_db_request('Unable to set database charset');
    }

    $mysqli->query("SET time_zone = '+05:30'");

    return $mysqli;
}

$main_mysqli = connect_mysql(MAIN_DB_HOST, MAIN_DB_USER, MAIN_DB_PASS, MAIN_DB_NAME);

function GetDatabaseName($mysqli, $db_id) {
    $db_id = (int)$db_id;
    if ($db_id <= 0) {
        return '';
    }

    $stmt = $mysqli->prepare('SELECT db_name FROM fnd_app_details_tab WHERE id = ? AND status IN (1, 2) LIMIT 1');
    if (!$stmt) {
        return '';
    }

    $stmt->bind_param('i', $db_id);
    if (!$stmt->execute()) {
        $stmt->close();
        return '';
    }

    $result = get_result($stmt);
    $stmt->close();

    return $result[0]['db_name'] ?? '';
}

function internal_database_allowlist() {
    $configured = array_filter(array_map('trim', explode(',', env_value('PHP_INTERNAL_DB_ALLOWLIST'))));
    $defaults = array_filter([MAIN_DB_NAME]);

    return array_values(array_unique(array_merge($defaults, $configured)));
}

function IsAllowedDatabaseName($mysqli, $db_name) {
    $db_name = trim((string)$db_name);
    if ($db_name === '') {
        return false;
    }

    if (in_array($db_name, internal_database_allowlist(), true)) {
        return true;
    }

    $stmt = $mysqli->prepare('SELECT id FROM fnd_app_details_tab WHERE db_name = ? AND status IN (1, 2) LIMIT 1');
    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('s', $db_name);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $result = get_result($stmt);
    $stmt->close();

    return !empty($result);
}

function ResolveDatabaseName($main_mysqli, $db_value) {
    if (is_numeric($db_value)) {
        return GetDatabaseName($main_mysqli, (int)$db_value);
    }

    $db_name = trim((string)$db_value);
    if (!IsAllowedDatabaseName($main_mysqli, $db_name)) {
        return '';
    }

    return $db_name;
}

function SwapDatabase($main_mysqli, $db_value) {
    $db_name = ResolveDatabaseName($main_mysqli, $db_value);
    if ($db_name === '') {
        fail_db_request('Invalid database id', 400);
    }

    return connect_mysql(APP_DB_HOST, APP_DB_USER, APP_DB_PASS, $db_name);
}

function SwapDatabase2($main_mysqli, $db_id) {
    return SwapDatabase($main_mysqli, $db_id);
}

?>
