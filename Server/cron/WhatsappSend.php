<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Colombo');

/* DB CONFIG */
$dbHost = 'localhost';
$dbName = 'rermedap_';
$dbUser = 'rermedap';
$dbPass = 'Med';

$TBL_EVENTS = 'ios_subscription_events';
$TBL_APPS = 'apple_apps';
$TBL_SETTINGS = 'assn_settings';
$TBL_RATES = 'currency_rates';

$WHATSAPP_GROUP = 'INFO';

function log_cron(string $msg): void
{
    @file_put_contents(
        __DIR__ . '/ios_whatsapp_cron.log',
        '[' . date('c') . '] ' . $msg . PHP_EOL,
        FILE_APPEND
    );
}

function SendWhatsAppMessage(string $group, string $message): array
{
    $url = "https://admin.rermedapps.com/whatsappAPI/sendMessage.php";

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => [
            'group' => $group,
            'message' => $message
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        $err = curl_error($ch);
        curl_close($ch);
        return ['status' => false, 'error' => $err];
    }

    curl_close($ch);
    return ['status' => true, 'response' => $response];
}

/* DB CONNECT */
try {
    $pdo = new PDO(
        "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (Throwable $e) {
    log_cron("DB_CONNECT_FAIL: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'DB connect failed']);
    exit;
}

/* GET ONE UNSENT EVENT */
try {
    $stmt = $pdo->prepare("
    SELECT e.*
    FROM {$TBL_EVENTS} e
    WHERE e.whatsapp_sent = 0
        AND e.notification_type IN ('DID_RENEW', 'SUBSCRIBED','ONE_TIME_CHARGE','OFFER','LIFETIME')
      AND EXISTS (
          SELECT 1
          FROM ios_whatsapp_alert_types a
          WHERE a.is_active = 1
            AND a.alert_key = CASE
                WHEN e.notification_type = 'EXPIRED'
                     OR e.status = 'expired'
                    THEN 'expired'

                WHEN e.notification_type = 'DID_CHANGE_RENEWAL_STATUS'
                     AND e.subtype = 'AUTO_RENEW_DISABLED'
                    THEN 'cancelled'

                WHEN e.notification_type = 'DID_CHANGE_RENEWAL_STATUS'
                    THEN 'status_changed'

                WHEN e.product_id LIKE '%offer%'
                     OR e.product_id LIKE '%gift%'
                     OR e.product_id LIKE '%promo%'
                    THEN 'offer'

	                WHEN e.product_id LIKE '%life%'
	                     OR e.product_id LIKE '%premium%'
	                     OR e.product_id LIKE '%lifetime%'
	                     OR e.duration = 'lifetime'
	                    THEN 'lifetime'

                WHEN e.duration = 'monthly'
                    THEN 'monthly'

	                WHEN e.duration = 'yearly'
	                    THEN 'yearly'

	                WHEN e.notification_type = 'ONE_TIME_CHARGE'
	                    THEN 'lifetime'

	                ELSE ''
	            END
      )

      AND NOT (
          e.duration = 'yearly'
          AND e.status = 'trial'
          AND e.notification_type = 'SUBSCRIBED'
      )

      AND (
            e.environment != 'Sandbox'
            OR (
                e.environment = 'Sandbox'
                AND EXISTS (
                    SELECT 1
                    FROM {$TBL_SETTINGS}
                    WHERE setting_key = 'ENABLE_SANDBOX_ALERTS'
                      AND setting_value = '1'
                    LIMIT 1
                )
            )
      )

    ORDER BY e.created_at ASC
    LIMIT 1
");

    $stmt->execute();
    $event = $stmt->fetch();

    if (!$event) {
        echo json_encode([
            'success' => true,
            'message' => 'No pending WhatsApp messages'
        ]);
        exit;
    }

    $message = buildWhatsAppMessage($pdo, $event, $TBL_EVENTS, $TBL_APPS, $TBL_RATES);

    $sendResult = SendWhatsAppMessage($WHATSAPP_GROUP, $message);

    if ($sendResult['status'] === true) {
        $update = $pdo->prepare("
            UPDATE {$TBL_EVENTS}
            SET whatsapp_sent = 1,
                whatsapp_sent_dttm = NOW()
            WHERE id = ?
            LIMIT 1
        ");
        $update->execute([$event['id']]);

        log_cron("WHATSAPP_SENT event_id={$event['id']} group={$WHATSAPP_GROUP}");

        echo json_encode([
            'success' => true,
            'message' => 'WhatsApp sent successfully',
            'event_id' => $event['id'],
            'environment' => $event['environment'] ?? null,
            'whatsapp_message' => $message,
            'response' => $sendResult['response'] ?? null
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    log_cron("WHATSAPP_SEND_FAIL event_id={$event['id']} error=" . ($sendResult['error'] ?? 'unknown'));

    echo json_encode([
        'success' => false,
        'message' => 'WhatsApp send failed',
        'event_id' => $event['id'],
        'error' => $sendResult['error'] ?? 'unknown'
    ], JSON_UNESCAPED_SLASHES);
    exit;

} catch (Throwable $e) {
    log_cron("CRON_FAIL: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

/* MESSAGE BUILDER */
function buildWhatsAppMessage(PDO $pdo, array $event, string $eventsTable, string $appsTable, string $ratesTable): string
{
    $header = getEventHeader(
        (string) ($event['notification_type'] ?? ''),
        (string) ($event['subtype'] ?? ''),
        (string) ($event['status'] ?? '')
    );

    $environment = strtolower((string) ($event['environment'] ?? ''));

    if ($environment === 'sandbox') {
        $header = "🧪 Sandbox Testing - " . $header;
        $todayIncomeText = 'XXXX';
    } else {
        $currentAmountLkr = getEventAmountLkr($pdo, $event, $ratesTable);
        $todayIncome = getTodaySentIncomeLkrWithCurrent(
            $pdo,
            $eventsTable,
            $currentAmountLkr
        );
        $todayIncomeText = number_format($todayIncome, 2);
    }

    $appName = getAppNameFromAppleApps(
        $pdo,
        $appsTable,
        (string) ($event['app_apple_id'] ?? '')
    );

    $durationText = getDurationText(
        (string) ($event['duration'] ?? 'unknown'),
        (string) ($event['product_id'] ?? '')
    );

    $durationIcon = getDurationIcon($durationText);

    $price = $event['price'] !== null ? number_format((float) $event['price'], 2) : '0.00';
    $currency = !empty($event['currency']) ? strtoupper((string) $event['currency']) : 'N/A';

    return "{$header} | 🔸 iOS\n"
        . "-----------------------------\n"
        . "{$appName}\n"
        . "{$durationIcon} {$durationText} [ {$price} {$currency} ]\n"
        . "----------------------------------------\n"
        . "Total Income Today : {$todayIncomeText} LKR";
}

function getAppNameFromAppleApps(PDO $pdo, string $appsTable, string $appAppleId): string
{
    if ($appAppleId === '') {
        return 'Unknown App';
    }

    $stmt = $pdo->prepare("
        SELECT app_name
        FROM {$appsTable}
        WHERE app_id = ?
        LIMIT 1
    ");
    $stmt->execute([$appAppleId]);

    $appName = $stmt->fetchColumn();

    return $appName ? (string) $appName : 'App ID ' . $appAppleId;
}

function getTodaySentIncomeLkrWithCurrent(PDO $pdo, string $table, float $currentAmount): float
{
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(amount_lkr), 0) AS total_lkr
        FROM {$table}
        WHERE DATE(whatsapp_sent_dttm) = CURDATE()
          AND whatsapp_sent = 1
          AND amount_lkr IS NOT NULL
          AND notification_type IN ('SUBSCRIBED', 'DID_RENEW', 'DID_RECOVER', 'ONE_TIME_CHARGE', 'LIFETIME', 'OFFER')
          AND status NOT IN ('expired', 'refunded', 'revoked', 'billing_retry')
          AND environment != 'Sandbox'
    ");
    $stmt->execute();

    $sentTotal = (float) $stmt->fetchColumn();

    return round($sentTotal + $currentAmount, 2);
}

function getEventAmountLkr(PDO $pdo, array $event, string $ratesTable): float
{
    if (isset($event['amount_lkr']) && is_numeric($event['amount_lkr']) && (float) $event['amount_lkr'] > 0) {
        return (float) $event['amount_lkr'];
    }

    if (!isset($event['price']) || !is_numeric($event['price']) || empty($event['currency'])) {
        return 0.0;
    }

    return convertEventPriceToLkr($pdo, (float) $event['price'], (string) $event['currency'], $ratesTable);
}

function convertEventPriceToLkr(PDO $pdo, float $price, string $currency, string $table): float
{
    $currency = strtoupper(trim($currency));

    if ($price <= 0 || $currency === '') {
        return 0.0;
    }

    if ($currency === 'LKR') {
        return round($price, 2);
    }

    $stmt = $pdo->prepare("
        SELECT currency_code, rate
        FROM {$table}
        WHERE base_currency = 'USD'
          AND currency_code IN (?, 'LKR')
    ");
    $stmt->execute([$currency]);

    $fromRate = $currency === 'USD' ? 1.0 : null;
    $lkrRate = null;

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (strtoupper((string) $row['currency_code']) === $currency) {
            $fromRate = (float) $row['rate'];
        }

        if (strtoupper((string) $row['currency_code']) === 'LKR') {
            $lkrRate = (float) $row['rate'];
        }
    }

    if (!$fromRate || !$lkrRate) {
        return 0.0;
    }

    return round(($price / $fromRate) * $lkrRate, 2);
}

function getEventHeader(string $notificationType, string $subtype, string $status): string
{
    $type = strtoupper(trim($notificationType));
    $sub = strtoupper(trim($subtype));
    $status = strtolower(trim($status));

    if ($type === 'SUBSCRIBED') {
        return '👑️ New Subscription';
    }

    if ($type === 'DID_RENEW' || $type === 'DID_RECOVER') {
        return '💎 Subscription Renewal';
    }

    if ($type === 'EXPIRED' || $status === 'expired') {
        return '⚠️️ Subscription Expired';
    }

    if ($type === 'REFUND' || $status === 'refunded') {
        return '⭕ Subscription/IAP Refund';
    }

    if ($type === 'DID_CHANGE_RENEWAL_STATUS' && $sub === 'AUTO_RENEW_DISABLED') {
        return '❌ Subscription Cancelled';
    }

    if ($type === 'CONSUMPTION_REQUEST' || $type === 'ONE_TIME_CHARGE') {
        return '🔥 New IAP';
    }

    return '🔥 New IAP';
}

function getDurationText(string $duration, string $productId): string
{
    $duration = strtolower(trim($duration));
    $productId = strtolower(trim($productId));

    if (
        str_contains($productId, 'gift') ||
        str_contains($productId, 'offer') ||
        str_contains($productId, 'promo')
    ) {
        return 'Lifetime Offer/Gift';
    }

    if (
        str_contains($productId, 'life') ||
        str_contains($productId, 'lifetime')
    ) {
        return 'Lifetime';
    }

    if ($duration === 'monthly' || str_contains($productId, 'month')) {
        return 'Monthly';
    }

    if ($duration === 'yearly' || str_contains($productId, 'year')) {
        return 'Yearly';
    }

    return 'Lifetime';
}

function getDurationIcon(string $durationText): string
{
    $d = strtolower($durationText);

    if (str_contains($d, 'monthly')) {
        return '🔵';
    }

    if (str_contains($d, 'yearly')) {
        return '🟢';
    }

    if (
        str_contains($d, 'offer') ||
        str_contains($d, 'gift')
    ) {
        return '🔴';
    }

    if (str_contains($d, 'lifetime')) {
        return '🟡';
    }

    return '🟡';
}
