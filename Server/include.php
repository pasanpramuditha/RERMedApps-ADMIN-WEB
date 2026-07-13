<?php

date_default_timezone_set('Asia/Colombo');

function load_local_env_file($path) {
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        if (str_starts_with($line, 'export ')) {
            $line = trim(substr($line, 7));
        }

        $separator = strpos($line, '=');
        if ($separator === false) {
            continue;
        }

        $name = trim(substr($line, 0, $separator));
        $value = trim(substr($line, $separator + 1));
        if ($name === '') {
            continue;
        }

        $first = $value[0] ?? '';
        $last = $value[strlen($value) - 1] ?? '';
        if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
            $value = substr($value, 1, -1);
        }

        if (getenv($name) === false || getenv($name) === '') {
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

load_local_env_file(__DIR__ . '/.env');

require_once __DIR__ . '/include/db_connect.php';
require_once __DIR__ . '/include/functions.php';
