<?php
if (true) {
    if($_POST['db']!=0){
        if ($tag == "GET_REGISTERED") {
            if(isset($_POST['from']) && isset($_POST['days'])){
                $from = (int)$_POST['from'];
                $days = (int)$_POST['days'];
                $response["success"] = TRUE;
                $response["user"]=GetRegistered($mysqli,$from,$days);
                echo json_encode($response);
                EXIT();
            }else{
                $response["success"] = FALSE;
                $response["error_msg"] = "(from,days) parameters are missing";
                echo json_encode($response);
                Exit();                
            }
        }else if ($tag == "UPDATE_USER_DETAILS") {
            
                $email        = trim($_POST['email'] ?? '');
                $premium      = $_POST['premium']      ?? '';
                $ads_free     = $_POST['ads_free']     ?? '';
                $ss_enabled   = $_POST['ss_enabled']   ?? '';
                $chat_enabled = $_POST['chat_enabled'] ?? '';
            
                $result = UpdateUserFlags($mysqli, $email, $premium, $ads_free, $ss_enabled, $chat_enabled);
                $response["success"] = $result === true;
                if ($result !== true) {
                    $response["error_msg"] = is_array($result) && isset($result['error']) ? $result['error'] : "Failed to update user details";
                }
                echo json_encode($response);
                exit();
        }
        
    }else{
        if ($tag == "GET_TOP_PURCHASE_USERS") {
           $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 10;
           $db_array = parse_db_array_request();
        
            if (!$db_array) {
                $response = [
                    "success" => false,
                    "error_msg" => "Invalid db_array parameter"
                ];
            } else {
                $response = [
                    "success" => true,
                    "users"   => GetTopUsersFromDbArray($main_mysqli, $db_array, $limit)
                ];
            }
        
            echo json_encode($response);
            exit();
 
        }else if ($tag == "GET_TODAY_REGISTERED") {
            $db_array = parse_db_array_request();
        
            if (!$db_array) {
                $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
                echo json_encode($response); exit();
            }
        
            $response = [
                "success" => true,
                "users"   => GetTodayRegisteredFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_YESTERDAY_REGISTERED") {
            $db_array = parse_db_array_request();
        
            if (!$db_array) {
                $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
                echo json_encode($response); exit();
            }
        
            $response = [
                "success" => true,
                "users"   => GetYesterdayRegisteredFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_LAST7DAYS_REGISTERED") {
            $db_array = parse_db_array_request();
        
            if (!$db_array) {
                $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
                echo json_encode($response); exit();
            }
        
            $response = [
                "success" => true,
                "users"   => GetLast7DaysRegisteredFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_CURRENTMONTH_REGISTERED") {
            $db_array = parse_db_array_request();
        
            if (!$db_array) {
                $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
                echo json_encode($response); exit();
            }
        
            $response = [
                "success" => true,
                "users"   => GetCurrentMonthRegisteredFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_LASTMONTH_REGISTERED") {
            $db_array = parse_db_array_request();
        
            if (!$db_array) {
                $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
                echo json_encode($response); exit();
            }
        
            $response = [
                "success" => true,
                "users"   => GetLastMonthRegisteredFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_LAST3MONTH_REGISTERED") {
            $db_array = parse_db_array_request();
        
            if (!$db_array) {
                $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
                echo json_encode($response); exit();
            }
        
            $response = [
                "success" => true,
                "users"   => GetLast3MonthRegisteredFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_LAST6MONTHS_REGISTERED") {
            $db_array = parse_db_array_request();

            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }

            echo json_encode([
                "success" => true,
                "users" => GetLast6MonthsRegisteredFromDbArray($main_mysqli, $db_array)
            ]);
            exit();
        }else if ($tag == "GET_LASTYEAR_REGISTERED") {
            $db_array = parse_db_array_request();

            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }

            echo json_encode([
                "success" => true,
                "users" => GetLastYearRegisteredFromDbArray($main_mysqli, $db_array)
            ]);
            exit();
        }else if ($tag == "GET_CUSTOM_DATE_REGISTERED") {
            $db_array = parse_db_array_request();
            $fromDate = trim($_POST['from_date'] ?? '');
            $toDate = trim($_POST['to_date'] ?? '');

            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }

            if ($fromDate === '' || $toDate === '') {
                echo json_encode(["success" => false, "error_msg" => "from_date and to_date parameters are required"]); exit();
            }

            echo json_encode([
                "success" => true,
                "users" => GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $fromDate . ' 00:00:00', $toDate . ' 23:59:59', current_request_apps())
            ]);
            exit();
        }else if ($tag == "GET_REGISTERED_COUNTS") {
            $db_array = parse_db_array_request();

            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }

            echo json_encode([
                "success" => true,
                "counts" => GetRegisteredCountsFromDbArray($main_mysqli, $db_array)
            ]);
            exit();
        }else if ($tag == "GET_USER_BY_EMAIL") {
            $email    = trim($_POST['email'] ?? '');
            $db_array = parse_db_array_request();
        
            if ($email === '') {
                echo json_encode(["success" => false, "error_msg" => "(email) parameter is missing"]); exit();
            }
            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }
        
            $matches = GetUserByEmailFromDbArray($main_mysqli, $db_array, $email);
        
            echo json_encode([
                "success" => true,
                "email"   => $email,
                "count"   => count($matches),
                "results" => $matches
            ]);
            exit();
        }else if ($tag == "GET_TODAY_PURCHASED") {
            $db_array = parse_db_array_request();
            $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 100;
        
            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]);
                exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetTodayPurchasedFromDbArray($main_mysqli, $db_array, $limit),
            ];
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_YESTERDAY_PURCHASED") {
            $db_array = parse_db_array_request();
            $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 100;
        
            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]);
                exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetYesterdayPurchasedFromDbArray($main_mysqli, $db_array, $limit),
            ];
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_LAST7DAYS_PURCHASED") {
            $db_array = parse_db_array_request();
            $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 100;
        
            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]);
                exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetLast7DaysPurchasedFromDbArray($main_mysqli, $db_array, $limit),
            ];
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_USER_PURCHASE_BY_EMAIL") {
            $email    = trim($_POST['email'] ?? '');
            $db_array = parse_db_array_request();
        
            if ($email === '') {
                echo json_encode(["success" => false, "error_msg" => "(email) parameter is missing"]); exit();
            }
            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }
        
            $matches = GetUserPurchaseByEmailFromDbArray($main_mysqli, $db_array, $email);
        
            echo json_encode([
                "success" => true,
                "email"   => $email,
                "count"   => count($matches),
                "results" => $matches
            ]);
            exit();
        }else if ($tag == "GET_PURCHASE_COUNTS") {
            $db_array = parse_db_array_request();

            if (!$db_array) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }

            echo json_encode([
                "success" => true,
                "counts" => GetPurchasedCountsFromDbArray($main_mysqli, $db_array)
            ]);
            exit();
        }
       
    }
}
else
{
    header('HTTP/1.0 401 Unauthorized');
    $response["success"] = FALSE;
    $response["error_msg"] = "Access Denied";
    echo json_encode($response);
    Exit(); 
}



function GetTopUsersFromDbArray($main_mysqli, array $db_array, int $limit = 10) {
    $users = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);

        $sql = "
            SELECT
                email,
                GROUP_CONCAT(
                    DISTINCT COALESCE(NULLIF(TRIM(package), ''), ?) 
                    ORDER BY COALESCE(NULLIF(TRIM(package), ''), ?)
                    SEPARATOR ','
                ) AS packages,
                COUNT(*) AS transactions
            FROM fnd_purchase_tab
            WHERE email IS NOT NULL AND email <> ''
            GROUP BY email
        ";

        if ($stmt = $mysqli->prepare($sql)) {
            $stmt->bind_param('ss', $db, $db);
            if ($stmt->execute()) {
                $res = $stmt->get_result();
                while ($row = $res->fetch_assoc()) {
                    $email = trim($row['email']);
                    if ($email === '') continue;

                    if (!isset($users[$email])) {
                        $users[$email] = [
                            'packages'     => [],
                            'transactions' => 0
                        ];
                    }

                    $packages = array_filter(array_map('trim', explode(',', (string)($row['packages'] ?? ''))));
                    foreach ($packages as $pkg) {
                        $users[$email]['packages'][$pkg] = true;
                    }

                    $users[$email]['transactions'] += (int)($row['transactions'] ?? 0);
                }
                $res->free();
            }
            $stmt->close();
        }

        $mysqli->close();
    }

    // Flatten and sort
    $rows = [];
    foreach ($users as $email => $u) {
        $pkgs = array_keys($u['packages']);
        sort($pkgs, SORT_NATURAL);
        $rows[] = [
            'email'          => $email,
            'apps_purchased' => count($pkgs),
            'packages'       => implode(',', $pkgs),
            'transactions'   => $u['transactions'] ?? 0
        ];
    }

    usort($rows, function($a, $b) {
        if ($a['apps_purchased'] === $b['apps_purchased']) {
            return strcmp($a['email'], $b['email']);
        }
        return ($a['apps_purchased'] < $b['apps_purchased']) ? 1 : -1;
    });

    return ($limit > 0 && count($rows) > $limit)
        ? array_slice($rows, 0, $limit)
        : $rows;
}

function sl_day_bounds(DateTimeImmutable $day): array {
    $start = $day->setTime(0, 0, 0);
    $end = $day->setTime(23, 59, 59);
    return [$start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s')];
}

function registered_range_to_bounds(string $period): array {
    $tz = new DateTimeZone('Asia/Colombo');
    $now = new DateTimeImmutable('now', $tz);
    $todayStart = $now->setTime(0, 0, 0);

    switch ($period) {
        case 'today':
            return sl_day_bounds($todayStart);
        case 'yesterday':
            return sl_day_bounds($todayStart->modify('-1 day'));
        case 'last7days':
            return [$todayStart->modify('-6 days')->format('Y-m-d H:i:s'), $todayStart->setTime(23, 59, 59)->format('Y-m-d H:i:s')];
        case 'this_month':
            $monthStart = $todayStart->modify('first day of this month');
            return [$monthStart->format('Y-m-d 00:00:00'), $monthStart->modify('last day of this month')->format('Y-m-d 23:59:59')];
        case 'last_month':
            $monthStart = $todayStart->modify('first day of last month');
            return [$monthStart->format('Y-m-d 00:00:00'), $monthStart->modify('last day of this month')->format('Y-m-d 23:59:59')];
        case 'last3months':
            return [sl_day_bounds($todayStart->modify('-3 months'))[0], sl_day_bounds($todayStart)[1]];
        case 'last6months':
            return [sl_day_bounds($todayStart->modify('-6 months'))[0], sl_day_bounds($todayStart)[1]];
        case 'last_year':
            return [sl_day_bounds($todayStart->modify('-1 year'))[0], sl_day_bounds($todayStart)[1]];
        default:
            return sl_day_bounds($todayStart);
    }
}

function registered_table_for_app(array $app = []): string {
    $platform = strtolower(trim((string)($app['os'] ?? '')));
    if (strpos($platform, 'ios') !== false || strpos($platform, 'apple') !== false) {
        return 'fnd_ios_registration_tab';
    }

    return 'fnd_registration_tab';
}

function app_metadata_by_db(array $apps = []): array {
    $byDb = [];
    foreach ($apps as $app) {
        if (!is_array($app)) {
            continue;
        }

        $db = trim((string)($app['db_name'] ?? ''));
        if ($db !== '') {
            $byDb[$db] = $app;
        }
    }

    return $byDb;
}

function current_request_apps(): array {
    return is_array($_POST['apps'] ?? null) ? $_POST['apps'] : [];
}

function table_columns(mysqli $mysqli, string $table): array {
    $columns = [];
    $result = @$mysqli->query("SHOW COLUMNS FROM {$table}");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $field = (string)($row['Field'] ?? '');
            if ($field !== '') {
                $columns[$field] = true;
            }
        }
        $result->free();
    }

    return $columns;
}

function registered_select_parts(mysqli $mysqli, string $table): array {
    $columns = table_columns($mysqli, $table);
    if (!isset($columns['registered_date'])) {
        return ['select' => '', 'has_registered_date' => false];
    }

    $fields = [
        'email',
        'registered_date',
        'device',
        'premium',
        'ads_free',
        'referral_premium',
        'installer',
        'valid',
        'version',
        'last_online',
        'curr_version',
        'language',
        'ss_enabled',
        'chat_enabled',
    ];

    $select = [];
    foreach ($fields as $field) {
        $select[] = isset($columns[$field]) ? $field : "NULL AS {$field}";
    }

    return [
        'select' => implode(",\n            ", $select),
        'has_registered_date' => true,
    ];
}

function GetRegisteredUsersByRange(mysqli $mysqli, string $appDb, string $fromDateTime, string $toDateTime, string $table = 'fnd_registration_tab'): array {
    $table = $table === 'fnd_ios_registration_tab' ? 'fnd_ios_registration_tab' : 'fnd_registration_tab';
    $selectParts = registered_select_parts($mysqli, $table);
    if (!$selectParts['has_registered_date']) {
        return [];
    }

    $selectClause = $selectParts['select'];
    $sql = "
        SELECT
            {$selectClause}
        FROM {$table}
        WHERE registered_date BETWEEN ? AND ?
        ORDER BY registered_date DESC
    ";

    $rows = [];
    if ($stmt = @$mysqli->prepare($sql)) {
        $stmt->bind_param('ss', $fromDateTime, $toDateTime);
        if ($stmt->execute()) {
            $res = $stmt->get_result();
            while ($r = $res->fetch_assoc()) {
                $r['app_db'] = $appDb;
                $r['registration_table'] = $table;
                $rows[] = $r;
            }
            $res->free();
        }
        $stmt->close();
    }

    return $rows;
}

function GetRegisteredFromDbArrayByRange($main_mysqli, array $db_array, string $fromDateTime, string $toDateTime, array $apps = []): array {
    $all = [];
    $appsByDb = app_metadata_by_db($apps);

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows = GetRegisteredUsersByRange($mysqli, $db, $fromDateTime, $toDateTime, registered_table_for_app($appsByDb[$db] ?? []));
        if (!empty($rows)) {
            $all = array_merge($all, $rows);
        }
        $mysqli->close();
    }

    sort_rows_by_key_desc($all, 'registered_date');
    return $all;
}

function GetTodayRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $bounds = registered_range_to_bounds('today');
    return GetRegisteredUsersByRange($mysqli, $appDb, $bounds[0], $bounds[1]);
}

function GetTodayRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $bounds = registered_range_to_bounds('today');
    return GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $bounds[0], $bounds[1], current_request_apps());
}

function GetYesterdayRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $bounds = registered_range_to_bounds('yesterday');
    return GetRegisteredUsersByRange($mysqli, $appDb, $bounds[0], $bounds[1]);
}

function GetYesterdayRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $bounds = registered_range_to_bounds('yesterday');
    return GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $bounds[0], $bounds[1], current_request_apps());
}

function GetLast7DaysRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $bounds = registered_range_to_bounds('last7days');
    return GetRegisteredUsersByRange($mysqli, $appDb, $bounds[0], $bounds[1]);
}

function GetLast7DaysRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $bounds = registered_range_to_bounds('last7days');
    return GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $bounds[0], $bounds[1], current_request_apps());
}

//CURRENT MONTH
function GetCurrentMonthRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $bounds = registered_range_to_bounds('this_month');
    return GetRegisteredUsersByRange($mysqli, $appDb, $bounds[0], $bounds[1]);
}

function GetCurrentMonthRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $bounds = registered_range_to_bounds('this_month');
    return GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $bounds[0], $bounds[1], current_request_apps());
}

//LAST MONTH
function GetLastMonthRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $bounds = registered_range_to_bounds('last_month');
    return GetRegisteredUsersByRange($mysqli, $appDb, $bounds[0], $bounds[1]);
}

function GetLastMonthRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $bounds = registered_range_to_bounds('last_month');
    return GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $bounds[0], $bounds[1], current_request_apps());
}

//LAST 3 MONTH
function GetLast3MonthRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $bounds = registered_range_to_bounds('last3months');
    return GetRegisteredUsersByRange($mysqli, $appDb, $bounds[0], $bounds[1]);
}

function GetLast3MonthRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $bounds = registered_range_to_bounds('last3months');
    return GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $bounds[0], $bounds[1], current_request_apps());
}

function GetLast6MonthsRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $bounds = registered_range_to_bounds('last6months');
    return GetRegisteredUsersByRange($mysqli, $appDb, $bounds[0], $bounds[1]);
}

function GetLast6MonthsRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $bounds = registered_range_to_bounds('last6months');
    return GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $bounds[0], $bounds[1], current_request_apps());
}

function GetLastYearRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $bounds = registered_range_to_bounds('last_year');
    return GetRegisteredUsersByRange($mysqli, $appDb, $bounds[0], $bounds[1]);
}

function GetLastYearRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $bounds = registered_range_to_bounds('last_year');
    return GetRegisteredFromDbArrayByRange($main_mysqli, $db_array, $bounds[0], $bounds[1], current_request_apps());
}




function GetUserByEmailFromDbArray($main_mysqli, array $db_array, string $email): array {
    $matches = [];

    foreach ($db_array as $db) {
        $mysqli  = SwapDatabase($main_mysqli, $db);
        $rows    = GetUserDetailsByEmail($mysqli, $email, $db);
        if (!empty($rows)) {
            $purchaseCount = GetPurchaseCountForEmail($mysqli, $email);
            $hasPurchase = $purchaseCount > 0;

            foreach ($rows as &$row) {
                $row['purchase_premium'] = $hasPurchase;
                $row['purchase_package'] = '';
                $row['purchase_count'] = $purchaseCount;
            }
            unset($row);
            // Usually 0 or 1 row per DB, but we merge anyway
            $matches = array_merge($matches, $rows);
        }
        $mysqli->close();
    }

    // newest registrations first (in case user exists in multiple DBs)
    usort($matches, function($a, $b) {
        return strcmp(($b['registered_date'] ?? ''), ($a['registered_date'] ?? ''));
    });

    return $matches;
}

function GetRegisteredTodayCountFromDbArray($main_mysqli, array $db_array): int {
    $bounds = registered_range_to_bounds('today');
    $count = 0;
    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $count += count_rows_between($mysqli, 'fnd_registration_tab', 'registered_date', $bounds[0], $bounds[1]);
        $mysqli->close();
    }
    return $count;
}

function GetRegisteredCountsFromDbArray($main_mysqli, array $db_array): array {
    $ranges = [
        'today' => registered_range_to_bounds('today'),
        'yesterday' => registered_range_to_bounds('yesterday'),
        'last7days' => registered_range_to_bounds('last7days'),
        'this_month' => registered_range_to_bounds('this_month'),
        'last_month' => registered_range_to_bounds('last_month'),
        'last3months' => registered_range_to_bounds('last3months'),
        'last6months' => registered_range_to_bounds('last6months'),
        'last_year' => registered_range_to_bounds('last_year'),
    ];

    $totals = array_fill_keys(array_keys($ranges), 0);

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);

        $parts = [];
        foreach ($ranges as $key => [$from, $to]) {
            $from = $mysqli->real_escape_string($from);
            $to = $mysqli->real_escape_string($to);
            $parts[] = "SUM(CASE WHEN registered_date BETWEEN '{$from}' AND '{$to}' THEN 1 ELSE 0 END) AS {$key}";
        }

        $sql = "SELECT " . implode(", ", $parts) . " FROM fnd_registration_tab";
        $result = $mysqli->query($sql);
        if ($result && ($row = $result->fetch_assoc())) {
            foreach ($totals as $key => $value) {
                $totals[$key] += (int)($row[$key] ?? 0);
            }
            $result->free();
        }

        $mysqli->close();
    }

    return $totals;
}

function GetPurchaseCountForEmail(mysqli $mysqli, string $email): int {
    $email = trim($email);
    if ($email === '') {
        return 0;
    }

    $stmt = $mysqli->prepare('SELECT COUNT(*) AS total FROM fnd_purchase_tab WHERE email = ?');
    if (!$stmt) {
        return 0;
    }

    $stmt->bind_param('s', $email);
    if (!$stmt->execute()) {
        $stmt->close();
        return 0;
    }

    $result = $stmt->get_result();
    $count = 0;
    if ($result) {
        $row = $result->fetch_assoc();
        $count = (int)($row['total'] ?? 0);
        $result->free();
    }
    $stmt->close();

    return $count;
}

function GetUserDetailsByEmail(mysqli $mysqli, string $email, string $appDb): array {
    // exactly the fields you asked for
    $cols = "email, country,
             registered_date, device, premium, ads_free,
             referral_premium, installer, valid, version, last_online,
             curr_version, language, ss_enabled, chat_enabled";

    $sql = "SELECT $cols
            FROM fnd_registration_tab
            WHERE email = ?
            ORDER BY id DESC
            LIMIT 1";

    $out = [];

    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $row['app_db'] = $appDb;   // tell which DB this came from
            $out[] = $row;
        }
        $stmt->close();
    }
    return $out;
}

function UpdateUserFlags($mysqli, $email, $premium, $ads_free, $ss_enabled, $chat_enabled) {
    // basic email check
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Invalid email'];
    }

    // normalize truthy values to tinyint 0/1
    $premium      = (int) !!$premium;
    $ads_free     = (int) !!$ads_free;
    $ss_enabled   = (int) !!$ss_enabled;
    $chat_enabled = (int) !!$chat_enabled;

    // Update statement (adjust table/column names if yours differ)
    $sql = "UPDATE fnd_registration_tab
            SET premium = ?, 
                ads_free = ?, 
                ss_enabled = ?, 
                chat_enabled = ?
            WHERE email = ?";

    if (!$stmt = $mysqli->prepare($sql)) {
        return ['ok' => false, 'error' => 'Prepare failed: '.$mysqli->error];
    }

    // 4 ints + 1 string
    if (!$stmt->bind_param("iiiis", $premium, $ads_free, $ss_enabled, $chat_enabled, $email)) {
        $err = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['ok' => false, 'error' => 'Bind failed: '.$err];
    }

    if (!$stmt->execute()) {
        $err = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['ok' => false, 'error' => 'Execute failed: '.$err];
    }

    $affected = $stmt->affected_rows; // 0 means no change or no matching row
    $stmt->close();

    return true;
}

function GetTodayPurchased(mysqli $mysqli, string $appDb): array {
    $rows = [];

    $bounds = registered_range_to_bounds('today');
    $sql = "
        SELECT
            email, sku, package, order_id,
            os, device, purchased_date, app_version
        FROM fnd_purchase_tab
        WHERE purchased_date BETWEEN ? AND ?
        ORDER BY purchased_date DESC
    ";

    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('ss', $bounds[0], $bounds[1]);
        if ($stmt->execute()) {
            $res = $stmt->get_result();
            while ($r = $res->fetch_assoc()) {
                $r['app_db'] = $appDb; // tag record with app/db
                $rows[] = $r;
            }
            $res->free();
        }
        $stmt->close();
    }
    return $rows;
}

function GetTodayPurchasedFromDbArray(mysqli $main_mysqli, array $db_array, int $limit = 100): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetTodayPurchased($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // newest first across all apps
    usort($all, function($a, $b) {
        return strcmp($b['purchased_date'], $a['purchased_date']);
    });

    return $limit > 0 ? array_slice($all, 0, $limit) : $all;
}

function GetYesterdayPurchased(mysqli $mysqli, string $appDb): array {
    $rows = [];

    $bounds = registered_range_to_bounds('yesterday');
    $sql = "
        SELECT
            email, sku, package, order_id,
            os, device, purchased_date, app_version
        FROM fnd_purchase_tab
        WHERE purchased_date BETWEEN ? AND ?
        ORDER BY purchased_date DESC
    ";

    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('ss', $bounds[0], $bounds[1]);
        if ($stmt->execute()) {
            $res = $stmt->get_result();
            while ($r = $res->fetch_assoc()) {
                $r['app_db'] = $appDb; // tag record with app/db
                $rows[] = $r;
            }
            $res->free();
        }
        $stmt->close();
    }
    return $rows;
}

function GetYesterdayPurchasedFromDbArray(mysqli $main_mysqli, array $db_array, int $limit = 100): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetYesterdayPurchased($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // newest first across all apps
    usort($all, function($a, $b) {
        return strcmp($b['purchased_date'], $a['purchased_date']);
    });

    return $limit > 0 ? array_slice($all, 0, $limit) : $all;
}

function GetLast7DaysPurchased(mysqli $mysqli, string $appDb): array {
    $rows = [];

    $bounds = registered_range_to_bounds('last7days');
    $sql = "
        SELECT
            email, sku, package, order_id,
            os, device, purchased_date, app_version
        FROM fnd_purchase_tab
        WHERE purchased_date BETWEEN ? AND ?
        ORDER BY purchased_date DESC
    ";

    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('ss', $bounds[0], $bounds[1]);
        if ($stmt->execute()) {
            $res = $stmt->get_result();
            while ($r = $res->fetch_assoc()) {
                $r['app_db'] = $appDb; // tag record with app/db
                $rows[] = $r;
            }
            $res->free();
        }
        $stmt->close();
    }
    return $rows;
}

function GetLast7DaysPurchasedFromDbArray(mysqli $main_mysqli, array $db_array, int $limit = 100): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetLast7DaysPurchased($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // newest first across all apps
    usort($all, function($a, $b) {
        return strcmp($b['purchased_date'], $a['purchased_date']);
    });

    return $limit > 0 ? array_slice($all, 0, $limit) : $all;
}

function GetUserPurchaseByEmailFromDbArray($main_mysqli, array $db_array, string $email): array {
    $matches = [];

    foreach ($db_array as $db) {
        $mysqli  = SwapDatabase($main_mysqli, $db);
        $rows    = GetUserPurchaseDetailsByEmail($mysqli, $email, $db);
        if (!empty($rows)) {
            // Usually 0 or 1 row per DB, but we merge anyway
            $matches = array_merge($matches, $rows);
        }
        $mysqli->close();
    }

    // newest registrations first (in case user exists in multiple DBs)
    usort($matches, function($a, $b) {
        return strcmp(($b['purchased_date'] ?? ''), ($a['purchased_date'] ?? ''));
    });

    return $matches;
}

function GetUserPurchaseDetailsByEmail(mysqli $mysqli, string $email, string $appDb): array {
    // exactly the fields you asked for
    $cols = "email, sku, package, order_id,
            os, device, purchased_date, app_version";

    $sql = "SELECT $cols
            FROM fnd_purchase_tab
            WHERE email = ?
            ORDER BY id DESC
            LIMIT 1";

    $out = [];

    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $row['app_db'] = $appDb;   // tell which DB this came from
            $out[] = $row;
        }
        $stmt->close();
    }
    return $out;
}

function GetPurchasedCountsFromDbArray($main_mysqli, array $db_array): array {
    $ranges = [
        'today' => registered_range_to_bounds('today'),
        'yesterday' => registered_range_to_bounds('yesterday'),
        'last7days' => registered_range_to_bounds('last7days'),
    ];

    $totals = [
        'today' => 0,
        'yesterday' => 0,
        'last7days' => 0,
    ];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);

        foreach ($ranges as $key => [$from, $to]) {
            $sql = "SELECT COUNT(*) AS total FROM fnd_purchase_tab WHERE purchased_date BETWEEN ? AND ?";

            if ($stmt = $mysqli->prepare($sql)) {
                $stmt->bind_param('ss', $from, $to);
                if ($stmt->execute()) {
                    $result = get_result($stmt);
                    if ($result != null) {
                        $totals[$key] += (int)($result[0]['total'] ?? 0);
                    }
                }
                $stmt->close();
            }
        }

        $mysqli->close();
    }

    return [
        'today' => $totals['today'],
        'yesterday' => $totals['yesterday'],
        'last7days' => $totals['last7days'],
    ];
}
// function GetUserByEmail($mysqli,$email) {
 
//     $prep_stmt = "SELECT email,country,registered_date,device,premium as db_premium,ads_free,installer,valid,version as os_version,last_online,curr_version as app_version,referral_code,referrer,language,ss_enabled FROM fnd_registration_tab WHERE email=? ";
//     $stmt = $mysqli->prepare($prep_stmt);
//       if ($stmt) {
//         $stmt->bind_param('s', $email);
//         if ($stmt->execute()) {
//             $lst = get_result($stmt);
//             $stmt->close();
//             return $lst;
//         } else {
            
//             return false;
//         }
//     } else {
//         return false;
//     }
// };

function GetRegistered($mysqli,$fromday,$noofDays) {
    $to=$fromday+$noofDays;
    $bind=false;
   $prep_stmt = "SELECT email,country,registered_date FROM fnd_registration_tab WHERE";
    if($fromday==0 && $noofDays==0){
       $where= " DATE(registered_date) = CURDATE()";    
    }else if($fromday==1 && $noofDays==0){
       $where= " DATE(registered_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"; 
    }else if($fromday==0 && $noofDays==7){
       $where= " DATE(registered_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE()";    
    }else if($fromday==0 && $noofDays==28){
       $where= " DATE(registered_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND CURDATE()";    
    }else{
       $where= " DATE(registered_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_SUB(CURDATE(), INTERVAL ? DAY) ";
       $bind=true;
    }
    $prep_stmt=$prep_stmt.$where. " ORDER BY registered_date DESC";
    
    $stmt = $mysqli->prepare($prep_stmt);
      if ($stmt) {
        if($bind){
        $stmt->bind_param('ii', $to,$fromday);
        }
        if ($stmt->execute()) {
            $lst = get_result($stmt);
            $stmt->close();
            return $lst;
        } else {
            
            return false;
        }
    } else {
        return false;
    }
};

function GetNRegistered($mysqli,$fromday,$noofDays) {
    $to=$fromday+$noofDays;
    $bind=false;
   $prep_stmt = "SELECT count(*) count FROM fnd_registration_tab WHERE";
    if($fromday==0 && $noofDays==0){
       $where= " DATE(registered_date) = CURDATE() ";    
    }else if($fromday==1 && $noofDays==0){
       $where= " DATE(registered_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) "; 
    }else if($fromday==0 && $noofDays==7){
       $where= " DATE(registered_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE() ";    
    }else if($fromday==0 && $noofDays==28){
       $where= " DATE(registered_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND CURDATE() ";    
    }else{
       $where= " DATE(registered_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_SUB(CURDATE(), INTERVAL ? DAY) ";
       $bind=true;
    }
    $prep_stmt=$prep_stmt.$where;
    
    $stmt = $mysqli->prepare($prep_stmt);
    if ($stmt) {
        if($bind){
        $stmt->bind_param('ii', $to,$fromday);
        }
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
               return $result[0]["count"];
            } else {
                return -1;
            }
        } else {
            return -1;
        }
    } else {
        return -1;
    }
};

// function GetActive($mysqli,$fromday,$noofDays) {
//     $to=$fromday+$noofDays;
//     $bind=false;
//   $prep_stmt = "SELECT email,country,last_online,registered_date FROM fnd_registration_tab WHERE";
//     if($fromday==0 && $noofDays==0){
//       $where= " DATE(last_online) = CURDATE()";    
//     }else if($fromday==1 && $noofDays==0){
//       $where= " DATE(last_online) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"; 
//     }else if($fromday==0 && $noofDays==7){
//       $where= " DATE(last_online) BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE()";    
//     }else if($fromday==0 && $noofDays==28){
//       $where= " DATE(last_online) BETWEEN DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND CURDATE()";    
//     }else{
//       $where= " DATE(last_online) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_SUB(CURDATE(), INTERVAL ? DAY) ";
//       $bind=true;
//     }
//     $prep_stmt=$prep_stmt.$where. " ORDER BY last_online DESC";
    
//     $stmt = $mysqli->prepare($prep_stmt);
//       if ($stmt) {
//         if($bind){
//         $stmt->bind_param('ii',$to. $fromday);
//         }
//         if ($stmt->execute()) {
//             $lst = get_result($stmt);
//             $stmt->close();
//             return $lst;
//         } else {
            
//             return false;
//         }
//     } else {
//         return false;
//     }
// };

function GetNActive($mysqli,$fromday,$noofDays) {
    $to=$fromday+$noofDays;
    $bind=false;
   $prep_stmt = "SELECT COUNT(DISTINCT email)  count FROM fnd_app_access_tab WHERE ";//"SELECT count(*) count FROM fnd_registration_tab WHERE";
    if($fromday==0 && $noofDays==0){
       $where= " DATE(accessed_time) = CURDATE() ";    
    }else if($fromday==1 && $noofDays==0){
       $where= " DATE(accessed_time) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) "; 
    }else if($fromday==0 && $noofDays==7){
       $where= " DATE(accessed_time) BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE() ";    
    }else if($fromday==0 && $noofDays==28){
       $where= " DATE(accessed_time) BETWEEN DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND CURDATE() ";    
    }else{
       $where= " DATE(accessed_time) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_SUB(CURDATE(), INTERVAL ? DAY) ";
       $bind=true;
    }
    $prep_stmt=$prep_stmt.$where;
    
    $stmt = $mysqli->prepare($prep_stmt);
    if ($stmt) {
        if($bind){
        $stmt->bind_param('ii', $to,$fromday);
        }
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
               return $result[0]["count"];
            } else {
                return -1;
            }
        } else {
            return -1;
        }
    } else {
        return -1;
    }
};

function GetNPurchase($mysqli,$fromday,$noofDays) {
    $to=$fromday+$noofDays;
    $bind=false;
   $prep_stmt = "SELECT COUNT(DISTINCT email)  count FROM fnd_purchase_tab WHERE ";//"SELECT count(*) count FROM fnd_registration_tab WHERE";
    if($fromday==0 && $noofDays==0){
       $where= " DATE(purchased_date) = CURDATE() ";    
    }else if($fromday==1 && $noofDays==0){
       $where= " DATE(purchased_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) "; 
    }else if($fromday==0 && $noofDays==7){
       $where= " DATE(purchased_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE() ";    
    }else if($fromday==0 && $noofDays==28){
       $where= " DATE(purchased_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND CURDATE() ";    
    }else{
       $where= " DATE(purchased_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_SUB(CURDATE(), INTERVAL ? DAY) ";
       $bind=true;
    }
    $prep_stmt=$prep_stmt.$where;
    
    $stmt = $mysqli->prepare($prep_stmt);
    if ($stmt) {
        if($bind){
        $stmt->bind_param('ii', $to,$fromday);
        }
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
               return $result[0]["count"];
            } else {
                return -1;
            }
        } else {
            return -1;
        }
    } else {
        return -1;
    }
};


function GetLastInstalledTime($mysqli) {
 
    $prep_stmt = "SELECT registered_date FROM fnd_registration_tab  order by registered_date desc LIMIT 1";
    $stmt = $mysqli->prepare($prep_stmt);
    if ($stmt) {
        //$stmt->bind_param('s', $value);
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
               return $result[0]["registered_date"];
            } else {
                return -1;
            }
        } else {
            return -1;
        }
    } else {
        return -1;
    }
};

function GetLastInstalledInfo($mysqli)  {
 
    $prep_stmt = "SELECT email,country,device,registered_date,TIMEDIFF(NOW(), registered_date) AS time_difference,TIMESTAMPDIFF(MINUTE, registered_date, NOW()) AS minutes_ago FROM fnd_registration_tab  order by registered_date desc LIMIT 1";
    $stmt = $mysqli->prepare($prep_stmt);
      if ($stmt) {
       // $stmt->bind_param('s', $email);
        if ($stmt->execute()) {
            $lst = get_result($stmt);
            $stmt->close();
            return $lst;
        } else {
            
            return false;
        }
    } else {
        return false;
    }
};

function GetMyReferals($mysqli,$email) {
    
    $referral_code=GetReferalCode($mysqli,$email);
 
    $prep_stmt = "SELECT email,country,registered_date,device,premium as db_premium,ads_free,installer,valid,version as os_version,last_online,curr_version as app_version,referral_code,referrer,language,ss_enabled FROM fnd_registration_tab WHERE referrer=? order by registered_date desc";
   //   $prep_stmt = "SELECT email,country,registered_date,device FROM registration_tab WHERE referrer=? order by registered_date desc";
    $stmt = $mysqli->prepare($prep_stmt);
      if ($stmt) {
        $stmt->bind_param('s', $referral_code);
        if ($stmt->execute()) {
            $lst = get_result($stmt);
            $stmt->close();
            return $lst;
        } else {
            
            return false;
        }
    } else {
        return false;
    }
};

function GetReferalCode($mysqli,$email) {
    $prep_stmt = "SELECT referral_code FROM fnd_registration_tab where email=?";
   //$prep_stmt = "SELECT referral_code FROM registration_tab where email=?";
    $stmt = $mysqli->prepare($prep_stmt);
    if ($stmt) {
              $stmt->bind_param('s', $email);
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
               return $result[0]["referral_code"];
            } else {
                return "";
            }
        } else {
            return "";
        }
    } else {
        return "";
    }
};

?>
