<?php

if ($tag === "GET_APP_INSTALL") {
    handle_home_app_install($main_mysqli);
}

if ($tag === "GET_APP_ACTIVE_USERS") {
    handle_home_app_active_users($main_mysqli);
}

if ($tag === "GET_HOME_PURCHASE_STATS") {
    handle_home_purchase_stats($main_mysqli);
}

if ($tag === "GET_HOME_ADMOB_STATS") {
    handle_home_admob_stats($main_mysqli);
}

if ($tag === "GET_HOME_GOOGLE_ADS_STATS") {
    handle_home_google_ads_stats($main_mysqli);
}

if ($tag === "GET_HOME_MONTHLY_REVENUE_STATS") {
    handle_home_monthly_revenue_stats($main_mysqli);
}

if ($tag === "GET_HOME_ACTIVE_FUNNEL") {
    handle_home_active_funnel($main_mysqli);
}

if ($tag === "GET_HOME_REFERRAL_SOURCE_STATS") {
    handle_home_referral_source_stats($main_mysqli);
}

if ($tag === "GET_IOS_SUBSCRIPTION_STATS") {
    home_json_response([
        "success" => true,
        "ios_subscription_stats" => GetIosSubscriptionStats($mysqli)
    ]);
}

function handle_home_active_funnel($main_mysqli): void
{
    home_require_main_db_request();

    home_json_response([
        "success" => true,
        "active_funnel" => GetHomeActiveFunnel($main_mysqli)
    ]);
}

function handle_home_purchase_stats($main_mysqli): void
{
    home_require_main_db_request();

    [$from_date, $to_date] = home_get_date_range();

    home_json_response([
        "success" => true,
        "purchases" => GetHomePurchaseStats($main_mysqli, $from_date, $to_date)
    ]);
}

function handle_home_admob_stats($main_mysqli): void
{
    home_require_main_db_request();

    [$from_date, $to_date] = home_get_date_range();

    home_json_response([
        "success" => true,
        "admob" => GetHomeAdmobStats($main_mysqli, $from_date, $to_date)
    ]);
}

function handle_home_google_ads_stats($main_mysqli): void
{
    home_require_main_db_request();

    [$from_date, $to_date] = home_get_date_range();

    home_json_response([
        "success" => true,
        "google_ads" => GetHomeGoogleAdsStats($main_mysqli, $from_date, $to_date)
    ]);
}

function handle_home_monthly_revenue_stats($main_mysqli): void
{
    home_require_main_db_request();

    $months = (int)($_POST['months'] ?? 6);
    if (!in_array($months, [3, 6, 12], true)) {
        $months = 6;
    }

    home_json_response([
        "success" => true,
        "revenue" => GetHomeMonthlyRevenueStats($main_mysqli, $months)
    ]);
}

function handle_home_app_install($main_mysqli): void
{
    home_require_main_db_request();

    $db_array = home_get_db_array();
    [$from_date, $to_date] = home_get_date_range();
    $apps = is_array($_POST['apps'] ?? null) ? $_POST['apps'] : [];

    home_json_response([
        "success" => true,
        "users" => GetAppInstallFromDbArray($main_mysqli, $db_array, $from_date, $to_date, $apps)
    ]);
}

function handle_home_app_active_users($main_mysqli): void
{
    home_require_main_db_request();

    $db_array = home_get_db_array();
    [$from_date, $to_date] = home_get_date_range();
    $apps = is_array($_POST['apps'] ?? null) ? $_POST['apps'] : [];

    home_json_response([
        "success" => true,
        "users" => GetAppActiveUsersFromDbArray($main_mysqli, $db_array, $from_date, $to_date, $apps)
    ]);
}

function handle_home_referral_source_stats($main_mysqli): void
{
    home_require_main_db_request();

    $db_array = home_get_db_array();
    [$from_date, $to_date] = home_get_date_range();
    $apps = is_array($_POST['apps'] ?? null) ? $_POST['apps'] : [];

    home_json_response([
        "success" => true,
        "referral_source" => GetHomeReferralSourceStats($main_mysqli, $db_array, $from_date, $to_date, $apps)
    ]);
}

function home_require_main_db_request(): void
{
    $db = strtoupper(trim((string)($_POST['db'] ?? '')));
    if ($db === '0' || $db === 'MAIN') {
        return;
    }

    home_json_response([
        "success" => false,
        "error_msg" => "Home aggregate requests must use db=0 or db=MAIN."
    ], 400);
}

function home_get_db_array(): array
{
    $db_array = json_decode((string)($_POST['db_array'] ?? '[]'), true);
    if (!is_array($db_array) || empty($db_array)) {
        home_json_response([
            "success" => false,
            "error_msg" => "Invalid db_array parameter"
        ], 400);
    }

    return array_values(array_filter(array_map('strval', $db_array)));
}

function home_get_date_range(): array
{
    $from_date = trim((string)($_POST['from_date'] ?? ''));
    $to_date = trim((string)($_POST['to_date'] ?? ''));

    if ($from_date === '' || $to_date === '') {
        home_json_response([
            "success" => false,
            "error_msg" => "from_date and to_date parameters are required"
        ], 400);
    }

    return [$from_date, $to_date];
}

function home_json_response(array $payload, int $status_code = 200): void
{
    if (function_exists('send_json')) {
        send_json($payload, $status_code);
    }

    if (!headers_sent()) {
        http_response_code($status_code);
        header('Content-Type: application/json');
    }

    echo json_encode($payload);
    exit();
}

function home_empty_purchase_stats(): array
{
    return [
        'totalPurchases' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'refundEvents' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'freeTrials' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'yearlySubscribers' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'monthlySubscribers' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'lifetimePurchases' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'offerPurchases' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'appRevenue' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'appRevenueLkr' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'grossAppRevenue' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'grossAppRevenueLkr' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'refundRevenue' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'refundRevenueLkr' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'appBreakdown' => [
            'monthly' => [],
            'yearly' => [],
            'lifetime' => [],
            'offer' => [],
        ],
    ];
}

function home_empty_active_funnel(): array
{
    return [
        'monthly' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'yearly' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'trials' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'lifetime' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'lifetimeOffer' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'debug' => [
            'androidBaselineDate' => '2026-05-31',
            'androidDeltaStartDate' => '2026-06-01',
            'iosBaselineDate' => '2026-05-31',
            'iosDeltaStartDate' => '2026-06-01',
            'iosSource' => 'fnd_ios_subscription_baseline_tab + ios_subscription_events',
        ],
    ];
}

function home_empty_admob_stats(): array
{
    return [
        'revenue' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'impressions' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'clicks' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'ctr' => 0,
        'ctrByPlatform' => ['android' => 0, 'apple' => 0],
    ];
}

function GetHomeAdmobStats(mysqli $mysqli, string $fromDate, string $toDate): array
{
    $stats = home_empty_admob_stats();
    $stats['debug'] = [
        'fromDate' => $fromDate,
        'toDate' => $toDate,
        'rows' => [],
    ];

    $sql = "
        SELECT
            CASE
                WHEN LOWER(platform) IN ('ios', 'apple') THEN 'apple'
                WHEN LOWER(platform) = 'android' THEN 'android'
                ELSE 'android'
            END AS platform_key,
            COALESCE(SUM(impressions), 0) AS impressions,
            COALESCE(SUM(clicks), 0) AS clicks,
            COALESCE(SUM(estimated_earnings_usd), 0) AS revenue
        FROM fnd_admob_daily_report_tab
        WHERE report_date BETWEEN ? AND ?
          AND valid = 1
        GROUP BY
            CASE
                WHEN LOWER(platform) IN ('ios', 'apple') THEN 'apple'
                WHEN LOWER(platform) = 'android' THEN 'android'
                ELSE 'android'
            END
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare AdMob stats query');
    }

    $stmt->bind_param('ss', $fromDate, $toDate);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to load AdMob stats');
    }

    $rows = get_result($stmt);
    $stmt->close();

    foreach ($rows as $row) {
        $platform = (string)($row['platform_key'] ?? 'unknown');
        if ($platform !== 'android' && $platform !== 'apple') {
            continue;
        }

        $impressions = (int)($row['impressions'] ?? 0);
        $clicks = (int)($row['clicks'] ?? 0);
        $revenue = (float)($row['revenue'] ?? 0);

        $stats['impressions'][$platform] = $impressions;
        $stats['clicks'][$platform] = $clicks;
        $stats['revenue'][$platform] = round($revenue, 2);
        $stats['ctrByPlatform'][$platform] = $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0;
        $stats['debug']['rows'][] = [
            'platform' => $platform,
            'impressions' => $impressions,
            'clicks' => $clicks,
            'revenue' => round($revenue, 2),
        ];
    }

    foreach (['revenue', 'impressions', 'clicks'] as $key) {
        $stats[$key]['total'] = $stats[$key]['android'] + $stats[$key]['apple'];
    }

    $stats['ctr'] = $stats['impressions']['total'] > 0
        ? round(($stats['clicks']['total'] / $stats['impressions']['total']) * 100, 2)
        : 0;

    return $stats;
}

function GetHomeGoogleAdsStats(mysqli $mysqli, string $fromDate, string $toDate): array
{
    $stats = [
        'expenses' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'impressions' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'clicks' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'debug' => [
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'source' => 'fnd_google_ads_daily_report_tab',
            'rows' => [],
        ],
    ];

    $hasPlatformColumn = false;
    $columnResult = $mysqli->query("SHOW COLUMNS FROM fnd_google_ads_daily_report_tab LIKE 'platform'");
    if ($columnResult) {
        $hasPlatformColumn = $columnResult->num_rows > 0;
        $columnResult->free();
    }

    $platformExpression = $hasPlatformColumn
        ? "CASE
                WHEN LOWER(platform) IN ('ios', 'apple') THEN 'apple'
                WHEN LOWER(platform) = 'android' THEN 'android'
                WHEN LOWER(campaign_name) LIKE '%ios%'
                  OR LOWER(campaign_name) LIKE '%apple%'
                  OR LOWER(campaign_name) LIKE '%iphone%'
                  OR LOWER(campaign_name) LIKE '%ipad%' THEN 'apple'
                ELSE 'android'
           END"
        : "CASE
                WHEN LOWER(campaign_name) LIKE '%ios%'
                  OR LOWER(campaign_name) LIKE '%apple%'
                  OR LOWER(campaign_name) LIKE '%iphone%'
                  OR LOWER(campaign_name) LIKE '%ipad%' THEN 'apple'
                ELSE 'android'
           END";

    $sql = "
        SELECT
            {$platformExpression} AS platform_key,
            COALESCE(SUM(impressions), 0) AS impressions,
            COALESCE(SUM(clicks), 0) AS clicks,
            COALESCE(SUM(cost_usd), 0) AS cost_usd
        FROM fnd_google_ads_daily_report_tab
        WHERE report_date BETWEEN ? AND ?
        GROUP BY {$platformExpression}
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare Google Ads stats query');
    }

    $stmt->bind_param('ss', $fromDate, $toDate);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to load Google Ads stats');
    }

    $rows = get_result($stmt);
    $stmt->close();

    foreach ($rows as $row) {
        $platform = (string)($row['platform_key'] ?? 'android');
        if ($platform !== 'android' && $platform !== 'apple') {
            $platform = 'android';
        }

        $impressions = (int)($row['impressions'] ?? 0);
        $clicks = (int)($row['clicks'] ?? 0);
        $cost = round((float)($row['cost_usd'] ?? 0), 2);

        $stats['impressions'][$platform] = $impressions;
        $stats['clicks'][$platform] = $clicks;
        $stats['expenses'][$platform] = $cost;
        $stats['debug']['rows'][] = [
            'platform' => $platform,
            'impressions' => $impressions,
            'clicks' => $clicks,
            'cost_usd' => $cost,
        ];
    }

    foreach (['expenses', 'impressions', 'clicks'] as $key) {
        $stats[$key]['total'] = $stats[$key]['android'] + $stats[$key]['apple'];
    }

    return $stats;
}

function GetHomeMonthlyRevenueStats(mysqli $main_mysqli, int $months): array
{
    $tz = new DateTimeZone('Asia/Colombo');
    $current = new DateTime('first day of this month', $tz);
    $start = (clone $current)->modify('-' . ($months - 1) . ' months');
    $rows = [];

    for ($cursor = clone $start; $cursor <= $current; $cursor->modify('+1 month')) {
        $month = $cursor->format('Y-m');
        $from = $cursor->format('Y-m-01');
        $to = (clone $cursor)->modify('last day of this month')->format('Y-m-d');

        $androidReport = home_get_month_report_sum(
            $main_mysqli,
            'fnd_google_play_sales_daily_reports',
            'total_proceeds',
            $month
        );
        $iosReport = home_get_month_report_sum(
            $main_mysqli,
            'fnd_apple_sales_daily_reports',
            'total_proceeds_usd',
            $month
        );
        $admobReport = home_get_month_dated_report_sum(
            $main_mysqli,
            'fnd_admob_daily_report_tab',
            'estimated_earnings_usd',
            $from,
            $to,
            'valid = 1'
        );

        $androidRevenue = $androidReport['has_rows'] ? $androidReport['total'] : 0;
        $iosRevenue = $iosReport['has_rows'] ? $iosReport['total'] : 0;
        $androidSource = $androidReport['has_rows'] ? 'report' : 'events';
        $iosSource = $iosReport['has_rows'] ? 'report' : 'events';

        if (!$androidReport['has_rows'] || !$iosReport['has_rows']) {
            $fallbackPurchases = GetHomePurchaseStats($main_mysqli, $from, $to);
            if (!$androidReport['has_rows']) {
                $androidRevenue = (float)($fallbackPurchases['appRevenue']['android'] ?? 0);
            }
            if (!$iosReport['has_rows']) {
                $iosRevenue = (float)($fallbackPurchases['appRevenue']['apple'] ?? 0);
            }
        }

        $admobRevenue = $admobReport['has_rows'] ? $admobReport['total'] : 0;
        $admobSource = $admobReport['has_rows'] ? 'report' : 'none';
        $total = $androidRevenue + $iosRevenue + $admobRevenue;

        $rows[] = [
            'month' => $month,
            'label' => $cursor->format('M'),
            'androidRevenue' => round($androidRevenue, 2),
            'iosRevenue' => round($iosRevenue, 2),
            'admobRevenue' => round($admobRevenue, 2),
            'total' => round($total, 2),
            'sources' => [
                'android' => $androidSource,
                'ios' => $iosSource,
                'admob' => $admobSource,
            ],
            'reportRows' => [
                'android' => $androidReport['row_count'],
                'ios' => $iosReport['row_count'],
                'admob' => $admobReport['row_count'],
            ],
        ];
    }

    return [
        'months' => $months,
        'rows' => $rows,
    ];
}

function home_get_month_report_sum(mysqli $mysqli, string $table, string $amountColumn, string $month): array
{
    $allowedTables = [
        'fnd_google_play_sales_daily_reports',
        'fnd_apple_sales_daily_reports',
    ];
    $allowedColumns = [
        'total_proceeds',
        'total_proceeds_usd',
    ];
    if (!in_array($table, $allowedTables, true) || !in_array($amountColumn, $allowedColumns, true)) {
        return ['has_rows' => false, 'row_count' => 0, 'total' => 0.0];
    }

    $sql = "
        SELECT COUNT(*) AS row_count, COALESCE(SUM({$amountColumn}), 0) AS total
        FROM {$table}
        WHERE report_month = ?
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return ['has_rows' => false, 'row_count' => 0, 'total' => 0.0, 'error' => $mysqli->error];
    }

    $stmt->bind_param('s', $month);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['has_rows' => false, 'row_count' => 0, 'total' => 0.0, 'error' => $error];
    }

    $rows = get_result($stmt);
    $stmt->close();
    $row = $rows[0] ?? [];
    $rowCount = (int)($row['row_count'] ?? 0);

    return [
        'has_rows' => $rowCount > 0,
        'row_count' => $rowCount,
        'total' => (float)($row['total'] ?? 0),
    ];
}

function home_get_month_dated_report_sum(mysqli $mysqli, string $table, string $amountColumn, string $fromDate, string $toDate, string $extraWhere = ''): array
{
    if ($table !== 'fnd_admob_daily_report_tab' || $amountColumn !== 'estimated_earnings_usd') {
        return ['has_rows' => false, 'row_count' => 0, 'total' => 0.0];
    }

    $where = "report_date BETWEEN ? AND ?";
    if ($extraWhere !== '') {
        $where .= " AND {$extraWhere}";
    }

    $sql = "
        SELECT COUNT(*) AS row_count, COALESCE(SUM({$amountColumn}), 0) AS total
        FROM {$table}
        WHERE {$where}
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return ['has_rows' => false, 'row_count' => 0, 'total' => 0.0, 'error' => $mysqli->error];
    }

    $stmt->bind_param('ss', $fromDate, $toDate);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['has_rows' => false, 'row_count' => 0, 'total' => 0.0, 'error' => $error];
    }

    $rows = get_result($stmt);
    $stmt->close();
    $row = $rows[0] ?? [];
    $rowCount = (int)($row['row_count'] ?? 0);

    return [
        'has_rows' => $rowCount > 0,
        'row_count' => $rowCount,
        'total' => (float)($row['total'] ?? 0),
    ];
}

function GetHomeActiveFunnel($main_mysqli): array
{
    $funnel = home_empty_active_funnel();

    try {
        $android = GetHomeAndroidActiveFunnelFromReports($main_mysqli);
        $funnel['monthly']['android'] = $android['monthly'];
        $funnel['yearly']['android'] = $android['yearly'];
        $funnel['trials']['android'] = $android['trials'] ?? 0;
        $funnel['lifetime']['android'] = $android['lifetime'];
        $funnel['lifetimeOffer']['android'] = $android['lifetimeOffer'];
        $funnel['debug']['android'] = $android['debug'];
    } catch (Throwable $error) {
        $funnel['debug']['android_error'] = $error->getMessage();
    }

    try {
        $ios = GetHomeIosActiveFunnelFromReports($main_mysqli);
        $funnel['monthly']['apple'] = $ios['monthly'];
        $funnel['yearly']['apple'] = $ios['yearly'];
        $funnel['trials']['apple'] = $ios['trials'] ?? 0;
        $funnel['lifetime']['apple'] = $ios['lifetime'];
        $funnel['lifetimeOffer']['apple'] = $ios['lifetimeOffer'];
        $funnel['debug']['ios'] = $ios['debug'];
    } catch (Throwable $error) {
        $funnel['debug']['ios_error'] = $error->getMessage();
    }

    foreach (['monthly', 'yearly', 'trials', 'lifetime', 'lifetimeOffer'] as $key) {
        $funnel[$key]['total'] = $funnel[$key]['android'] + $funnel[$key]['apple'];
    }

    return $funnel;
}

function GetHomeAndroidActiveFunnelFromReports(mysqli $mysqli): array
{
    $summary = home_empty_report_active_funnel('fnd_google_play_subscription_daily_reports');
    $latestDate = home_get_latest_report_date($mysqli, 'fnd_google_play_subscription_daily_reports');

    if ($latestDate === null) {
        $summary['debug']['available'] = false;
        return $summary;
    }

    $stmt = $mysqli->prepare(
        'SELECT report_month, report_date, total_active_subscriptions, products_json
         FROM fnd_google_play_subscription_daily_reports
         WHERE report_date = ?'
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare Android subscription report query');
    }

    $stmt->bind_param('s', $latestDate);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to load Android subscription report');
    }

    $rows = get_result($stmt);
    $stmt->close();
    $summary['debug']['available'] = true;
    $summary['debug']['latestReportDate'] = $latestDate;
    $summary['debug']['rowCount'] = count($rows);

    foreach ($rows as $row) {
        $items = json_decode((string)($row['products_json'] ?? '[]'), true);
        if (!is_array($items)) {
            continue;
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $active = home_report_item_number($item, [
                'activeSubscriptions',
                'active_subscriptions',
                'activeSubs',
                'active_subs',
                'totalActiveSubscriptions',
                'total_active_subscriptions',
            ]);
            if ($active <= 0) {
                continue;
            }

            $label = home_report_item_text($item, [
                'productId',
                'product_id',
                'sku',
                'basePlanId',
                'base_plan_id',
                'subscriptionName',
                'subscription_name',
            ]);
            $bucket = home_subscription_report_bucket($label);
            $summary[$bucket] += $active;
        }
    }

    $summary['monthly'] = (int)round($summary['monthly']);
    $summary['yearly'] = (int)round($summary['yearly']);
    $summary['trials'] = (int)round($summary['trials']);

    return $summary;
}

function GetHomeIosActiveFunnelFromReports(mysqli $mysqli): array
{
    $summary = home_empty_report_active_funnel('fnd_apple_subscription_daily_reports');
    $latestDate = home_get_latest_report_date($mysqli, 'fnd_apple_subscription_daily_reports');

    if ($latestDate === null) {
        $summary['debug']['available'] = false;
        return $summary;
    }

    $stmt = $mysqli->prepare(
        'SELECT report_month, report_date, total_active_subs, items_json
         FROM fnd_apple_subscription_daily_reports
         WHERE report_date = ?'
    );
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare Apple subscription report query');
    }

    $stmt->bind_param('s', $latestDate);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to load Apple subscription report');
    }

    $rows = get_result($stmt);
    $stmt->close();
    $summary['debug']['available'] = true;
    $summary['debug']['latestReportDate'] = $latestDate;
    $summary['debug']['rowCount'] = count($rows);

    foreach ($rows as $row) {
        $items = json_decode((string)($row['items_json'] ?? '[]'), true);
        if (!is_array($items)) {
            continue;
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $trialActive = home_report_item_number($item, [
                'activeFreeTrialIntroductoryOfferSubscriptions',
                'active_free_trial_introductory_offer_subscriptions',
                'freeTrialPromotionalOfferSubscriptions',
                'free_trial_promotional_offer_subscriptions',
                'freeTrialOfferCodeSubscriptions',
                'free_trial_offer_code_subscriptions',
                'freeTrialWinBackOffers',
                'free_trial_win_back_offers',
            ]);
            if ($trialActive > 0) {
                $summary['trials'] += $trialActive;
            }

            $active = home_report_item_number($item, [
                'activeStandardPriceSubscriptions',
                'active_standard_price_subscriptions',
                'activeStandardPrice',
                'active_standard_price',
                'activeSubscriptions',
                'active_subscriptions',
                'activeSubs',
                'active_subs',
                'totalActiveSubs',
                'total_active_subs',
            ]);
            if ($active <= 0) {
                continue;
            }

            $label = home_report_item_text($item, [
                'standardSubscriptionDuration',
                'standard_subscription_duration',
                'subscriptionName',
                'subscription_name',
                'sku',
                'productId',
                'product_id',
                'basePlanId',
                'base_plan_id',
                'title',
            ]);
            $bucket = home_subscription_report_bucket($label);
            $summary[$bucket] += $active;
        }
    }

    $summary['monthly'] = (int)round($summary['monthly']);
    $summary['yearly'] = (int)round($summary['yearly']);
    $summary['trials'] = (int)round($summary['trials']);

    return $summary;
}

function home_empty_report_active_funnel(string $source): array
{
    return [
        'monthly' => 0,
        'yearly' => 0,
        'trials' => 0,
        'lifetime' => 0,
        'lifetimeOffer' => 0,
        'debug' => [
            'source' => $source,
            'available' => false,
            'latestReportDate' => null,
            'rowCount' => 0,
        ],
    ];
}

function home_get_latest_report_date(mysqli $mysqli, string $table): ?string
{
    $allowedTables = [
        'fnd_google_play_subscription_daily_reports',
        'fnd_apple_subscription_daily_reports',
    ];
    if (!in_array($table, $allowedTables, true)) {
        return null;
    }

    $sql = "SELECT MAX(report_date) AS latest_report_date FROM {$table}";
    $stmt = $mysqli->prepare($sql);
    if (!$stmt || !$stmt->execute()) {
        if ($stmt) {
            $stmt->close();
        }
        return null;
    }

    $rows = get_result($stmt);
    $stmt->close();
    $date = $rows[0]['latest_report_date'] ?? null;

    return $date ? (string)$date : null;
}

function home_report_item_number(array $item, array $keys): float
{
    foreach ($keys as $key) {
        if (!array_key_exists($key, $item)) {
            continue;
        }

        $value = $item[$key];
        if (is_numeric($value)) {
            return (float)$value;
        }

        if (is_string($value)) {
            $normalized = preg_replace('/[^0-9.\-]/', '', $value);
            if ($normalized !== '' && is_numeric($normalized)) {
                return (float)$normalized;
            }
        }
    }

    return 0.0;
}

function home_report_item_text(array $item, array $keys): string
{
    $parts = [];
    foreach ($keys as $key) {
        if (isset($item[$key]) && is_scalar($item[$key])) {
            $parts[] = (string)$item[$key];
        }
    }

    return strtolower(trim(implode(' ', $parts)));
}

function home_subscription_report_bucket(string $label): string
{
    if (
        str_contains($label, 'yearly')
        || str_contains($label, 'annual')
        || str_contains($label, '_year')
        || str_contains($label, '-year')
        || str_contains($label, ' year')
    ) {
        return 'yearly';
    }

    if (str_contains($label, 'trial')) {
        return 'trials';
    }

    return 'monthly';
}

function GetHomeAndroidActiveFunnel(mysqli $main_mysqli): array
{
    $baseline = [
        'monthly' => 0,
        'yearly' => 0,
        'trials' => 0,
        'lifetime' => 0,
        'lifetimeOffer' => 0,
    ];

    $stmt = $main_mysqli->prepare(
        "SELECT
            COALESCE(SUM(monthly_active), 0) AS monthly_active,
            COALESCE(SUM(yearly_active), 0) AS yearly_active,
            COALESCE(SUM(lifetime_active), 0) AS lifetime_active,
            COALESCE(SUM(lifetime_offer_active), 0) AS lifetime_offer_active
         FROM fnd_android_subscription_baseline_tab
         WHERE snapshot_date = ? AND valid = 1"
    );

    if (!$stmt) {
        throw new Exception($main_mysqli->error ?: 'Unable to prepare Android baseline query');
    }

    $baselineDate = '2026-05-31';
    $stmt->bind_param('s', $baselineDate);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $main_mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to load Android baseline');
    }

    $rows = get_result($stmt);
    $stmt->close();
    if (!empty($rows)) {
        $baseline['monthly'] = (int)($rows[0]['monthly_active'] ?? 0);
        $baseline['yearly'] = (int)($rows[0]['yearly_active'] ?? 0);
        $baseline['lifetime'] = (int)($rows[0]['lifetime_active'] ?? 0);
        $baseline['lifetimeOffer'] = (int)($rows[0]['lifetime_offer_active'] ?? 0);
    }

    $delta = [
        'monthly' => 0,
        'yearly' => 0,
        'lifetime' => 0,
        'lifetimeOffer' => 0,
    ];

    $androidMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
    try {
        $sql = "
            SELECT
                COALESCE(SUM(CASE WHEN LOWER(sku) LIKE '%monthly%' THEN
                    CASE
                        WHEN UPPER(COALESCE(status, '')) LIKE '%REVOKED%' OR UPPER(COALESCE(status, '')) LIKE '%CANCEL%' OR UPPER(COALESCE(status, '')) LIKE '%EXPIRE%' OR UPPER(COALESCE(status, '')) LIKE '%REFUND%' THEN -1
                        WHEN UPPER(COALESCE(status, '')) LIKE '%PURCHASED%' THEN 1
                        ELSE 0
                    END
                ELSE 0 END), 0) AS monthly_delta,
                COALESCE(SUM(CASE WHEN LOWER(sku) LIKE '%yearly%' OR LOWER(sku) LIKE '%annual%' THEN
                    CASE
                        WHEN UPPER(COALESCE(status, '')) LIKE '%REVOKED%' OR UPPER(COALESCE(status, '')) LIKE '%CANCEL%' OR UPPER(COALESCE(status, '')) LIKE '%EXPIRE%' OR UPPER(COALESCE(status, '')) LIKE '%REFUND%' THEN -1
                        WHEN UPPER(COALESCE(status, '')) LIKE '%PURCHASED%' THEN 1
                        ELSE 0
                    END
                ELSE 0 END), 0) AS yearly_delta,
                COALESCE(SUM(CASE WHEN LOWER(sku) LIKE '%lifetime%' AND LOWER(sku) NOT LIKE '%offer%' AND LOWER(sku) NOT LIKE '%off%' THEN
                    CASE
                        WHEN UPPER(COALESCE(status, '')) LIKE '%REVOKED%' OR UPPER(COALESCE(status, '')) LIKE '%REFUND%' THEN -1
                        WHEN UPPER(COALESCE(status, '')) LIKE '%PURCHASED%' THEN 1
                        ELSE 0
                    END
                ELSE 0 END), 0) AS lifetime_delta,
                COALESCE(SUM(CASE WHEN LOWER(sku) LIKE '%offer%' OR LOWER(sku) LIKE '%off%' THEN
                    CASE
                        WHEN UPPER(COALESCE(status, '')) LIKE '%REVOKED%' OR UPPER(COALESCE(status, '')) LIKE '%REFUND%' THEN -1
                        WHEN UPPER(COALESCE(status, '')) LIKE '%PURCHASED%' THEN 1
                        ELSE 0
                    END
                ELSE 0 END), 0) AS lifetime_offer_delta
            FROM fnd_global_purchase_tab
            WHERE purchased_date >= ?
        ";

        $stmt = $androidMysqli->prepare($sql);
        if (!$stmt) {
            throw new Exception($androidMysqli->error ?: 'Unable to prepare Android delta query');
        }

        $deltaStart = '2026-06-01 00:00:00';
        $stmt->bind_param('s', $deltaStart);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $androidMysqli->error;
            $stmt->close();
            throw new Exception($error ?: 'Unable to load Android deltas');
        }

        $rows = get_result($stmt);
        $stmt->close();
        if (!empty($rows)) {
            $delta['monthly'] = (int)($rows[0]['monthly_delta'] ?? 0);
            $delta['yearly'] = (int)($rows[0]['yearly_delta'] ?? 0);
            $delta['lifetime'] = (int)($rows[0]['lifetime_delta'] ?? 0);
            $delta['lifetimeOffer'] = (int)($rows[0]['lifetime_offer_delta'] ?? 0);
        }
    } finally {
        $androidMysqli->close();
    }

    return [
        'monthly' => max(0, $baseline['monthly'] + $delta['monthly']),
        'yearly' => max(0, $baseline['yearly'] + $delta['yearly']),
        'trials' => 0,
        'lifetime' => max(0, $baseline['lifetime'] + $delta['lifetime']),
        'lifetimeOffer' => max(0, $baseline['lifetimeOffer'] + $delta['lifetimeOffer']),
        'debug' => [
            'baseline' => $baseline,
            'delta' => $delta,
        ],
    ];
}

function GetHomeIosActiveFunnel(mysqli $mysqli): array
{
    $baseline = [
        'monthly' => 0,
        'yearly' => 0,
        'trials' => 0,
        'lifetime' => 0,
        'lifetimeOffer' => 0,
    ];

    $baselineSql = "
        SELECT
            COALESCE(SUM(monthly_active), 0) AS monthly_active,
            COALESCE(SUM(yearly_active), 0) AS yearly_active,
            COALESCE(SUM(lifetime_active), 0) AS lifetime_active,
            COALESCE(SUM(lifetime_offer_active), 0) AS lifetime_offer_active
        FROM fnd_ios_subscription_baseline_tab
        WHERE snapshot_date = ? AND valid = 1
    ";

    $baselineDate = '2026-05-31';
    $stmt = $mysqli->prepare($baselineSql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare iOS baseline query');
    }

    $stmt->bind_param('s', $baselineDate);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to load iOS baseline');
    }

    $rows = get_result($stmt);
    $stmt->close();
    if (!empty($rows)) {
        $baseline['monthly'] = (int)($rows[0]['monthly_active'] ?? 0);
        $baseline['yearly'] = (int)($rows[0]['yearly_active'] ?? 0);
        $baseline['lifetime'] = (int)($rows[0]['lifetime_active'] ?? 0);
        $baseline['lifetimeOffer'] = (int)($rows[0]['lifetime_offer_active'] ?? 0);
    }

    $delta = [
        'monthly_subscribed' => 0,
        'monthly_expired' => 0,
        'yearly_renewed' => 0,
        'yearly_expired' => 0,
        'monthly' => 0,
        'yearly' => 0,
    ];

    $deltaSql = "
        SELECT
            COALESCE(SUM(CASE
                WHEN LOWER(COALESCE(duration, '')) = 'monthly'
                 AND LOWER(COALESCE(status, '')) = 'active'
                 AND UPPER(COALESCE(notification_type, '')) = 'SUBSCRIBED'
                THEN 1 ELSE 0 END), 0) AS monthly_subscribed,
            COALESCE(SUM(CASE
                WHEN LOWER(COALESCE(duration, '')) = 'monthly'
                 AND LOWER(COALESCE(status, '')) = 'expired'
                 AND UPPER(COALESCE(notification_type, '')) = 'EXPIRED'
                THEN 1 ELSE 0 END), 0) AS monthly_expired,
            COALESCE(SUM(CASE
                WHEN LOWER(COALESCE(duration, '')) = 'yearly'
                 AND LOWER(COALESCE(status, '')) = 'active'
                 AND UPPER(COALESCE(notification_type, '')) = 'DID_RENEW'
                 AND COALESCE(active_count, 0) = 1
                 AND LOWER(COALESCE(environment, '')) = 'production'
                THEN 1 ELSE 0 END), 0) AS yearly_renewed,
            COALESCE(SUM(CASE
                WHEN LOWER(COALESCE(duration, '')) = 'yearly'
                 AND LOWER(COALESCE(status, '')) = 'expired'
                 AND UPPER(COALESCE(notification_type, '')) = 'EXPIRED'
                 AND UPPER(COALESCE(subtype, '')) <> 'VOLUNTARY'
                THEN 1 ELSE 0 END), 0) AS yearly_expired
        FROM ios_subscription_events
        WHERE created_at >= ?
    ";

    $deltaStart = '2026-06-01 00:00:00';
    $stmt = $mysqli->prepare($deltaSql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare iOS delta query');
    }

    $stmt->bind_param('s', $deltaStart);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to load iOS deltas');
    }

    $rows = get_result($stmt);
    $stmt->close();
    if (!empty($rows)) {
        $delta['monthly_subscribed'] = (int)($rows[0]['monthly_subscribed'] ?? 0);
        $delta['monthly_expired'] = (int)($rows[0]['monthly_expired'] ?? 0);
        $delta['yearly_renewed'] = (int)($rows[0]['yearly_renewed'] ?? 0);
        $delta['yearly_expired'] = (int)($rows[0]['yearly_expired'] ?? 0);
        $delta['monthly'] = $delta['monthly_subscribed'] - $delta['monthly_expired'];
        $delta['yearly'] = $delta['yearly_renewed'] - $delta['yearly_expired'];
    }

    $state = GetHomeIosCurrentSubscriptionState($mysqli);
    $monthly = $state['available'] ? $state['monthly'] : max(0, $baseline['monthly'] + $delta['monthly']);
    $yearly = $state['available'] ? $state['yearly'] : max(0, $baseline['yearly'] + $delta['yearly']);
    $trials = GetHomeIosActiveTrials($mysqli, $deltaStart);

    return [
        'monthly' => $monthly,
        'yearly' => $yearly,
        'trials' => $trials['active'],
        'lifetime' => max(0, $baseline['lifetime']),
        'lifetimeOffer' => max(0, $baseline['lifetimeOffer']),
        'debug' => [
            'source' => $state['available']
                ? 'ios_subscription_states latest SUMMARY REPORT'
                : 'fnd_ios_subscription_baseline_tab + ios_subscription_events',
            'baselineDate' => $baselineDate,
            'deltaStart' => $deltaStart,
            'paidState' => $state,
            'baseline' => $baseline,
            'delta' => $delta,
            'trials' => $trials,
        ],
    ];
}

function GetHomeIosCurrentSubscriptionState(mysqli $mysqli): array
{
    $empty = [
        'available' => false,
        'latest_report_date' => null,
        'monthly' => 0,
        'yearly' => 0,
        'paid_total' => 0,
    ];

    $dateSql = "
        SELECT MAX(report_date) AS latest_report_date
        FROM ios_subscription_states
        WHERE data_type = 'SUMMARY'
          AND source = 'REPORT'
    ";

    $stmt = $mysqli->prepare($dateSql);
    if (!$stmt) {
        return $empty;
    }

    if (!$stmt->execute()) {
        $stmt->close();
        return $empty;
    }

    $dateRows = get_result($stmt);
    $stmt->close();

    $latestReportDate = $dateRows[0]['latest_report_date'] ?? null;
    if (!$latestReportDate) {
        return $empty;
    }

    $stateSql = "
        SELECT
            COALESCE(SUM(CASE
                WHEN LOWER(COALESCE(duration, '')) = 'monthly'
                 AND LOWER(COALESCE(status, '')) = 'active'
                THEN active_count ELSE 0 END), 0) AS monthly_subscribers,
            COALESCE(SUM(CASE
                WHEN LOWER(COALESCE(duration, '')) = 'yearly'
                 AND LOWER(COALESCE(status, '')) = 'active'
                THEN active_count ELSE 0 END), 0) AS yearly_subscribers
        FROM ios_subscription_states
        WHERE data_type = 'SUMMARY'
          AND source = 'REPORT'
          AND report_date = ?
    ";

    $stmt = $mysqli->prepare($stateSql);
    if (!$stmt) {
        return $empty;
    }

    $stmt->bind_param('s', $latestReportDate);
    if (!$stmt->execute()) {
        $stmt->close();
        return $empty;
    }

    $rows = get_result($stmt);
    $stmt->close();
    if (empty($rows)) {
        return $empty;
    }

    $monthly = (int)($rows[0]['monthly_subscribers'] ?? 0);
    $yearly = (int)($rows[0]['yearly_subscribers'] ?? 0);

    return [
        'available' => true,
        'latest_report_date' => $latestReportDate,
        'monthly' => $monthly,
        'yearly' => $yearly,
        'paid_total' => $monthly + $yearly,
    ];
}

function GetHomeIosActiveTrials(mysqli $mysqli, string $fromDateTime): array
{
    $sql = "
        SELECT
            COUNT(DISTINCT active_events.original_transaction_id) AS active_trials
        FROM ios_subscription_events active_events
        WHERE active_events.created_at >= ?
          AND LOWER(COALESCE(active_events.environment, '')) = 'production'
          AND active_events.original_transaction_id IS NOT NULL
          AND active_events.original_transaction_id <> ''
          AND (
                LOWER(COALESCE(active_events.duration, '')) = 'trial'
             OR LOWER(COALESCE(active_events.status, '')) = 'trial'
             OR UPPER(COALESCE(active_events.subtype, '')) LIKE '%TRIAL%'
          )
          AND NOT EXISTS (
              SELECT 1
              FROM ios_subscription_events expired_events
              WHERE expired_events.original_transaction_id = active_events.original_transaction_id
                AND expired_events.created_at >= active_events.created_at
                AND UPPER(COALESCE(expired_events.notification_type, '')) = 'EXPIRED'
                AND LOWER(COALESCE(expired_events.status, '')) = 'expired'
          )
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare iOS active trial query');
    }

    $stmt->bind_param('s', $fromDateTime);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to load iOS active trials');
    }

    $rows = get_result($stmt);
    $stmt->close();

    return [
        'active' => (int)($rows[0]['active_trials'] ?? 0),
        'source' => 'ios_subscription_events trial original_transaction_id excluding expired originals',
    ];
}

function GetHomePurchaseStats($main_mysqli, string $fromDate, string $toDate): array
{
    $stats = home_empty_purchase_stats();
    $fromDateTime = $fromDate . ' 00:00:00';
    $toDateTime = $toDate . ' 23:59:59';
    $usdToLkr = home_get_currency_rate($main_mysqli, 'LKR');
    $appCatalog = home_get_app_catalog($main_mysqli);

    $androidMysqli = null;
    try {
        $androidMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
        $android = GetHomeAndroidPurchaseStats($androidMysqli, $fromDateTime, $toDateTime);
        home_merge_platform_purchase_stats($stats, 'android', $android, $usdToLkr);
        home_merge_purchase_app_breakdown(
            $stats,
            GetHomeAndroidPurchaseAppBreakdown($androidMysqli, $fromDateTime, $toDateTime),
            'android',
            $appCatalog,
            $usdToLkr
        );
    } catch (Throwable $error) {
        $stats['android_error'] = $error->getMessage();
    } finally {
        if ($androidMysqli instanceof mysqli) {
            $androidMysqli->close();
        }
    }

    try {
        $ios = GetHomeIosPurchaseStats($main_mysqli, $fromDateTime, $toDateTime);
        home_merge_platform_purchase_stats($stats, 'apple', $ios, $usdToLkr);
        home_merge_purchase_app_breakdown(
            $stats,
            GetHomeIosPurchaseAppBreakdown($main_mysqli, $fromDateTime, $toDateTime),
            'apple',
            $appCatalog,
            $usdToLkr
        );
    } catch (Throwable $error) {
        $stats['ios_error'] = $error->getMessage();
    }

    foreach (['totalPurchases', 'refundEvents', 'freeTrials', 'yearlySubscribers', 'monthlySubscribers', 'lifetimePurchases', 'offerPurchases', 'appRevenue', 'appRevenueLkr', 'grossAppRevenue', 'grossAppRevenueLkr', 'refundRevenue', 'refundRevenueLkr'] as $key) {
        $stats[$key]['total'] = $stats[$key]['android'] + $stats[$key]['apple'];
    }

    return $stats;
}

function GetHomeAndroidPurchaseAppBreakdown(mysqli $mysqli, string $fromDateTime, string $toDateTime): array
{
    $sql = "
        SELECT
            package AS app_key,
            sku AS product_id,
            CASE
                WHEN LOWER(sku) LIKE '%monthly%' THEN 'monthly'
                WHEN LOWER(sku) LIKE '%yearly%' OR LOWER(sku) LIKE '%annual%' THEN 'yearly'
                WHEN LOWER(sku) LIKE '%offer%' OR LOWER(sku) LIKE '%off%' THEN 'offer'
                WHEN LOWER(sku) LIKE '%lifetime%' OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%OTP%' THEN 'lifetime'
                ELSE 'other'
            END AS purchase_type,
            COUNT(*) AS purchase_count,
            COALESCE(SUM(amount_lkr), 0) AS revenue_lkr
        FROM fnd_global_purchase_tab
        WHERE purchased_date BETWEEN ? AND ?
          AND COALESCE(amount_lkr, 0) > 0
          AND (
            UPPER(TRIM(COALESCE(status, ''))) LIKE '%PURCHASED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%RENEWED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%RECOVERED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%CHARGED%'
          )
          AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%REFUND%'
          AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%REVOK%'
          AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%CANCEL%'
        GROUP BY
            package,
            sku,
            CASE
                WHEN LOWER(sku) LIKE '%monthly%' THEN 'monthly'
                WHEN LOWER(sku) LIKE '%yearly%' OR LOWER(sku) LIKE '%annual%' THEN 'yearly'
                WHEN LOWER(sku) LIKE '%offer%' OR LOWER(sku) LIKE '%off%' THEN 'offer'
                WHEN LOWER(sku) LIKE '%lifetime%' OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%OTP%' THEN 'lifetime'
                ELSE 'other'
            END
    ";

    return home_fetch_purchase_app_rows($mysqli, $sql, $fromDateTime, $toDateTime);
}

function GetHomeAndroidPurchaseStats(mysqli $mysqli, string $fromDateTime, string $toDateTime): array
{
    $validPurchaseCondition = "
        COALESCE(amount_lkr, 0) > 0
        AND (
            UPPER(TRIM(COALESCE(status, ''))) LIKE '%PURCHASED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%RENEWED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%RECOVERED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%CHARGED%'
        )
        AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%REFUND%'
        AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%REVOK%'
        AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%CANCEL%'
    ";
    $refundCondition = "
        UPPER(TRIM(COALESCE(status, ''))) LIKE '%REFUND%'
        OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%REVOK%'
        OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%VOID%'
        OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%CHARGEBACK%'
    ";

    $sql = "
        SELECT
            SUM(CASE WHEN {$validPurchaseCondition} THEN 1 ELSE 0 END) AS total_count,
            SUM(CASE WHEN {$refundCondition} THEN 1 ELSE 0 END) AS refund_count,
            SUM(CASE
                WHEN LOWER(COALESCE(sku, '')) LIKE '%trial%'
                  OR LOWER(COALESCE(status, '')) LIKE '%trial%'
                THEN 1 ELSE 0 END) AS free_trial_count,
            SUM(CASE WHEN {$validPurchaseCondition} AND LOWER(sku) LIKE '%monthly%' THEN 1 ELSE 0 END) AS monthly_count,
            SUM(CASE WHEN {$validPurchaseCondition} AND (LOWER(sku) LIKE '%yearly%' OR LOWER(sku) LIKE '%annual%') THEN 1 ELSE 0 END) AS yearly_count,
            SUM(CASE WHEN {$validPurchaseCondition} AND (LOWER(sku) LIKE '%lifetime%' OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%OTP%') AND LOWER(sku) NOT LIKE '%offer%' AND LOWER(sku) NOT LIKE '%off%' THEN 1 ELSE 0 END) AS lifetime_count,
            SUM(CASE WHEN {$validPurchaseCondition} AND (LOWER(sku) LIKE '%offer%' OR LOWER(sku) LIKE '%off%') THEN 1 ELSE 0 END) AS offer_count,
            COALESCE(SUM(CASE WHEN {$validPurchaseCondition} THEN amount_lkr ELSE 0 END), 0) AS revenue_lkr,
            COALESCE(SUM(CASE WHEN ({$refundCondition}) AND COALESCE(amount_lkr, 0) <> 0 THEN ABS(amount_lkr) ELSE 0 END), 0) AS refund_revenue_lkr
        FROM fnd_global_purchase_tab
        WHERE purchased_date BETWEEN ? AND ?
    ";

    return home_fetch_purchase_stat_row($mysqli, $sql, $fromDateTime, $toDateTime);
}

function GetHomeIosPurchaseStats(mysqli $mysqli, string $fromDateTime, string $toDateTime): array
{
    $purchaseEventCondition = "
        UPPER(TRIM(COALESCE(notification_type, ''))) IN ('DID_RENEW', 'SUBSCRIBED', 'ONE_TIME_CHARGE')
        AND COALESCE(amount_lkr, 0) > 0
        AND NOT (
            LOWER(TRIM(COALESCE(duration, ''))) = 'yearly'
            AND LOWER(TRIM(COALESCE(status, ''))) = 'trial'
        )
        AND UPPER(TRIM(COALESCE(subtype, ''))) NOT LIKE '%REVOKE%'
        AND UPPER(TRIM(COALESCE(status, ''))) NOT IN ('EXPIRED', 'REVOKED', 'REFUNDED', 'CANCELLED')
    ";
    $refundEventCondition = "
        UPPER(TRIM(COALESCE(notification_type, ''))) LIKE '%REFUND%'
        OR UPPER(TRIM(COALESCE(notification_type, ''))) LIKE '%REVOKE%'
        OR UPPER(TRIM(COALESCE(subtype, ''))) LIKE '%REFUND%'
        OR UPPER(TRIM(COALESCE(subtype, ''))) LIKE '%REVOKE%'
        OR UPPER(TRIM(COALESCE(status, ''))) IN ('REFUNDED', 'REVOKED')
    ";

    $sql = "
        SELECT
            COALESCE(SUM(CASE WHEN {$purchaseEventCondition} THEN 1 ELSE 0 END), 0) AS total_count,
            COALESCE(SUM(CASE WHEN {$refundEventCondition} THEN 1 ELSE 0 END), 0) AS refund_count,
            COALESCE(SUM(CASE WHEN {$purchaseEventCondition} AND (LOWER(product_id) LIKE '%monthly%' OR LOWER(duration) = 'monthly') THEN 1 ELSE 0 END), 0) AS monthly_count,
            COALESCE(SUM(CASE WHEN {$purchaseEventCondition} AND (LOWER(product_id) LIKE '%yearly%' OR LOWER(product_id) LIKE '%annual%' OR LOWER(duration) = 'yearly') THEN 1 ELSE 0 END), 0) AS yearly_count,
            COALESCE(SUM(CASE WHEN {$purchaseEventCondition} AND (LOWER(product_id) LIKE '%lifetime%' OR LOWER(product_id) LIKE '%premium%') AND LOWER(product_id) NOT LIKE '%offer%' AND LOWER(product_id) NOT LIKE '%off%' THEN 1 ELSE 0 END), 0) AS lifetime_count,
            COALESCE(SUM(CASE WHEN {$purchaseEventCondition} AND (LOWER(product_id) LIKE '%offer%' OR LOWER(product_id) LIKE '%off%') THEN 1 ELSE 0 END), 0) AS offer_count,
            COALESCE(SUM(CASE WHEN {$purchaseEventCondition} THEN amount_lkr ELSE 0 END), 0) AS revenue_lkr,
            COALESCE(SUM(CASE WHEN {$refundEventCondition} AND COALESCE(amount_lkr, 0) <> 0 THEN ABS(amount_lkr) ELSE 0 END), 0) AS refund_revenue_lkr
        FROM ios_subscription_events
        WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
          AND LOWER(COALESCE(environment, '')) = 'production'
    ";

    $stats = home_fetch_purchase_stat_row($mysqli, $sql, $fromDateTime, $toDateTime);
    $stats['free_trial_count'] = GetHomeIosFreeTrialEvents($mysqli, $fromDateTime, $toDateTime);

    return $stats;
}

function GetHomeIosFreeTrialEvents(mysqli $mysqli, string $fromDateTime, string $toDateTime): int
{
    $sql = "
        SELECT COUNT(DISTINCT trial_events.original_transaction_id) AS free_trial_count
        FROM ios_subscription_events trial_events
        WHERE trial_events.created_at BETWEEN ? AND ?
          AND LOWER(COALESCE(trial_events.environment, '')) = 'production'
          AND trial_events.original_transaction_id IS NOT NULL
          AND trial_events.original_transaction_id <> ''
          AND (
                LOWER(COALESCE(trial_events.duration, '')) = 'trial'
             OR LOWER(COALESCE(trial_events.status, '')) = 'trial'
             OR UPPER(COALESCE(trial_events.subtype, '')) LIKE '%TRIAL%'
          )
          AND NOT EXISTS (
              SELECT 1
              FROM ios_subscription_events expired_events
              WHERE expired_events.original_transaction_id = trial_events.original_transaction_id
                AND expired_events.created_at >= trial_events.created_at
                AND UPPER(COALESCE(expired_events.notification_type, '')) = 'EXPIRED'
                AND LOWER(COALESCE(expired_events.status, '')) = 'expired'
          )
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare iOS free trial query');
    }

    $stmt->bind_param('ss', $fromDateTime, $toDateTime);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to execute iOS free trial query');
    }

    $rows = get_result($stmt);
    $stmt->close();

    return (int)($rows[0]['free_trial_count'] ?? 0);
}

function GetHomeIosPurchaseAppBreakdown(mysqli $mysqli, string $fromDateTime, string $toDateTime): array
{
    $purchaseEventCondition = "
        UPPER(TRIM(COALESCE(notification_type, ''))) IN ('DID_RENEW', 'SUBSCRIBED', 'ONE_TIME_CHARGE')
        AND NOT (
            LOWER(TRIM(COALESCE(duration, ''))) = 'yearly'
            AND LOWER(TRIM(COALESCE(status, ''))) = 'trial'
        )
        AND UPPER(TRIM(COALESCE(subtype, ''))) NOT LIKE '%REVOKE%'
        AND UPPER(TRIM(COALESCE(status, ''))) NOT IN ('EXPIRED', 'REVOKED', 'REFUNDED', 'CANCELLED')
    ";

    $sql = "
        SELECT
            COALESCE(NULLIF(app_apple_id, ''), product_id) AS app_key,
            product_id,
            CASE
                WHEN LOWER(product_id) LIKE '%monthly%' OR LOWER(duration) = 'monthly' THEN 'monthly'
                WHEN LOWER(product_id) LIKE '%yearly%' OR LOWER(product_id) LIKE '%annual%' OR LOWER(duration) = 'yearly' THEN 'yearly'
                WHEN LOWER(product_id) LIKE '%offer%' OR LOWER(product_id) LIKE '%off%' THEN 'offer'
                WHEN LOWER(product_id) LIKE '%lifetime%' OR LOWER(product_id) LIKE '%premium%' THEN 'lifetime'
                ELSE 'other'
            END AS purchase_type,
            COALESCE(SUM(CASE WHEN {$purchaseEventCondition} THEN 1 ELSE 0 END), 0) AS purchase_count,
            COALESCE(SUM(CASE WHEN {$purchaseEventCondition} THEN amount_lkr ELSE 0 END), 0) AS revenue_lkr
        FROM ios_subscription_events
        WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
          AND LOWER(COALESCE(environment, '')) = 'production'
          AND COALESCE(amount_lkr, 0) > 0
        GROUP BY
            COALESCE(NULLIF(app_apple_id, ''), product_id),
            product_id,
            CASE
                WHEN LOWER(product_id) LIKE '%monthly%' OR LOWER(duration) = 'monthly' THEN 'monthly'
                WHEN LOWER(product_id) LIKE '%yearly%' OR LOWER(product_id) LIKE '%annual%' OR LOWER(duration) = 'yearly' THEN 'yearly'
                WHEN LOWER(product_id) LIKE '%offer%' OR LOWER(product_id) LIKE '%off%' THEN 'offer'
                WHEN LOWER(product_id) LIKE '%lifetime%' OR LOWER(product_id) LIKE '%premium%' THEN 'lifetime'
                ELSE 'other'
            END
        HAVING purchase_count > 0
    ";

    return home_fetch_purchase_app_rows($mysqli, $sql, $fromDateTime, $toDateTime);
}

function home_fetch_purchase_stat_row(mysqli $mysqli, string $sql, string $fromDateTime, string $toDateTime): array
{
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare purchase stats query');
    }

    $stmt->bind_param('ss', $fromDateTime, $toDateTime);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to execute purchase stats query');
    }

    $rows = get_result($stmt);
    $stmt->close();
    $row = $rows[0] ?? [];

    return [
        'total_count' => (int)($row['total_count'] ?? 0),
        'refund_count' => (int)($row['refund_count'] ?? 0),
        'free_trial_count' => (int)($row['free_trial_count'] ?? 0),
        'monthly_count' => (int)($row['monthly_count'] ?? 0),
        'yearly_count' => (int)($row['yearly_count'] ?? 0),
        'lifetime_count' => (int)($row['lifetime_count'] ?? 0),
        'offer_count' => (int)($row['offer_count'] ?? 0),
        'revenue_lkr' => (float)($row['revenue_lkr'] ?? 0),
        'refund_revenue_lkr' => (float)($row['refund_revenue_lkr'] ?? 0),
    ];
}

function home_fetch_purchase_app_rows(mysqli $mysqli, string $sql, string $fromDateTime, string $toDateTime): array
{
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare purchase app breakdown query');
    }

    $stmt->bind_param('ss', $fromDateTime, $toDateTime);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to execute purchase app breakdown query');
    }

    $rows = get_result($stmt);
    $stmt->close();

    return $rows ?: [];
}

function home_merge_platform_purchase_stats(array &$stats, string $platform, array $row, float $usdToLkr): void
{
    $grossRevenueLkr = (float)($row['revenue_lkr'] ?? 0);
    $refundRevenueLkr = (float)($row['refund_revenue_lkr'] ?? 0);
    $revenueLkr = $grossRevenueLkr - $refundRevenueLkr;

    $stats['totalPurchases'][$platform] = (int)($row['total_count'] ?? 0);
    $stats['refundEvents'][$platform] = (int)($row['refund_count'] ?? 0);
    $stats['freeTrials'][$platform] = (int)($row['free_trial_count'] ?? 0);
    $stats['monthlySubscribers'][$platform] = (int)($row['monthly_count'] ?? 0);
    $stats['yearlySubscribers'][$platform] = (int)($row['yearly_count'] ?? 0);
    $stats['lifetimePurchases'][$platform] = (int)($row['lifetime_count'] ?? 0);
    $stats['offerPurchases'][$platform] = (int)($row['offer_count'] ?? 0);
    $stats['appRevenueLkr'][$platform] = $revenueLkr;
    $stats['appRevenue'][$platform] = $usdToLkr > 0 ? round($revenueLkr / $usdToLkr, 2) : $revenueLkr;
    $stats['grossAppRevenueLkr'][$platform] = $grossRevenueLkr;
    $stats['grossAppRevenue'][$platform] = $usdToLkr > 0 ? round($grossRevenueLkr / $usdToLkr, 2) : $grossRevenueLkr;
    $stats['refundRevenueLkr'][$platform] = $refundRevenueLkr;
    $stats['refundRevenue'][$platform] = $usdToLkr > 0 ? round($refundRevenueLkr / $usdToLkr, 2) : $refundRevenueLkr;
}

function home_merge_purchase_app_breakdown(array &$stats, array $rows, string $platform, array $appCatalog, float $usdToLkr): void
{
    foreach ($rows as $row) {
        $type = (string)($row['purchase_type'] ?? 'other');
        if (!isset($stats['appBreakdown'][$type])) {
            continue;
        }

        $appKey = trim((string)($row['app_key'] ?? ''));
        $productId = trim((string)($row['product_id'] ?? ''));
        $app = home_resolve_purchase_app($appKey, $productId, $platform, $appCatalog);
        $breakdownKey = $platform . ':' . ($app['app_id'] !== '' ? $app['app_id'] : ($appKey !== '' ? $appKey : $productId));
        $count = (int)($row['purchase_count'] ?? 0);
        $revenueLkr = (float)($row['revenue_lkr'] ?? 0);

        if (!isset($stats['appBreakdown'][$type][$breakdownKey])) {
            $stats['appBreakdown'][$type][$breakdownKey] = [
                'app_id' => $app['app_id'],
                'app_name' => $app['app_name'],
                'app_key' => $appKey,
                'product_id' => $productId,
                'package_name' => $app['package_name'],
                'platform' => $platform,
                'icon_url' => $app['icon_url'],
                'count' => 0,
                'revenue_lkr' => 0,
                'revenue_usd' => 0,
            ];
        }

        $stats['appBreakdown'][$type][$breakdownKey]['count'] += $count;
        $stats['appBreakdown'][$type][$breakdownKey]['revenue_lkr'] += $revenueLkr;
        $stats['appBreakdown'][$type][$breakdownKey]['revenue_usd'] = $usdToLkr > 0
            ? round($stats['appBreakdown'][$type][$breakdownKey]['revenue_lkr'] / $usdToLkr, 2)
            : $stats['appBreakdown'][$type][$breakdownKey]['revenue_lkr'];
    }

    foreach (array_keys($stats['appBreakdown']) as $type) {
        $stats['appBreakdown'][$type] = array_values($stats['appBreakdown'][$type]);
        usort($stats['appBreakdown'][$type], function ($a, $b) {
            return ($b['count'] <=> $a['count']) ?: strcmp($a['app_name'], $b['app_name']);
        });
    }
}

function home_get_app_catalog(mysqli $mysqli): array
{
    $rows = [];
    $result = $mysqli->query("SELECT id, app_id, package_name, db_name, name, icon_url, os FROM fnd_app_details_tab WHERE status IN (1, 2)");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $rows[] = [
                'app_id' => (string)($row['id'] ?? ''),
                'apple_app_id' => trim((string)($row['app_id'] ?? '')),
                'package_name' => trim((string)($row['package_name'] ?? '')),
                'db_name' => trim((string)($row['db_name'] ?? '')),
                'app_name' => trim((string)($row['name'] ?? '')),
                'icon_url' => trim((string)($row['icon_url'] ?? '')),
                'platform' => strtolower(trim((string)($row['os'] ?? ''))),
            ];
        }
        $result->free();
    }

    return $rows;
}

function home_resolve_purchase_app(string $appKey, string $productId, string $platform, array $appCatalog): array
{
    $needle = strtolower($platform === 'apple' ? $productId : $appKey);
    $appleAppId = strtolower($platform === 'apple' ? $appKey : '');

    foreach ($appCatalog as $app) {
        if ($platform === 'apple') {
            $catalogAppleAppId = strtolower((string)($app['apple_app_id'] ?? ''));
            if ($appleAppId !== '' && $catalogAppleAppId !== '' && $appleAppId === $catalogAppleAppId) {
                return $app;
            }
        }

        $package = strtolower((string)($app['package_name'] ?? ''));
        if ($package !== '' && ($needle === $package || strpos($needle, $package) === 0)) {
            return $app;
        }
    }

    $fallbackName = $productId !== '' ? preg_replace('/\.(monthly|yearly|annual|lifetime.*)$/i', '', $productId) : $appKey;
    return [
        'app_id' => '',
        'apple_app_id' => $platform === 'apple' ? $appKey : '',
        'package_name' => $platform === 'android' ? $appKey : '',
        'app_name' => $fallbackName !== '' ? $fallbackName : 'Unknown App',
        'icon_url' => '',
        'platform' => $platform,
    ];
}

function home_get_currency_rate(mysqli $mysqli, string $currencyCode): float
{
    $stmt = $mysqli->prepare(
        'SELECT rate FROM currency_rates WHERE base_currency = ? AND currency_code = ? LIMIT 1'
    );

    if (!$stmt) {
        return 300.0;
    }

    $base = 'USD';
    $code = strtoupper($currencyCode);
    $stmt->bind_param('ss', $base, $code);
    if (!$stmt->execute()) {
        $stmt->close();
        return 300.0;
    }

    $rows = get_result($stmt);
    $stmt->close();
    $rate = (float)($rows[0]['rate'] ?? 0);

    return $rate > 0 ? $rate : 300.0;
}


// CUSTOM DATE RANGE
function GetAppInstallFromDbArray($main_mysqli, array $db_array, string $fromDate, string $toDate, array $apps = []): array {
    $all = [];
    $totalAndroid = 0;
    $totalIos = 0;

    if (!empty($apps)) {
        foreach ($apps as $app) {
            $db = trim((string)($app['db_name'] ?? ''));
            if ($db === '') {
                continue;
            }

            $mysqli = SwapDatabase($main_mysqli, $db);
            $result = GetAppInstall($mysqli, $db, $fromDate, $toDate, $app);
            $all[] = $result;
            $totalAndroid += $result['android_count'];
            $totalIos += $result['ios_count'];
            $mysqli->close();
        }

        return [
            'apps' => $all,
            'summary' => [
                'android_count' => $totalAndroid,
                'ios_count' => $totalIos,
                'total_count' => $totalAndroid + $totalIos
            ]
        ];
    }

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $result = GetAppInstall($mysqli, $db, $fromDate, $toDate);
        $all[] = $result;
        $totalAndroid += $result['android_count'];
        $totalIos += $result['ios_count'];
        $mysqli->close();
    }

    return [
        'apps' => $all,
        'summary' => [
            'android_count' => $totalAndroid,
            'ios_count' => $totalIos,
            'total_count' => $totalAndroid + $totalIos
        ]
    ];
}

function GetAppInstall(mysqli $mysqli, string $appDb, string $fromDate, string $toDate, array $app = []): array {
    $fromDateTime = $fromDate . " 00:00:00";
    $toDateTime   = $toDate . " 23:59:59";
    $platform = strtolower(trim((string)($app['os'] ?? '')));
    $isAndroid = $platform === '' || strpos($platform, 'android') !== false;
    $isIos = $platform === '' || strpos($platform, 'ios') !== false || strpos($platform, 'apple') !== false;

    $androidCount = $isAndroid ? count_rows_between($mysqli, 'fnd_registration_tab', 'registered_date', $fromDateTime, $toDateTime) : 0;
    $iosCount = $isIos ? count_rows_between($mysqli, 'fnd_ios_registration_tab', 'registered_date', $fromDateTime, $toDateTime) : 0;

    return [
        'app_id' => (string)($app['id'] ?? ''),
        'app_name' => (string)($app['name'] ?? $appDb),
        'app_db' => $appDb,
        'package_name' => (string)($app['package_name'] ?? ''),
        'platform' => (string)($app['os'] ?? ''),
        'icon_url' => (string)($app['icon_url'] ?? ''),
        'android_count' => $androidCount,
        'ios_count' => $iosCount,
        'total_count' => $androidCount + $iosCount
    ];
}


function GetAppActiveUsersFromDbArray($main_mysqli, array $db_array, string $fromDate, string $toDate, array $apps = []): array {
    $all = [];
    $totalAndroid = 0;
    $totalIos = 0;

    if (!empty($apps)) {
        foreach ($apps as $app) {
            $db = trim((string)($app['db_name'] ?? ''));
            if ($db === '') {
                continue;
            }

            $mysqli = SwapDatabase($main_mysqli, $db);
            $result = GetAppActiveUsers($mysqli, $db, $fromDate, $toDate, $app);
            $all[] = $result;
            $totalAndroid += $result['android_active_count'];
            $totalIos += $result['ios_active_count'];
            $mysqli->close();
        }

        return [
            'apps' => $all,
            'summary' => [
                'android_active_count' => $totalAndroid,
                'ios_active_count' => $totalIos,
                'total_active_count' => $totalAndroid + $totalIos
            ]
        ];
    }

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $result = GetAppActiveUsers($mysqli, $db, $fromDate, $toDate);
        $all[] = $result;
        $totalAndroid += $result['android_active_count'];
        $totalIos += $result['ios_active_count'];
        $mysqli->close();
    }

    return [
        'apps' => $all,
        'summary' => [
            'android_active_count' => $totalAndroid,
            'ios_active_count' => $totalIos,
            'total_active_count' => $totalAndroid + $totalIos
        ]
    ];
}

function GetAppActiveUsers(mysqli $mysqli, string $appDb, string $fromDate, string $toDate, array $app = []): array {
    $fromDateTime = $fromDate . " 00:00:00";
    $toDateTime   = $toDate . " 23:59:59";
    $platform = strtolower(trim((string)($app['os'] ?? '')));
    $isAndroid = $platform === '' || strpos($platform, 'android') !== false;
    $isIos = $platform === '' || strpos($platform, 'ios') !== false || strpos($platform, 'apple') !== false;
    $androidActiveCount = $isAndroid ? count_rows_between($mysqli, 'fnd_registration_tab', 'last_online', $fromDateTime, $toDateTime) : 0;
    $iosActiveCount = $isIos ? count_rows_between($mysqli, 'fnd_ios_registration_tab', 'last_online', $fromDateTime, $toDateTime) : 0;

    return [
        'app_id' => (string)($app['id'] ?? ''),
        'app_name' => (string)($app['name'] ?? $appDb),
        'app_db' => $appDb,
        'package_name' => (string)($app['package_name'] ?? ''),
        'platform' => (string)($app['os'] ?? ''),
        'icon_url' => (string)($app['icon_url'] ?? ''),
        'android_active_count' => $androidActiveCount,
        'ios_active_count' => $iosActiveCount,
        'total_active_count' => $androidActiveCount + $iosActiveCount
    ];
}

function home_empty_referral_source_stats(): array
{
    return [
        'organic' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'inAppAds' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'googleAds' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'metaAds' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'others' => ['total' => 0, 'android' => 0, 'apple' => 0],
        'details' => [
            'organic' => ['label' => 'Organic Installs', 'acquired' => ['total' => 0, 'android' => 0, 'apple' => 0], 'purchase_users' => 0, 'purchase_events' => 0, 'revenue_usd' => 0, 'revenue_lkr' => 0, 'purchases' => []],
            'inAppAds' => ['label' => 'In-App Ads', 'acquired' => ['total' => 0, 'android' => 0, 'apple' => 0], 'purchase_users' => 0, 'purchase_events' => 0, 'revenue_usd' => 0, 'revenue_lkr' => 0, 'purchases' => []],
            'googleAds' => ['label' => 'Google Ads', 'acquired' => ['total' => 0, 'android' => 0, 'apple' => 0], 'purchase_users' => 0, 'purchase_events' => 0, 'revenue_usd' => 0, 'revenue_lkr' => 0, 'purchases' => []],
            'metaAds' => ['label' => 'Meta Ads', 'acquired' => ['total' => 0, 'android' => 0, 'apple' => 0], 'purchase_users' => 0, 'purchase_events' => 0, 'revenue_usd' => 0, 'revenue_lkr' => 0, 'purchases' => []],
            'others' => ['label' => 'Others', 'acquired' => ['total' => 0, 'android' => 0, 'apple' => 0], 'purchase_users' => 0, 'purchase_events' => 0, 'revenue_usd' => 0, 'revenue_lkr' => 0, 'purchases' => []],
        ],
    ];
}

function GetHomeReferralSourceStats($main_mysqli, array $db_array, string $fromDate, string $toDate, array $apps = []): array
{
    $stats = home_empty_referral_source_stats();
    $targets = [];
    $categoryPackages = [
        'organic' => [],
        'inAppAds' => [],
        'googleAds' => [],
        'metaAds' => [],
        'others' => [],
    ];
    $appCatalog = home_get_app_catalog($main_mysqli);
    $catalogByDb = [];
    foreach ($appCatalog as $app) {
        $catalogDb = strtolower(trim((string)($app['db_name'] ?? '')));
        if ($catalogDb !== '') {
            $catalogByDb[$catalogDb] = $app;
        }
    }

    if (!empty($apps)) {
        foreach ($apps as $app) {
            $db = trim((string)($app['db_name'] ?? ''));
            $platform = strtolower(trim((string)($app['os'] ?? '')));
            if ($db === '' || ($platform !== '' && strpos($platform, 'android') === false)) {
                continue;
            }
            $targets[] = [
                'db' => $db,
                'package_name' => trim((string)($app['package_name'] ?? '')),
            ];
        }
    } else {
        foreach ($db_array as $db) {
            $db = trim((string)$db);
            $app = $catalogByDb[strtolower($db)] ?? [];
            $targets[] = [
                'db' => $db,
                'package_name' => trim((string)($app['package_name'] ?? '')),
            ];
        }
    }

    $seenTargets = [];
    foreach ($targets as $target) {
        $db = trim((string)($target['db'] ?? ''));
        if ($db === '') {
            continue;
        }
        $targetKey = strtolower($db);
        if (isset($seenTargets[$targetKey])) {
            continue;
        }
        $seenTargets[$targetKey] = true;
        $packageName = strtolower(trim((string)($target['package_name'] ?? '')));

        try {
            $mysqli = SwapDatabase($main_mysqli, $db);
            $rows = GetHomeReferralSourceRows($mysqli, $fromDate, $toDate);
            foreach ($rows as $row) {
                $category = home_normalize_referrer_category((string)($row['referrer'] ?? ''));
                $email = strtolower(trim((string)($row['email'] ?? '')));
                if (!isset($stats[$category])) {
                    $category = 'others';
                }
                $stats[$category]['android'] += 1;
                if ($email !== '' && $email !== 'unknown user' && $packageName !== '') {
                    if (!isset($categoryPackages[$category][$email])) {
                        $categoryPackages[$category][$email] = [];
                    }
                    $categoryPackages[$category][$email][$packageName] = true;
                }
            }
            $mysqli->close();
        } catch (Throwable $error) {
            $stats['debug']['errors'][] = [
                'db' => $db,
                'message' => $error->getMessage(),
            ];
        }
    }

    foreach (['organic', 'inAppAds', 'googleAds', 'metaAds', 'others'] as $key) {
        $stats[$key]['apple'] = 0;
        $stats[$key]['total'] = $stats[$key]['android'];
        $stats['details'][$key]['acquired'] = $stats[$key];
    }

    try {
        $androidMysqli = SwapDatabase($main_mysqli, 'rermedap_admin');
        $usdToLkr = home_get_currency_rate($main_mysqli, 'LKR');
        foreach ($categoryPackages as $category => $emailPackageMap) {
            $purchaseStats = GetHomeReferralPurchaseStats($androidMysqli, $emailPackageMap, $appCatalog, $usdToLkr);
            $stats['details'][$category]['purchase_users'] = $purchaseStats['purchase_users'];
            $stats['details'][$category]['purchase_events'] = $purchaseStats['purchase_events'];
            $stats['details'][$category]['revenue_lkr'] = round($purchaseStats['revenue_lkr'], 2);
            $stats['details'][$category]['revenue_usd'] = $usdToLkr > 0 ? round($purchaseStats['revenue_lkr'] / $usdToLkr, 2) : round($purchaseStats['revenue_lkr'], 2);
            $stats['details'][$category]['purchases'] = $purchaseStats['purchases'];
        }
        $androidMysqli->close();
    } catch (Throwable $error) {
        $stats['debug']['purchase_error'] = $error->getMessage();
    }

    return $stats;
}

function GetHomeReferralSourceRows(mysqli $mysqli, string $fromDate, string $toDate): array
{
    $fromDateTime = $fromDate . " 00:00:00";
    $toDateTime = $toDate . " 23:59:59";
    $sql = "
        SELECT email, COALESCE(NULLIF(TRIM(referrer), ''), 'organic') AS referrer
        FROM fnd_registration_tab
        WHERE registered_date BETWEEN ? AND ?
          AND email IS NOT NULL
          AND TRIM(email) <> ''
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception($mysqli->error ?: 'Unable to prepare referral source query');
    }

    $stmt->bind_param('ss', $fromDateTime, $toDateTime);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        throw new Exception($error ?: 'Unable to execute referral source query');
    }

    $rows = get_result($stmt);
    $stmt->close();

    return $rows ?: [];
}

function GetHomeReferralPurchaseStats(mysqli $mysqli, array $emailPackageMap, array $appCatalog = [], float $usdToLkr = 300.0): array
{
    $result = [
        'purchase_users' => 0,
        'purchase_events' => 0,
        'revenue_lkr' => 0.0,
        'purchases' => [],
    ];
    $purchaseRows = [];
    $purchaseBuyerEmails = [];
    $detailBuyerEmails = [];
    $packageEmails = [];

    foreach ($emailPackageMap as $email => $packages) {
        $email = strtolower(trim((string)$email));
        if ($email === '' || $email === 'unknown user' || !is_array($packages)) {
            continue;
        }

        foreach ($packages as $packageName => $enabled) {
            if (!$enabled) {
                continue;
            }
            $packageName = strtolower(trim((string)$packageName));
            if ($packageName === '') {
                continue;
            }
            if (!isset($packageEmails[$packageName])) {
                $packageEmails[$packageName] = [];
            }
            $packageEmails[$packageName][$email] = true;
        }
    }

    if (empty($packageEmails)) {
        return $result;
    }

    $validPurchaseCondition = "
        COALESCE(amount_lkr, 0) > 0
        AND (
            UPPER(TRIM(COALESCE(status, ''))) LIKE '%PURCHASED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%RENEWED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%RECOVERED%'
            OR UPPER(TRIM(COALESCE(status, ''))) LIKE '%CHARGED%'
        )
        AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%REFUND%'
        AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%REVOK%'
        AND UPPER(TRIM(COALESCE(status, ''))) NOT LIKE '%CANCEL%'
    ";

    foreach ($packageEmails as $sourcePackageName => $emailsMap) {
        $emails = array_keys($emailsMap);
        foreach (array_chunk($emails, 400) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '?'));
            $detailSql = "
                SELECT
                    LOWER(email) AS buyer_email,
                    COALESCE(NULLIF(TRIM(package), ''), 'unknown') AS package_name,
                    COALESCE(NULLIF(TRIM(sku), ''), 'unknown') AS sku,
                    COUNT(*) AS purchase_events,
                    COALESCE(SUM(amount_lkr), 0) AS revenue_lkr
                FROM fnd_global_purchase_tab
                WHERE LOWER(package) = ?
                  AND LOWER(email) IN ({$placeholders})
                  AND {$validPurchaseCondition}
                GROUP BY
                    LOWER(email),
                    COALESCE(NULLIF(TRIM(package), ''), 'unknown'),
                    COALESCE(NULLIF(TRIM(sku), ''), 'unknown')
            ";

            $detailStmt = $mysqli->prepare($detailSql);
            if (!$detailStmt) {
                throw new Exception($mysqli->error ?: 'Unable to prepare referral purchase details query');
            }

            $types = 's' . str_repeat('s', count($chunk));
            $params = array_merge([$sourcePackageName], $chunk);
            $detailStmt->bind_param($types, ...$params);
            if (!$detailStmt->execute()) {
                $error = $detailStmt->error ?: $mysqli->error;
                $detailStmt->close();
                throw new Exception($error ?: 'Unable to execute referral purchase details query');
            }

            $detailRows = get_result($detailStmt);
            $detailStmt->close();

            foreach ($detailRows ?: [] as $detailRow) {
                $packageName = trim((string)($detailRow['package_name'] ?? 'unknown'));
                $sku = trim((string)($detailRow['sku'] ?? 'unknown'));
                $buyerEmail = strtolower(trim((string)($detailRow['buyer_email'] ?? '')));
                $detailKey = strtolower($packageName . '|' . $sku);
                if (!isset($purchaseRows[$detailKey])) {
                    $app = home_resolve_purchase_app($packageName, $sku, 'android', $appCatalog);
                    $purchaseRows[$detailKey] = [
                        'app_id' => $app['app_id'],
                        'app_name' => $app['app_name'],
                        'package_name' => $packageName,
                        'sku' => $sku,
                        'purchase_users' => 0,
                        'purchase_events' => 0,
                        'revenue_lkr' => 0.0,
                        'revenue_usd' => 0.0,
                        'icon_url' => $app['icon_url'],
                    ];
                    $detailBuyerEmails[$detailKey] = [];
                }

                $events = (int)($detailRow['purchase_events'] ?? 0);
                $revenueLkr = (float)($detailRow['revenue_lkr'] ?? 0);
                if ($buyerEmail !== '') {
                    $purchaseBuyerEmails[$buyerEmail] = true;
                    $detailBuyerEmails[$detailKey][$buyerEmail] = true;
                    $purchaseRows[$detailKey]['purchase_users'] = count($detailBuyerEmails[$detailKey]);
                }

                $purchaseRows[$detailKey]['purchase_events'] += $events;
                $purchaseRows[$detailKey]['revenue_lkr'] += $revenueLkr;
                $purchaseRows[$detailKey]['revenue_usd'] = $usdToLkr > 0
                    ? round($purchaseRows[$detailKey]['revenue_lkr'] / $usdToLkr, 2)
                    : round($purchaseRows[$detailKey]['revenue_lkr'], 2);
                $purchaseRows[$detailKey]['revenue_lkr'] = round($purchaseRows[$detailKey]['revenue_lkr'], 2);

                $result['purchase_events'] += $events;
                $result['revenue_lkr'] += $revenueLkr;
            }
        }
    }

    $result['purchase_users'] = count($purchaseBuyerEmails);
    $result['purchases'] = array_values($purchaseRows);
    usort($result['purchases'], function ($a, $b) {
        return ((float)$b['revenue_lkr'] <=> (float)$a['revenue_lkr'])
            ?: ((int)$b['purchase_events'] <=> (int)$a['purchase_events'])
            ?: strcmp((string)$a['app_name'], (string)$b['app_name']);
    });

    return $result;
}

function home_normalize_referrer_category(string $referrer): string
{
    $value = strtolower(trim($referrer));
    $params = [];

    $decoded = json_decode($referrer, true);
    if (is_array($decoded)) {
        foreach ($decoded as $key => $paramValue) {
            $params[strtolower(trim((string)$key))] = strtolower(trim((string)$paramValue));
        }
    } elseif (strpos($referrer, '=') !== false) {
        $query = $referrer;
        $queryParts = parse_url($referrer);
        if (is_array($queryParts) && isset($queryParts['query'])) {
            $query = $queryParts['query'];
        }

        parse_str($query, $parsedParams);
        foreach ($parsedParams as $key => $paramValue) {
            $params[strtolower(trim((string)$key))] = strtolower(trim((string)$paramValue));
        }
    }

    $utmMedium = $params['utm_medium'] ?? '';
    $utmSource = $params['utm_source'] ?? '';
    $gadSource = $params['gad_source'] ?? '';
    $hasGoogleAdClickId = !empty($params['gclid']) || !empty($params['gbraid']) || !empty($params['wbraid']);

    if ($hasGoogleAdClickId || $gadSource === '1') {
        return 'googleAds';
    }

    if ($utmMedium === 'organic' || $utmSource === 'google-play' || $utmSource === 'google_play') {
        return 'organic';
    }

    if ($value === '' || in_array($value, ['organic', 'direct', 'none', 'null', 'unknown', '(not set)', 'not set'], true)) {
        return 'organic';
    }

    if (
        strpos($value, 'gclid') !== false
        || strpos($value, 'gbraid') !== false
        || strpos($value, 'wbraid') !== false
        || strpos($value, 'gad_source') !== false
        || strpos($value, 'adwords') !== false
        || strpos($value, 'gads') !== false
        || (($utmSource === 'google' || $utmSource === 'googleads' || $utmSource === 'google_ads') && in_array($utmMedium, ['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search'], true))
    ) {
        return 'googleAds';
    }

    if (strpos($value, 'facebook') !== false || strpos($value, 'instagram') !== false || strpos($value, 'meta') !== false || preg_match('/\bfb\b/', $value)) {
        return 'metaAds';
    }

    if (strpos($value, 'in_app') !== false || strpos($value, 'in-app') !== false || strpos($value, 'cross') !== false || strpos($value, 'internal') !== false || strpos($value, 'referral') !== false || strpos($value, 'promo') !== false) {
        return 'inAppAds';
    }

    return 'others';
}

function GetIosSubscriptionStats($mysqli) {

    $prep_stmt = "
        SELECT MAX(report_date) AS latest_report_date
        FROM ios_subscription_states
        WHERE data_type = 'SUMMARY'
          AND source = 'REPORT'
    ";

    $stmt = $mysqli->prepare($prep_stmt);

    if (!$stmt) {
        return false;
    }

    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $date_result = get_result($stmt);
    $stmt->close();

    if (!$date_result || count($date_result) == 0) {
        return false;
    }

    $latest_report_date = $date_result[0]["latest_report_date"];

    if ($latest_report_date == null || $latest_report_date == "") {
        return false;
    }

    $prep_stmt = "
        SELECT
            COALESCE(SUM(CASE 
                WHEN duration = 'monthly' AND status = 'active' 
                THEN active_count ELSE 0 END), 0) AS monthly_subscribers,

            COALESCE(SUM(CASE 
                WHEN duration = 'yearly' AND status = 'active' 
                THEN active_count ELSE 0 END), 0) AS yearly_subscribers,

            COALESCE(SUM(CASE 
                WHEN status = 'trial' 
                THEN active_count ELSE 0 END), 0) AS active_trials
        FROM ios_subscription_states
        WHERE data_type = 'SUMMARY'
          AND source = 'REPORT'
          AND report_date = ?
    ";

    $stmt = $mysqli->prepare($prep_stmt);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param("s", $latest_report_date);

    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $lst = get_result($stmt);
    $stmt->close();

    if (!$lst || count($lst) == 0) {
        return false;
    }

    $monthly = intval($lst[0]["monthly_subscribers"]);
    $yearly  = intval($lst[0]["yearly_subscribers"]);
    $trial   = intval($lst[0]["active_trials"]);

    $paid_total = $monthly + $yearly;
    $all_total = $paid_total + $trial;

    $conversion_rate = 0;

    if ($all_total > 0) {
        $conversion_rate = round(($paid_total / $all_total) * 100, 2);
    }

    return array(
        "latest_report_date" => $latest_report_date,
        "monthly_subscribers" => $monthly,
        "yearly_subscribers" => $yearly,
        "active_trials" => $trial,
        "paid_total" => $paid_total,
        "all_total" => $all_total,
        "conversion_rate" => $conversion_rate
    );
}
?>
