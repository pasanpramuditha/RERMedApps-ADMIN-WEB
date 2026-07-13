<?php

if (PHP_SAPI !== 'cli' && !headers_sent()) {
    http_response_code(410);
    header('Content-Type: application/json');
}

echo json_encode([
    'success' => false,
    'error_msg' => 'Google Cloud Storage report sync has been removed from this project.',
], JSON_PRETTY_PRINT) . PHP_EOL;
exit(1);

