<?php
header('Content-Type: application/json; charset=utf-8');
http_response_code(200);
date_default_timezone_set('Asia/Colombo');

/* DB CONFIG */
$dbHost = 'localhost';
$dbName = 'rermedap';
$dbUser = 'rermedap';
$dbPass = 'Med';

$TBL_STATES = 'ios_subscription_states';
$TBL_EVENTS = 'ios_subscription_events';
$TBL_RATES = 'currency_rates';

$RAW_FILE = __DIR__ . '/assn_raw.log';

function log_assn(string $msg): void
{
    @file_put_contents(
        __DIR__ . '/assn_debug.log',
        '[' . date('c') . '] ' . $msg . PHP_EOL,
        FILE_APPEND
    );
}

function ok_exit(array $extra = []): void
{
    echo json_encode(array_merge(['ok' => true], $extra), JSON_UNESCAPED_SLASHES);
    exit;
}

/* READ BODY */
$raw = file_get_contents('php://input');

if ($raw === false || trim($raw) === '') {
    log_assn("EMPTY_BODY");
    ok_exit(['message' => 'Empty body']);
}

@file_put_contents(
    $RAW_FILE,
    "----- " . date('c') . " -----\n" . $raw . "\n\n",
    FILE_APPEND
);

$body = json_decode($raw, true);

if (!is_array($body) || empty($body['signedPayload'])) {
    log_assn("INVALID_JSON_OR_MISSING_SIGNEDPAYLOAD");
    ok_exit(['message' => 'Missing signedPayload']);
}

$signedPayload = (string) $body['signedPayload'];

/* DECODE PAYLOAD */
$payload = decodeAppleJwsPayload($signedPayload);

$notificationType = (string) ($payload['notificationType'] ?? 'UNKNOWN');
$subtype = $payload['subtype'] ?? null;
$notificationUuid = $payload['notificationUUID'] ?? substr(hash('sha256', $signedPayload), 0, 36);

$data = $payload['data'] ?? [];
if (!is_array($data))
    $data = [];

$environment = (string) ($data['environment'] ?? 'Production');
$appAppleId = (string) ($data['appAppleId'] ?? 'unknown');

/* DECODE TRANSACTION */
$txDecoded = [];
if (!empty($data['signedTransactionInfo'])) {
    $txDecoded = decodeAppleJwsPayload((string) $data['signedTransactionInfo']);
}

/* DECODE RENEWAL */
$renewDecoded = [];
if (!empty($data['signedRenewalInfo'])) {
    $renewDecoded = decodeAppleJwsPayload((string) $data['signedRenewalInfo']);
}

/* EXTRACT FIELDS */
$originalTransactionId =
    $txDecoded['originalTransactionId']
    ?? $renewDecoded['originalTransactionId']
    ?? null;

$transactionId = $txDecoded['transactionId'] ?? null;

$productId =
    $txDecoded['productId']
    ?? $renewDecoded['productId']
    ?? null;

$subscriptionGroupId =
    $txDecoded['subscriptionGroupIdentifier']
    ?? null;

$expiresAt = null;
if (!empty($txDecoded['expiresDate']) && is_numeric($txDecoded['expiresDate'])) {
    $expiresAt = date('Y-m-d H:i:s', ((int) $txDecoded['expiresDate']) / 1000);
}

$autoRenewStatus = null;
if (isset($renewDecoded['autoRenewStatus']) && is_numeric($renewDecoded['autoRenewStatus'])) {
    $autoRenewStatus = (int) $renewDecoded['autoRenewStatus'];
}

/* PRICE + CURRENCY */
$price = null;
$currency = null;

if (isset($txDecoded['price']) && is_numeric($txDecoded['price'])) {
    $price = round(((int) $txDecoded['price']) / 1000, 2);
} elseif (isset($renewDecoded['renewalPrice']) && is_numeric($renewDecoded['renewalPrice'])) {
    $price = round(((int) $renewDecoded['renewalPrice']) / 1000, 2);
}

if (!empty($txDecoded['currency'])) {
    $currency = strtoupper((string) $txDecoded['currency']);
} elseif (!empty($renewDecoded['currency'])) {
    $currency = strtoupper((string) $renewDecoded['currency']);
}

$duration = detectDuration($productId);

/* FALLBACK PRICE FOR LIFETIME / GIFT / OFFER */
if ($price === null) {

    if ($duration === 'lifetime') {
        $price = 49.00;
        $currency = 'USD';
    }

    if ($duration === 'offer') {
        $price = 25.00;
        $currency = 'USD';
    }
}

$status = mapAppleStatus($notificationType, $subtype, $txDecoded);
$activeCount = in_array($status, ['active', 'trial', 'grace_period'], true) ? 1 : 0;

$rawPayloadJson = json_encode([
    'raw_body' => $body,
    'notification_payload' => $payload,
    'transaction_info' => $txDecoded,
    'renewal_info' => $renewDecoded
], JSON_UNESCAPED_SLASHES);

if (!$originalTransactionId) {
    log_assn("NO_ORIGINAL_TRANSACTION_ID type={$notificationType}");
    ok_exit([
        'message' => 'No originalTransactionId found',
        'notificationType' => $notificationType
    ]);
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
    log_assn("DB_CONNECT_FAIL: " . $e->getMessage());
    ok_exit(['message' => 'DB connect failed']);
}

/* CALCULATE LKR */
$amountLkr = convertToLkr($pdo, $price, $currency, $TBL_RATES);

try {
    $pdo->beginTransaction();

    /* EVENT HISTORY INSERT */
    $eventSql = "
        INSERT INTO {$TBL_EVENTS}
        (
            notification_uuid,
            app_apple_id,
            product_id,
            subscription_group_id,
            original_transaction_id,
            transaction_id,
            notification_type,
            subtype,
            duration,
            status,
            active_count,
            expires_at,
            auto_renew_status,
            price,
            currency,
            amount_lkr,
            environment,
            raw_payload
        )
        VALUES
        (
            :notification_uuid,
            :app_apple_id,
            :product_id,
            :subscription_group_id,
            :original_transaction_id,
            :transaction_id,
            :notification_type,
            :subtype,
            :duration,
            :status,
            :active_count,
            :expires_at,
            :auto_renew_status,
            :price,
            :currency,
            :amount_lkr,
            :environment,
            :raw_payload
        )
        ON DUPLICATE KEY UPDATE
            app_apple_id = VALUES(app_apple_id),
            product_id = VALUES(product_id),
            subscription_group_id = VALUES(subscription_group_id),
            original_transaction_id = VALUES(original_transaction_id),
            transaction_id = VALUES(transaction_id),
            notification_type = VALUES(notification_type),
            subtype = VALUES(subtype),
            duration = VALUES(duration),
            status = VALUES(status),
            active_count = VALUES(active_count),
            expires_at = VALUES(expires_at),
            auto_renew_status = VALUES(auto_renew_status),
            raw_payload = VALUES(raw_payload),
            price = VALUES(price),
            currency = VALUES(currency),
            amount_lkr = VALUES(amount_lkr),
            environment = VALUES(environment)
    ";

    $eventStmt = $pdo->prepare($eventSql);
    $eventStmt->execute([
        ':notification_uuid' => $notificationUuid,
        ':app_apple_id' => $appAppleId,
        ':product_id' => $productId,
        ':subscription_group_id' => $subscriptionGroupId,
        ':original_transaction_id' => $originalTransactionId,
        ':transaction_id' => $transactionId,
        ':notification_type' => $notificationType,
        ':subtype' => $subtype,
        ':duration' => $duration,
        ':status' => $status,
        ':active_count' => $activeCount,
        ':expires_at' => $expiresAt,
        ':auto_renew_status' => $autoRenewStatus,
        ':price' => $price,
        ':currency' => $currency,
        ':amount_lkr' => $amountLkr,
        ':environment' => ($environment === 'Sandbox') ? 'Sandbox' : 'Production',
        ':raw_payload' => $rawPayloadJson
    ]);

    /* CURRENT STATE UPSERT */
    $stateSql = "
        INSERT INTO {$TBL_STATES}
        (
            data_type,
            source,
            report_date,
            app_apple_id,
            app_name,
            product_id,
            subscription_name,
            subscription_group_id,
            original_transaction_id,
            latest_transaction_id,
            duration,
            status,
            active_count,
            expires_at,
            auto_renew_status,
            environment,
            last_notification_type,
            last_subtype,
            raw_payload
        )
        VALUES
        (
            'USER',
            'ASSN',
            NULL,
            :app_apple_id,
            NULL,
            :product_id,
            :subscription_name,
            :subscription_group_id,
            :original_transaction_id,
            :latest_transaction_id,
            :duration,
            :status,
            :active_count,
            :expires_at,
            :auto_renew_status,
            :environment,
            :last_notification_type,
            :last_subtype,
            :raw_payload
        )
        ON DUPLICATE KEY UPDATE
            app_apple_id = VALUES(app_apple_id),
            product_id = VALUES(product_id),
            subscription_name = VALUES(subscription_name),
            subscription_group_id = VALUES(subscription_group_id),
            latest_transaction_id = VALUES(latest_transaction_id),
            duration = VALUES(duration),
            status = VALUES(status),
            active_count = VALUES(active_count),
            expires_at = VALUES(expires_at),
            auto_renew_status = VALUES(auto_renew_status),
            environment = VALUES(environment),
            last_notification_type = VALUES(last_notification_type),
            last_subtype = VALUES(last_subtype),
            raw_payload = VALUES(raw_payload),
            updated_at = CURRENT_TIMESTAMP
    ";

    $stateStmt = $pdo->prepare($stateSql);
    $stateStmt->execute([
        ':app_apple_id' => $appAppleId,
        ':product_id' => $productId,
        ':subscription_name' => $productId,
        ':subscription_group_id' => $subscriptionGroupId,
        ':original_transaction_id' => $originalTransactionId,
        ':latest_transaction_id' => $transactionId,
        ':duration' => $duration,
        ':status' => $status,
        ':active_count' => $activeCount,
        ':expires_at' => $expiresAt,
        ':auto_renew_status' => $autoRenewStatus,
        ':environment' => ($environment === 'Sandbox') ? 'Sandbox' : 'Production',
        ':last_notification_type' => $notificationType,
        ':last_subtype' => $subtype,
        ':raw_payload' => $rawPayloadJson
    ]);

    $pdo->commit();

    log_assn("ASSN_SAVE_OK originalTransactionId={$originalTransactionId} transactionId={$transactionId} type={$notificationType} status={$status} duration={$duration} price={$price} currency={$currency} amount_lkr={$amountLkr}");

    ok_exit([
        'message' => 'ASSN saved',
        'notification_uuid' => $notificationUuid,
        'notificationType' => $notificationType,
        'subtype' => $subtype,
        'originalTransactionId' => $originalTransactionId,
        'transactionId' => $transactionId,
        'productId' => $productId,
        'duration' => $duration,
        'status' => $status,
        'active_count' => $activeCount,
        'price' => $price,
        'currency' => $currency,
        'amount_lkr' => $amountLkr
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    log_assn("ASSN_SAVE_FAIL: " . $e->getMessage());

    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

/* HELPERS */

function convertToLkr(PDO $pdo, ?float $price, ?string $currency, string $table): ?float
{
    if ($price === null || $currency === null || trim($currency) === '') {
        return null;
    }

    $currency = strtoupper(trim($currency));

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

    $fromRate = null;
    $lkrRate = null;

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (strtoupper($row['currency_code']) === $currency) {
            $fromRate = (float) $row['rate'];
        }

        if (strtoupper($row['currency_code']) === 'LKR') {
            $lkrRate = (float) $row['rate'];
        }
    }

    if (!$fromRate || !$lkrRate) {
        return null;
    }

    return round(($price / $fromRate) * $lkrRate, 2);
}

function decodeAppleJwsPayload(string $jws): array
{
    $parts = explode('.', $jws);

    if (count($parts) !== 3) {
        return [];
    }

    $payload = base64UrlDecode($parts[1]);
    $decoded = json_decode($payload, true);

    return is_array($decoded) ? $decoded : [];
}

function base64UrlDecode(string $data): string
{
    $remainder = strlen($data) % 4;

    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }

    return base64_decode(strtr($data, '-_', '+/')) ?: '';
}

function detectDuration(?string $productId): string
{
    $p = strtolower((string) $productId);

    if (
        str_contains($p, 'gift') ||
        str_contains($p, 'offer') ||
        str_contains($p, 'promo')
    ) {
        return 'offer';
    }

    if (
        str_contains($p, 'lifetime') ||
        str_contains($p, 'life_time') ||
        str_contains($p, 'premium_lifetime')
    ) {
        return 'lifetime';
    }

    if (
        str_contains($p, 'year') ||
        str_contains($p, 'yearly') ||
        str_contains($p, 'annual')
    ) {
        return 'yearly';
    }

    if (
        str_contains($p, 'month') ||
        str_contains($p, 'monthly')
    ) {
        return 'monthly';
    }

    return 'unknown';
}

function mapAppleStatus(string $notificationType, ?string $subtype, array $txDecoded): string
{
    $type = strtoupper(trim($notificationType));
    $sub = strtoupper((string) $subtype);

    if ($type === 'SUBSCRIBED') {
        if (!empty($txDecoded['offerType'])) {
            return 'trial';
        }
        return 'active';
    }

    if (in_array($type, ['ONE_TIME_CHARGE', 'LIFETIME', 'OFFER'], true)) {
        return 'active';
    }

    if (in_array($type, ['DID_RENEW', 'DID_RECOVER'], true)) {
        return 'active';
    }

    if ($type === 'DID_CHANGE_RENEWAL_STATUS') {
        return 'active';
    }

    if ($type === 'DID_FAIL_TO_RENEW') {
        return $sub === 'GRACE_PERIOD' ? 'grace_period' : 'billing_retry';
    }

    if ($type === 'GRACE_PERIOD_EXPIRED') {
        return 'expired';
    }

    if ($type === 'EXPIRED') {
        return 'expired';
    }

    if ($type === 'REFUND') {
        return 'refunded';
    }

    if (in_array($type, ['REVOKE', 'DID_REVOKE'], true)) {
        return 'revoked';
    }

    return 'unknown';
}
