<?php

function google_ads_disabled_response(): void
{
    if (PHP_SAPI !== 'cli' && !headers_sent()) {
        http_response_code(410);
        header('Content-Type: application/json');
    }

    echo json_encode([
        'success' => false,
        'error_msg' => 'Google Ads API sync has been removed from this project.',
    ], JSON_PRETTY_PRINT) . PHP_EOL;
    exit(1);
}

google_ads_disabled_response();

