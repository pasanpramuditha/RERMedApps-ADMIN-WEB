<?php

if ($tag === 'SEND_ADMIN_PUSH_NOTIFICATION') {
    handle_send_admin_push_notification($main_mysqli);
}

if ($tag === 'SEND_ANDROID_USER_PUSH_NOTIFICATION') {
    handle_send_android_user_push_notification($main_mysqli);
}

/**
 * Admin push notification sender.
 *
 * This module supports admin notification broadcasts and user-specific queueing.
 * Broadcasts use Firebase Cloud Messaging HTTP v1 topics. User-specific Android
 * notifications are inserted into fnd_notification_queuee_tab for the cron sender.
 */

function handle_send_admin_push_notification($main_mysqli) {
    if (function_exists('set_time_limit')) {
        set_time_limit(0);
    }
    ignore_user_abort(true);

    $title = trim((string)($_POST['title'] ?? ''));
    $message = trim((string)($_POST['message'] ?? ''));
    $image_url = trim((string)($_POST['image_url'] ?? ''));
    $target_app_ids = parse_push_target_app_ids($_POST['target_app_ids'] ?? '[]');

    if ($title === '' || $message === '' || empty($target_app_ids)) {
        send_json([
            'success' => false,
            'error_msg' => 'title, message, and target_app_ids are required.'
        ], 400);
    }

    $summary = [
        'success' => true,
        'sent' => 0,
        'failed' => 0,
        'skipped' => 0,
        'targeted_apps' => count($target_app_ids),
        'apps' => [],
    ];

    foreach ($target_app_ids as $app_id) {
        $app = GetAppDetailById($main_mysqli, (int)$app_id);
        if ($app === false) {
            $summary['skipped']++;
            $summary['apps'][] = [
                'app_id' => $app_id,
                'success' => false,
                'error_msg' => 'App not found.'
            ];
            continue;
        }

        $app_result = SendAdminPushNotificationToApp($main_mysqli, $app, $title, $message, $image_url);
        $summary['sent'] += $app_result['sent'];
        $summary['failed'] += $app_result['failed'];
        $summary['skipped'] += $app_result['skipped'];
        $summary['apps'][] = $app_result;
    }

    if ($summary['sent'] === 0 && ($summary['failed'] > 0 || $summary['skipped'] > 0)) {
        $summary['success'] = false;
        $summary['error_msg'] = 'No broadcasts were sent. Check app FCM credentials and topic subscriptions.';
    }

    send_json($summary);
}

function handle_send_android_user_push_notification($main_mysqli) {
    if (function_exists('set_time_limit')) {
        set_time_limit(0);
    }
    ignore_user_abort(true);

    $app_id = (int)($_POST['app_id'] ?? 0);
    $email = trim((string)($_POST['email'] ?? ''));
    $title = trim((string)($_POST['title'] ?? ''));
    $message = trim((string)($_POST['message'] ?? ''));

    if ($app_id <= 0 || $email === '' || $title === '' || $message === '') {
        send_json([
            'success' => false,
            'error_msg' => 'app_id, email, title, and message are required.'
        ], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_json([
            'success' => false,
            'error_msg' => 'A valid Android user email is required.'
        ], 400);
    }

    $app = GetAppDetailById($main_mysqli, $app_id);
    if ($app === false) {
        send_json([
            'success' => false,
            'error_msg' => 'Android app not found.'
        ], 404);
    }

    $os = strtolower((string)($app['os'] ?? ''));
    if (strpos($os, 'android') === false) {
        send_json([
            'success' => false,
            'error_msg' => 'User-specific push notifications are currently Android only.'
        ], 400);
    }

    $user_row = GetAndroidUserRegistrationForQueue($main_mysqli, (string)($app['db_name'] ?? ''), $email);
    if (empty($user_row)) {
        send_json([
            'success' => false,
            'error_msg' => 'No valid Android user found for this email in the selected app.'
        ], 404);
    }

    $queue_result = QueueUserNotification($main_mysqli, $app_id, $email, $title, $message);
    if (!$queue_result['success']) {
        send_json([
            'success' => false,
            'error_msg' => $queue_result['error_msg'] ?? 'Unable to queue notification.'
        ], 500);
    }

    send_json([
        'success' => true,
        'queued' => 1,
        'sent' => 0,
        'failed' => 0,
        'skipped' => 0,
        'queue_id' => $queue_result['queue_id'] ?? null,
        'app_id' => $app_id,
        'app_name' => $app['name'] ?? '',
        'db_name' => $app['db_name'] ?? '',
        'email' => $email,
        'title' => $title,
        'message' => $message,
        'user' => [
            'email' => $email,
            'country' => $user_row['country'] ?? null,
            'device' => $user_row['device'] ?? null,
            'last_online' => $user_row['last_online'] ?? null,
        ],
    ]);
}

function parse_push_target_app_ids($value) {
    if (is_array($value)) {
        return array_values(array_filter(array_map('intval', $value)));
    }

    $decoded = json_decode((string)$value, true);
    if (is_array($decoded)) {
        return array_values(array_filter(array_map('intval', $decoded)));
    }

    return array_values(array_filter(array_map('intval', explode(',', (string)$value))));
}

function SendAdminPushNotificationToApp($main_mysqli, $app, $title, $message, $image_url) {
    $app_id = (int)($app['id'] ?? 0);
    $app_name = (string)($app['name'] ?? '');
    $db_name = (string)($app['db_name'] ?? '');
    $package_name = trim((string)($app['package_name'] ?? ''));
    $topic = build_push_topic_name($package_name);
    $private_key = normalize_fcm_private_key((string)($app['private_key'] ?? ''));
    $client_email = trim((string)($app['client_email'] ?? ''));
    $endpoint = trim((string)($app['endpoint'] ?? ''));
    if ($endpoint === '') {
        $endpoint = derive_fcm_endpoint_from_client_email($client_email);
    }

    $result = [
        'app_id' => $app_id,
        'app_name' => $app_name,
        'db_name' => $db_name,
        'package_name' => $package_name,
        'topic' => $topic,
        'success' => true,
        'sent' => 0,
        'failed' => 0,
        'skipped' => 0,
        'errors' => [],
    ];

    if ($topic === '' || $private_key === '' || $client_email === '' || $endpoint === '') {
        $result['success'] = false;
        $result['skipped']++;
        $result['errors'][] = 'Missing package_name/topic, private_key, client_email, or endpoint.';
        return $result;
    }

    $access_token = GetFcmAccessToken($private_key, $client_email);
    if ($access_token === '') {
        $result['success'] = false;
        $result['failed']++;
        $result['errors'][] = 'Unable to create Firebase access token.';
        return $result;
    }

    $send_result = SendFcmHttpV1TopicMessage($endpoint, $access_token, $topic, $title, $message, $image_url);
    if ($send_result['success']) {
        $result['sent']++;
    } else {
        $result['failed']++;
        $result['errors'][] = $send_result['error_msg'];
    }

    $result['success'] = $result['sent'] > 0;
    return $result;
}

function SendAdminPushNotificationToToken($app, $token, $title, $message, $image_url) {
    $app_id = (int)($app['id'] ?? 0);
    $app_name = (string)($app['name'] ?? '');
    $db_name = (string)($app['db_name'] ?? '');
    $package_name = trim((string)($app['package_name'] ?? ''));
    $private_key = normalize_fcm_private_key((string)($app['private_key'] ?? ''));
    $client_email = trim((string)($app['client_email'] ?? ''));
    $endpoint = trim((string)($app['endpoint'] ?? ''));
    if ($endpoint === '') {
        $endpoint = derive_fcm_endpoint_from_client_email($client_email);
    }

    $result = [
        'app_id' => $app_id,
        'app_name' => $app_name,
        'db_name' => $db_name,
        'package_name' => $package_name,
        'success' => true,
        'sent' => 0,
        'failed' => 0,
        'skipped' => 0,
        'errors' => [],
    ];

    if ($token === '' || $private_key === '' || $client_email === '' || $endpoint === '') {
        $result['success'] = false;
        $result['skipped']++;
        $result['errors'][] = 'Missing user token, private_key, client_email, or endpoint.';
        $result['error_msg'] = $result['errors'][0];
        return $result;
    }

    $access_token = GetFcmAccessToken($private_key, $client_email);
    if ($access_token === '') {
        $result['success'] = false;
        $result['failed']++;
        $result['errors'][] = 'Unable to create Firebase access token.';
        $result['error_msg'] = $result['errors'][0];
        return $result;
    }

    $send_result = SendFcmHttpV1TokenMessage($endpoint, $access_token, $token, $title, $message, $image_url);
    if ($send_result['success']) {
        $result['sent']++;
    } else {
        $result['failed']++;
        $result['errors'][] = $send_result['error_msg'];
        $result['error_msg'] = $send_result['error_msg'];
    }

    $result['success'] = $result['sent'] > 0;
    return $result;
}

function build_push_topic_name($package_name) {
    $topic = trim($package_name);
    if ($topic === '') {
        return '';
    }

    // FCM topic names may contain letters, numbers, hyphens, underscores,
    // periods, tildes, and percent signs. Package names already fit this in
    // normal Android/iOS app ids, but sanitize defensively.
    return preg_replace('/[^A-Za-z0-9\-_.~%]/', '_', $topic);
}

function GetFirebaseTokensForApp($main_mysqli, $db_name) {
    $mysqli = SwapDatabase($main_mysqli, $db_name);
    $stmt = $mysqli->prepare(
        "SELECT DISTINCT firebase_token
         FROM fnd_registration_tab
         WHERE valid = 1
           AND firebase_token IS NOT NULL
           AND TRIM(firebase_token) <> ''"
    );

    if (!$stmt || !$stmt->execute()) {
        if ($stmt) {
            $stmt->close();
        }
        return [];
    }

    $rows = get_result($stmt);
    $stmt->close();

    $tokens = [];
    foreach ($rows as $row) {
        $token = trim((string)($row['firebase_token'] ?? ''));
        if ($token !== '') {
            $tokens[] = $token;
        }
    }

    return array_values(array_unique($tokens));
}

function GetFirebaseTokenForUser($main_mysqli, $db_name, $email) {
    if (trim($db_name) === '') {
        return [];
    }

    $mysqli = SwapDatabase($main_mysqli, $db_name);
    $stmt = $mysqli->prepare(
        "SELECT email, country, device, last_online, firebase_token
         FROM fnd_registration_tab
         WHERE valid = 1
           AND email = ?
           AND firebase_token IS NOT NULL
           AND TRIM(firebase_token) <> ''
         ORDER BY id DESC
         LIMIT 1"
    );

    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('s', $email);
    if (!$stmt->execute()) {
        $stmt->close();
        return [];
    }

    $rows = get_result($stmt);
    $stmt->close();

    return $rows[0] ?? [];
}

function GetAndroidUserRegistrationForQueue($main_mysqli, $db_name, $email) {
    if (trim($db_name) === '') {
        return [];
    }

    $mysqli = SwapDatabase($main_mysqli, $db_name);
    $stmt = $mysqli->prepare(
        "SELECT email, country, device, last_online
         FROM fnd_registration_tab
         WHERE valid = 1
           AND email = ?
         ORDER BY id DESC
         LIMIT 1"
    );

    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('s', $email);
    if (!$stmt->execute()) {
        $stmt->close();
        return [];
    }

    $rows = get_result($stmt);
    $stmt->close();

    return $rows[0] ?? [];
}

function QueueUserNotification($main_mysqli, $app_id, $email, $title, $message) {
    $app_id = (int)$app_id;
    $email = trim((string)$email);
    $title = trim((string)$title);
    $message = trim((string)$message);

    if ($app_id <= 0 || $email === '' || $title === '' || $message === '') {
        return [
            'success' => false,
            'error_msg' => 'app_id, email, title, and message are required.'
        ];
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return [
            'success' => false,
            'error_msg' => 'A valid user email is required.'
        ];
    }

    try {
        $admin_mysqli = OpenAdminNotificationQueueDatabase($main_mysqli);
    } catch (Throwable $error) {
        return [
            'success' => false,
            'error_msg' => 'Unable to connect to admin notification queue database: ' . $error->getMessage()
        ];
    }

    $queue_stmt = $admin_mysqli->prepare(
        "INSERT INTO fnd_notification_queuee_tab (db, email, title, body, created, sent, invalid_token)
         VALUES (?, ?, ?, ?, NOW(), NULL, 0)"
    );

    if (!$queue_stmt) {
        $prepare_error = $admin_mysqli->error;
        $admin_mysqli->close();
        return [
            'success' => false,
            'error_msg' => 'Unable to prepare notification queue insert: ' . $prepare_error
        ];
    }

    $queue_stmt->bind_param('isss', $app_id, $email, $title, $message);
    if (!$queue_stmt->execute()) {
        $error = $queue_stmt->error;
        $queue_stmt->close();
        $admin_mysqli->close();
        return [
            'success' => false,
            'error_msg' => 'Unable to queue notification: ' . $error
        ];
    }

    $queue_id = $queue_stmt->insert_id;
    $queue_stmt->close();
    $admin_mysqli->close();

    return [
        'success' => true,
        'queue_id' => $queue_id
    ];
}

function OpenAdminNotificationQueueDatabase($main_mysqli) {
    $admin_db_name = GetReservedDatabaseName($main_mysqli, 0);
    if ($admin_db_name === '') {
        $admin_db_name = 'rermedap_admin';
    }

    return SwapDatabase($main_mysqli, $admin_db_name);
}

function GetReservedDatabaseName($main_mysqli, $app_id) {
    $stmt = $main_mysqli->prepare('SELECT db_name FROM fnd_app_details_tab WHERE id = ? LIMIT 1');
    if (!$stmt) {
        return '';
    }

    $stmt->bind_param('i', $app_id);
    if (!$stmt->execute()) {
        $stmt->close();
        return '';
    }

    $rows = get_result($stmt);
    $stmt->close();

    return trim((string)($rows[0]['db_name'] ?? ''));
}

function normalize_fcm_private_key($private_key) {
    $private_key = trim($private_key);
    if ($private_key === '') {
        return '';
    }

    return str_replace('\\n', "\n", $private_key);
}

function derive_fcm_endpoint_from_client_email($client_email) {
    if (preg_match('/^[^@]+@([^.]+)\.iam\.gserviceaccount\.com$/', $client_email, $matches)) {
        return 'https://fcm.googleapis.com/v1/projects/' . $matches[1] . '/messages:send';
    }

    return '';
}

function GetFcmAccessToken($private_key, $client_email) {
    $header = base64url_encode(json_encode([
        'alg' => 'RS256',
        'typ' => 'JWT',
    ]));

    $now = time();
    $payload = base64url_encode(json_encode([
        'iss' => $client_email,
        'sub' => $client_email,
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
    ]));

    $unsigned_jwt = $header . '.' . $payload;
    $key = openssl_pkey_get_private($private_key);
    if (!$key || !openssl_sign($unsigned_jwt, $signature, $key, OPENSSL_ALGO_SHA256)) {
        return '';
    }

    $assertion = $unsigned_jwt . '.' . base64url_encode($signature);
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $assertion,
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $payload = json_decode((string)$response, true);
    if ($status < 200 || $status >= 300 || !is_array($payload)) {
        return '';
    }

    return (string)($payload['access_token'] ?? '');
}

function SendFcmHttpV1TopicMessage($endpoint, $access_token, $topic, $title, $body, $image_url) {
    return SendFcmHttpV1Message($endpoint, $access_token, 'topic', $topic, $title, $body, $image_url);
}

function SendFcmHttpV1TokenMessage($endpoint, $access_token, $token, $title, $body, $image_url) {
    return SendFcmHttpV1Message($endpoint, $access_token, 'token', $token, $title, $body, $image_url);
}

function SendFcmHttpV1Message($endpoint, $access_token, $target_key, $target_value, $title, $body, $image_url) {
    $notification = [
        'title' => $title,
        'body' => $body,
    ];

    if ($image_url !== '') {
        $notification['image'] = $image_url;
    }

    $message = [
        'message' => [
            $target_key => $target_value,
            'notification' => $notification,
            'data' => [
                'source' => 'admin',
                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
            ],
            'android' => [
                'priority' => 'HIGH',
                'notification' => [
                    'sound' => 'default',
                ],
            ],
            'apns' => [
                'payload' => [
                    'aps' => [
                        'sound' => 'default',
                    ],
                ],
            ],
        ],
    ];

    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $access_token,
        'Content-Type: application/json',
    ]);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return ['success' => false, 'error_msg' => $curl_error ?: 'FCM curl request failed.'];
    }

    if ($status < 200 || $status >= 300) {
        return [
            'success' => false,
            'error_msg' => 'FCM HTTP ' . $status . ': ' . substr((string)$response, 0, 300),
        ];
    }

    return ['success' => true];
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

?>
