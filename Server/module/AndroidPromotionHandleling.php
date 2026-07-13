<?php

const ANDROID_PROMOTION_DEFAULT_NOTIFICATION_TITLE_KEY = 'PROMO_DEFAULT_TITLE';
const ANDROID_PROMOTION_DEFAULT_NOTIFICATION_BODY_KEY = 'PROMO_DEFAULT_BODY';

if ($tag === 'GET_ANDROID_PROMOTION_RECENT_PURCHASES') {
    handle_android_promotion_recent_purchases($main_mysqli);
}

if ($tag === 'GET_ANDROID_PROMOTION_USER_PROFILE') {
    handle_android_promotion_user_profile($main_mysqli);
}

if ($tag === 'GET_ANDROID_PROMOTION_TEMPLATES') {
    handle_android_promotion_templates($main_mysqli);
}

if ($tag === 'GET_ANDROID_PROMOTION_NOTIFICATION_TEMPLATES') {
    handle_android_promotion_notification_templates($main_mysqli);
}

if ($tag === 'GET_ANDROID_PROMOTION_CAMPAIGNS') {
    handle_android_promotion_campaigns($main_mysqli);
}

if ($tag === 'GET_ANDROID_PROMOTION_REWARD_VALUES') {
    handle_android_promotion_reward_values($main_mysqli);
}

if ($tag === 'CREATE_ANDROID_PROMOTION_CAMPAIGN') {
    handle_android_promotion_create_campaign($main_mysqli);
}

if ($tag === 'UPDATE_ANDROID_PROMOTION_CAMPAIGN_STATUS') {
    handle_android_promotion_update_campaign_status($main_mysqli);
}

function android_promotion_json(array $payload, int $statusCode = 200): void
{
    if (function_exists('send_json')) {
        send_json($payload, $statusCode);
    }

    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
    }

    echo json_encode($payload);
    exit();
}

function android_promotion_bounds(string $period): array
{
    $tz = new DateTimeZone('Asia/Colombo');
    $today = new DateTime('today', $tz);

    if ($period === 'yesterday') {
        $from = (clone $today)->modify('-1 day');
        $to = (clone $from)->setTime(23, 59, 59);
        return [$from->format('Y-m-d 00:00:00'), $to->format('Y-m-d H:i:s')];
    }

    if ($period === 'last7days') {
        $from = (clone $today)->modify('-6 days');
        $to = (clone $today)->setTime(23, 59, 59);
        return [$from->format('Y-m-d 00:00:00'), $to->format('Y-m-d H:i:s')];
    }

    $to = (clone $today)->setTime(23, 59, 59);
    return [$today->format('Y-m-d 00:00:00'), $to->format('Y-m-d H:i:s')];
}

function android_promotion_translation_default(array $translations, string $key, string $fallback = ''): string
{
    $english = trim((string)($translations[$key]['en'] ?? ''));
    if ($english !== '') {
        return $english;
    }

    $fallback = trim($fallback);
    return $fallback !== '' ? $fallback : $key;
}

function android_promotion_get_apps(mysqli $main_mysqli): array
{
    $apps = [];
    $sql = "
        SELECT id, package_name, db_name, name, icon_url, paid, app_order, status
        FROM fnd_app_details_tab
        WHERE LOWER(os) LIKE '%android%'
          AND status <> 4
          AND id NOT IN (0, 100)
          AND db_name IS NOT NULL
          AND db_name <> ''
        ORDER BY app_order ASC, name ASC
    ";

    $result = $main_mysqli->query($sql);
    if (!$result) {
        return $apps;
    }

    while ($row = $result->fetch_assoc()) {
        $apps[] = [
            'id' => (int)($row['id'] ?? 0),
            'package_name' => (string)($row['package_name'] ?? ''),
            'db_name' => (string)($row['db_name'] ?? ''),
            'name' => (string)($row['name'] ?? ''),
            'icon_url' => (string)($row['icon_url'] ?? ''),
            'paid' => (int)($row['paid'] ?? 0),
            'app_order' => (int)($row['app_order'] ?? 0),
            'status' => (int)($row['status'] ?? 0),
        ];
    }

    $result->free();
    return $apps;
}

function handle_android_promotion_recent_purchases(mysqli $main_mysqli): void
{
    $period = trim((string)($_POST['period'] ?? 'today'));
    $limit = max(1, min(300, (int)($_POST['limit'] ?? 100)));
    [$from, $to] = android_promotion_bounds($period);
    $apps = android_promotion_get_apps($main_mysqli);
    $users = [];

    foreach ($apps as $app) {
        try {
            $appMysqli = SwapDatabase($main_mysqli, $app['db_name']);
            $rows = android_promotion_get_purchase_rows($appMysqli, $from, $to);
            $appMysqli->close();
        } catch (Throwable $error) {
            continue;
        }

        foreach ($rows as $row) {
            $email = strtolower(trim((string)($row['email'] ?? '')));
            if ($email === '') {
                continue;
            }

            if (!isset($users[$email])) {
                $users[$email] = [
                    'email' => $email,
                    'latest_purchase_date' => (string)($row['purchased_date'] ?? ''),
                    'purchase_count' => 0,
                    'purchased_apps' => [],
                ];
            }

            $users[$email]['purchase_count']++;
            if ((string)($row['purchased_date'] ?? '') > $users[$email]['latest_purchase_date']) {
                $users[$email]['latest_purchase_date'] = (string)$row['purchased_date'];
            }

            $users[$email]['purchased_apps'][] = [
                'app_id' => $app['id'],
                'app_name' => $app['name'],
                'app_icon' => $app['icon_url'],
                'db_name' => $app['db_name'],
                'sku' => (string)($row['sku'] ?? ''),
                'order_id' => (string)($row['order_id'] ?? ''),
                'purchased_date' => (string)($row['purchased_date'] ?? ''),
            ];
        }
    }

    $list = array_values($users);
    usort($list, function ($a, $b) {
        return strcmp($b['latest_purchase_date'], $a['latest_purchase_date']);
    });

    android_promotion_json([
        'success' => true,
        'period' => $period,
        'from' => $from,
        'to' => $to,
        'count' => count($list),
        'users' => array_slice($list, 0, $limit),
    ]);
}

function handle_android_promotion_templates(mysqli $main_mysqli): void
{
    try {
        $templateMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
    } catch (Throwable $error) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to connect to rermedap_admin database: ' . $error->getMessage(),
        ], 500);
    }

    $sql = "
        SELECT id, template_name, package_name, promo_html, valid_from, valid_to, status, created_at
        FROM fnd_global_promotion_template_tab
        ORDER BY
            CASE WHEN UPPER(COALESCE(status, '')) = 'LIVE' THEN 0 ELSE 1 END,
            created_at DESC,
            template_name ASC
    ";

    $templates = [];
    $result = $templateMysqli->query($sql);
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $templates[] = [
                'id' => (int)($row['id'] ?? 0),
                'template_name' => (string)($row['template_name'] ?? ''),
                'package_name' => (string)($row['package_name'] ?? ''),
                'promo_html' => (string)($row['promo_html'] ?? ''),
                'valid_from' => (string)($row['valid_from'] ?? ''),
                'valid_to' => (string)($row['valid_to'] ?? ''),
                'status' => (string)($row['status'] ?? ''),
                'created_at' => (string)($row['created_at'] ?? ''),
            ];
        }
        $result->free();
    }
    $templateMysqli->close();

    android_promotion_json([
        'success' => true,
        'source_db' => 'rermedap_admin',
        'count' => count($templates),
        'templates' => $templates,
    ]);
}

function handle_android_promotion_notification_templates(mysqli $main_mysqli): void
{
    try {
        $adminMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
    } catch (Throwable $error) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to connect to rermedap_admin database: ' . $error->getMessage(),
        ], 500);
    }

    $translationColumns = [
        'en' => 'en_trans',
        'de' => 'de_trans',
        'es' => 'es_trans',
        'fr' => 'fr_trans',
        'id' => 'id_trans',
        'it' => 'it_trans',
        'ja' => 'ja_trans',
        'ko' => 'ko_trans',
        'pt' => 'pt_trans',
        'ru' => 'ru_trans',
        'tr' => 'tr_trans',
        'vi' => 'vi_trans',
        'zh' => 'zh_trans',
    ];
    $translationSelect = implode(', ', array_map(function ($column) {
        return $column;
    }, $translationColumns));

    $translations = [];
    $translationSql = "SELECT prog, {$translationSelect} FROM fnd_translation_tab";
    $translationResult = $adminMysqli->query($translationSql);
    if ($translationResult) {
        while ($row = $translationResult->fetch_assoc()) {
            $prog = (string)($row['prog'] ?? '');
            if ($prog === '') {
                continue;
            }

            $translation = [];
            foreach ($translationColumns as $code => $column) {
                $translation[$code] = (string)($row[$column] ?? '');
            }
            $translations[$prog] = $translation;
        }
        $translationResult->free();
    }

    $sql = "
        SELECT id, package_name, notification_type, key_title, key_body, title, body, created_at
        FROM fnd_global_notification_template_tab
        ORDER BY package_name ASC, id ASC
    ";

    $templates = [];
    $hasDefaultTemplateByPackage = [];
    $result = $adminMysqli->query($sql);
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $keyTitle = (string)($row['key_title'] ?? '');
            $keyBody = (string)($row['key_body'] ?? '');
            $packageName = (string)($row['package_name'] ?? '');
            if ($keyTitle === ANDROID_PROMOTION_DEFAULT_NOTIFICATION_TITLE_KEY && $keyBody === ANDROID_PROMOTION_DEFAULT_NOTIFICATION_BODY_KEY) {
                $hasDefaultTemplateByPackage[strtolower(trim($packageName))] = true;
            }
            $templates[] = [
                'id' => (int)($row['id'] ?? 0),
                'package_name' => $packageName,
                'notification_type' => (string)($row['notification_type'] ?? ''),
                'key_title' => $keyTitle,
                'key_body' => $keyBody,
                'title' => android_promotion_translation_default($translations, $keyTitle, (string)($row['title'] ?? '')),
                'body' => android_promotion_translation_default($translations, $keyBody, (string)($row['body'] ?? '')),
                'created_at' => (string)($row['created_at'] ?? ''),
                'translations' => [
                    'title' => $translations[$keyTitle] ?? [],
                    'body' => $translations[$keyBody] ?? [],
                ],
            ];
        }
        $result->free();
    }

    foreach (android_promotion_get_apps($main_mysqli) as $app) {
        $packageName = trim((string)($app['package_name'] ?? ''));
        if ($packageName === '' || isset($hasDefaultTemplateByPackage[strtolower($packageName)])) {
            continue;
        }

        $templates[] = [
            'id' => -1 * max(1, (int)($app['id'] ?? 0)),
            'package_name' => $packageName,
            'notification_type' => 'PROMO',
            'key_title' => ANDROID_PROMOTION_DEFAULT_NOTIFICATION_TITLE_KEY,
            'key_body' => ANDROID_PROMOTION_DEFAULT_NOTIFICATION_BODY_KEY,
            'title' => android_promotion_translation_default($translations, ANDROID_PROMOTION_DEFAULT_NOTIFICATION_TITLE_KEY),
            'body' => android_promotion_translation_default($translations, ANDROID_PROMOTION_DEFAULT_NOTIFICATION_BODY_KEY),
            'created_at' => '',
            'translations' => [
                'title' => $translations[ANDROID_PROMOTION_DEFAULT_NOTIFICATION_TITLE_KEY] ?? [],
                'body' => $translations[ANDROID_PROMOTION_DEFAULT_NOTIFICATION_BODY_KEY] ?? [],
            ],
        ];
    }
    $adminMysqli->close();

    android_promotion_json([
        'success' => true,
        'source_db' => 'rermedap_admin',
        'count' => count($templates),
        'notification_templates' => $templates,
    ]);
}

function handle_android_promotion_campaigns(mysqli $main_mysqli): void
{
    try {
        $adminMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
    } catch (Throwable $error) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to connect to rermedap_admin database: ' . $error->getMessage(),
        ], 500);
    }

    $sql = "
        SELECT id, template_id, target_package_name, campaign_id, target_email, target_country,
               target_lang, target_user_type, reward_type, reward_value, valid_from, valid_to, status
        FROM fnd_global_promotion_campaign_tab
        ORDER BY
          CASE WHEN UPPER(COALESCE(status, '')) = 'LIVE' THEN 0 ELSE 1 END,
          valid_from DESC,
          id DESC
    ";

    $campaigns = [];
    $result = $adminMysqli->query($sql);
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $campaigns[] = [
                'id' => (int)($row['id'] ?? 0),
                'template_id' => (int)($row['template_id'] ?? 0),
                'target_package_name' => (string)($row['target_package_name'] ?? ''),
                'campaign_id' => (string)($row['campaign_id'] ?? ''),
                'target_email' => (string)($row['target_email'] ?? ''),
                'target_country' => (string)($row['target_country'] ?? ''),
                'target_lang' => (string)($row['target_lang'] ?? ''),
                'target_user_type' => (string)($row['target_user_type'] ?? ''),
                'reward_type' => (string)($row['reward_type'] ?? ''),
                'reward_value' => (string)($row['reward_value'] ?? ''),
                'valid_from' => (string)($row['valid_from'] ?? ''),
                'valid_to' => (string)($row['valid_to'] ?? ''),
                'status' => (string)($row['status'] ?? ''),
            ];
        }
        $result->free();
    }
    $adminMysqli->close();

    android_promotion_json([
        'success' => true,
        'source_db' => 'rermedap_admin',
        'count' => count($campaigns),
        'campaigns' => $campaigns,
    ]);
}

function handle_android_promotion_reward_values(mysqli $main_mysqli): void
{
    $packageName = trim((string)($_POST['package_name'] ?? ''));
    if ($packageName === '') {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'package_name is required.',
        ], 400);
    }

    $app = android_promotion_find_app_by_package($main_mysqli, $packageName);
    if (!$app || (string)($app['db_name'] ?? '') === '') {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to find app database for package: ' . $packageName,
        ], 404);
    }

    try {
        $appMysqli = SwapDatabase($main_mysqli, (string)$app['db_name']);
    } catch (Throwable $error) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to connect to app database: ' . $error->getMessage(),
        ], 500);
    }

    $rewardValues = [];
    $sql = "
        SELECT name, discount, valid, active_offer, Description, iap_type
        FROM fnd_iap_tab
        WHERE name LIKE 'lifetime_promo%'
        ORDER BY
            CASE WHEN name = 'lifetime_promo_earlyaccess' THEN 0 ELSE 1 END,
            name ASC
    ";
    $result = $appMysqli->query($sql);
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $rewardValues[] = [
                'name' => (string)($row['name'] ?? ''),
                'discount' => (float)($row['discount'] ?? 0),
                'valid' => (int)($row['valid'] ?? 0),
                'active_offer' => (int)($row['active_offer'] ?? 0),
                'description' => (string)($row['Description'] ?? ''),
                'iap_type' => (string)($row['iap_type'] ?? ''),
            ];
        }
        $result->free();
    }
    $appMysqli->close();

    android_promotion_json([
        'success' => true,
        'package_name' => $packageName,
        'source_db' => (string)$app['db_name'],
        'count' => count($rewardValues),
        'reward_values' => $rewardValues,
    ]);
}

function handle_android_promotion_create_campaign(mysqli $main_mysqli): void
{
    $promotionType = strtolower(trim((string)($_POST['promotion_type'] ?? '')));
    $templateId = (int)($_POST['template_id'] ?? 0);
    $targetPackageName = trim((string)($_POST['target_package_name'] ?? ''));
    $campaignId = trim((string)($_POST['campaign_id'] ?? ''));
    $targetEmail = trim((string)($_POST['target_email'] ?? '*'));
    $targetCountry = trim((string)($_POST['target_country'] ?? '*'));
    $targetLang = trim((string)($_POST['target_lang'] ?? '*'));
    $targetUserType = trim((string)($_POST['target_user_type'] ?? '*'));
    $rewardType = trim((string)($_POST['reward_type'] ?? 'IAP_DISCOUNT'));
    $rewardValue = trim((string)($_POST['reward_value'] ?? ''));
    $validFrom = trim((string)($_POST['valid_from'] ?? ''));
    $validTo = trim((string)($_POST['valid_to'] ?? ''));
    $status = trim((string)($_POST['status'] ?? 'LIVE'));
    $notificationEnabled = trim((string)($_POST['notification_enabled'] ?? '1')) === '1';
    $notificationTitle = trim((string)($_POST['notification_title'] ?? ''));
    $notificationBody = trim((string)($_POST['notification_body'] ?? ''));
    $notificationAppPackageName = trim((string)($_POST['notification_app_package_name'] ?? $targetPackageName));

    if ($promotionType === 'global') {
        $notificationEnabled = false;
    }

    if ($notificationEnabled) {
        $notificationTitle = ANDROID_PROMOTION_DEFAULT_NOTIFICATION_TITLE_KEY;
        $notificationBody = ANDROID_PROMOTION_DEFAULT_NOTIFICATION_BODY_KEY;
    }

    if ($templateId <= 0 || $targetPackageName === '' || $campaignId === '' || ($rewardType === 'IAP_DISCOUNT' && $rewardValue === '') || $validFrom === '' || $validTo === '') {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'template_id, target_package_name, campaign_id, valid_from, and valid_to are required. reward_value is required for IAP_DISCOUNT.',
        ], 400);
    }

    try {
        $adminMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
    } catch (Throwable $error) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to connect to rermedap_admin database: ' . $error->getMessage(),
        ], 500);
    }

    $stmt = $adminMysqli->prepare("
        INSERT INTO fnd_global_promotion_campaign_tab
            (template_id, target_package_name, campaign_id, target_email, target_country, target_lang,
             target_user_type, reward_type, reward_value, valid_from, valid_to, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    if (!$stmt) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to prepare campaign insert: ' . $adminMysqli->error,
        ], 500);
    }
    $stmt->bind_param(
        'isssssssssss',
        $templateId,
        $targetPackageName,
        $campaignId,
        $targetEmail,
        $targetCountry,
        $targetLang,
        $targetUserType,
        $rewardType,
        $rewardValue,
        $validFrom,
        $validTo,
        $status
    );
    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to create campaign: ' . $error,
        ], 500);
    }
    $campaignRowId = $stmt->insert_id;
    $stmt->close();

    $notificationQueued = false;
    if ($notificationEnabled && $notificationTitle !== '' && $notificationBody !== '') {
        $targetAppId = android_promotion_find_app_id_by_package($main_mysqli, $notificationAppPackageName !== '' ? $notificationAppPackageName : $targetPackageName);
        $queueEmail = $targetEmail !== '' ? $targetEmail : '*';
        $queueStmt = $adminMysqli->prepare("
            INSERT INTO fnd_notification_queuee_tab (db, email, title, body, created, sent, invalid_token)
            VALUES (?, ?, ?, ?, NOW(), NULL, 0)
        ");
        if ($queueStmt) {
            $queueStmt->bind_param('isss', $targetAppId, $queueEmail, $notificationTitle, $notificationBody);
            $notificationQueued = $queueStmt->execute();
            $queueStmt->close();
        }
    }
    $adminMysqli->close();

    android_promotion_json([
        'success' => true,
        'campaign_id' => $campaignRowId,
        'notification_queued' => $notificationQueued,
    ]);
}

function handle_android_promotion_update_campaign_status(mysqli $main_mysqli): void
{
    $campaignId = (int)($_POST['campaign_id'] ?? 0);
    $status = strtoupper(trim((string)($_POST['status'] ?? '')));
    $allowedStatuses = ['DRAFT', 'TEST', 'LIVE'];

    if ($campaignId <= 0 || !in_array($status, $allowedStatuses, true)) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Valid campaign_id and status are required.',
        ], 400);
    }

    try {
        $adminMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
    } catch (Throwable $error) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to connect to rermedap_admin database: ' . $error->getMessage(),
        ], 500);
    }

    $stmt = $adminMysqli->prepare("UPDATE fnd_global_promotion_campaign_tab SET status = ? WHERE id = ? LIMIT 1");
    if (!$stmt) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to prepare status update: ' . $adminMysqli->error,
        ], 500);
    }

    $stmt->bind_param('si', $status, $campaignId);
    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        $adminMysqli->close();
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Unable to update campaign status: ' . $error,
        ], 500);
    }

    $updated = $stmt->affected_rows >= 0;
    $stmt->close();
    $adminMysqli->close();

    android_promotion_json([
        'success' => $updated,
        'campaign_id' => $campaignId,
        'status' => $status,
    ]);
}

function android_promotion_find_app_id_by_package(mysqli $main_mysqli, string $packageName): int
{
    $stmt = $main_mysqli->prepare("SELECT id FROM fnd_app_details_tab WHERE package_name = ? LIMIT 1");
    if (!$stmt) {
        return 0;
    }
    $stmt->bind_param('s', $packageName);
    if (!$stmt->execute()) {
        $stmt->close();
        return 0;
    }
    $rows = get_result($stmt);
    $stmt->close();
    return isset($rows[0]['id']) ? (int)$rows[0]['id'] : 0;
}

function android_promotion_find_app_by_package(mysqli $main_mysqli, string $packageName): ?array
{
    $stmt = $main_mysqli->prepare("SELECT id, package_name, db_name, name FROM fnd_app_details_tab WHERE package_name = ? LIMIT 1");
    if (!$stmt) {
        return null;
    }
    $stmt->bind_param('s', $packageName);
    if (!$stmt->execute()) {
        $stmt->close();
        return null;
    }
    $rows = get_result($stmt);
    $stmt->close();
    return $rows[0] ?? null;
}

function android_promotion_get_purchase_rows(mysqli $mysqli, string $from, string $to): array
{
    $sql = "
        SELECT email, sku, package, order_id, os, device, purchased_date, app_version
        FROM fnd_purchase_tab
        WHERE purchased_date BETWEEN ? AND ?
        ORDER BY purchased_date DESC
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('ss', $from, $to);
    if (!$stmt->execute()) {
        $stmt->close();
        return [];
    }

    $rows = get_result($stmt);
    $stmt->close();
    return $rows ?: [];
}

function handle_android_promotion_user_profile(mysqli $main_mysqli): void
{
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        android_promotion_json([
            'success' => false,
            'error_msg' => 'Valid email is required',
        ], 400);
    }

    $apps = android_promotion_get_apps($main_mysqli);
    $appStatuses = [];
    $summary = [
        'purchased' => 0,
        'installed_not_purchased' => 0,
        'not_installed' => 0,
        'premium' => 0,
    ];

    foreach ($apps as $app) {
        $registration = null;
        $purchase = null;

        try {
            $appMysqli = SwapDatabase($main_mysqli, $app['db_name']);
            $registration = android_promotion_get_registration($appMysqli, $email);
            $purchase = android_promotion_get_latest_purchase($appMysqli, $email);
            $appMysqli->close();
        } catch (Throwable $error) {
            $registration = null;
            $purchase = null;
        }

        $hasPurchase = is_array($purchase);
        $hasRegistration = is_array($registration);
        $forcePremium = $hasRegistration && (int)($registration['premium'] ?? 0) === 1;
        $premium = $hasPurchase || $forcePremium;
        $status = $hasPurchase ? 'purchased' : ($hasRegistration ? 'installed_not_purchased' : 'not_installed');
        $summary[$status]++;
        if ($premium) {
            $summary['premium']++;
        }

        $appStatuses[] = [
            'app_id' => $app['id'],
            'app_name' => $app['name'],
            'app_icon' => $app['icon_url'],
            'package_name' => $app['package_name'],
            'db_name' => $app['db_name'],
            'status' => $status,
            'premium' => $premium,
            'force_premium' => $forcePremium,
            'registered_date' => $registration['registered_date'] ?? null,
            'last_online' => $registration['last_online'] ?? null,
            'device' => $registration['device'] ?? null,
            'language' => $registration['language'] ?? null,
            'sku' => $purchase['sku'] ?? null,
            'order_id' => $purchase['order_id'] ?? null,
            'purchased_date' => $purchase['purchased_date'] ?? null,
        ];
    }

    android_promotion_json([
        'success' => true,
        'email' => $email,
        'summary' => $summary,
        'apps' => $appStatuses,
    ]);
}

function android_promotion_get_registration(mysqli $mysqli, string $email): ?array
{
    $sql = "
        SELECT email, registered_date, device, premium, ads_free, last_online, curr_version, language
        FROM fnd_registration_tab
        WHERE email = ?
        ORDER BY id DESC
        LIMIT 1
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('s', $email);
    if (!$stmt->execute()) {
        $stmt->close();
        return null;
    }

    $rows = get_result($stmt);
    $stmt->close();
    return $rows[0] ?? null;
}

function android_promotion_get_latest_purchase(mysqli $mysqli, string $email): ?array
{
    $sql = "
        SELECT email, sku, package, order_id, purchased_date, app_version
        FROM fnd_purchase_tab
        WHERE email = ?
        ORDER BY purchased_date DESC
        LIMIT 1
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('s', $email);
    if (!$stmt->execute()) {
        $stmt->close();
        return null;
    }

    $rows = get_result($stmt);
    $stmt->close();
    return $rows[0] ?? null;
}
