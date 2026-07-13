<?php
if (true) {
    if($_POST['db']!=0){
        
        
    }else{
        if ($tag == "GET_TODAY_REGISTERED") {
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
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
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
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
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
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
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
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
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
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
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
                $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
                echo json_encode($response); exit();
            }
        
            $response = [
                "success" => true,
                "users"   => GetLast3MonthRegisteredFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_USER_BY_EMAIL") {
            $email    = trim($_POST['email'] ?? '');
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if ($email === '') {
                echo json_encode(["success" => false, "error_msg" => "(email) parameter is missing"]); exit();
            }
            if (!$db_array || !is_array($db_array)) {
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
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]);
                exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetTodayPurchasedFromDbArray($main_mysqli, $db_array),
            ];
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_USER_PURCHASE_BY_EMAIL") {
            $email    = trim($_POST['email'] ?? '');
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if ($email === '') {
                echo json_encode(["success" => false, "error_msg" => "(email) parameter is missing"]); exit();
            }
            if (!$db_array || !is_array($db_array)) {
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
        }else if ($tag == "GET_LAST30DAYS_REGISTERED") {
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }
        
            echo json_encode([
                "success" => true,
                "users" => GetLast30DaysRegisteredFromDbArray($main_mysqli, $db_array)
            ]);
            exit();
        
        }else if ($tag == "GET_CUSTOM_DATE_REGISTERED") {
                $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
                $from_date = trim($_POST['from_date'] ?? '');
                $to_date = trim($_POST['to_date'] ?? '');
            
                if (!$db_array || !is_array($db_array)) {
                    echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
                }
            
                if ($from_date === '' || $to_date === '') {
                    echo json_encode(["success" => false, "error_msg" => "from_date and to_date parameters are required"]); exit();
                }
            
                echo json_encode([
                    "success" => true,
                    "users" => GetCustomDateRegisteredFromDbArray($main_mysqli, $db_array, $from_date, $to_date)
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



//TODAY
function GetTodayRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $rows = [];

    // All requested fields
    $sql = "
        SELECT
             email,
            registered_date, device, premium, ads_free,
            referral_premium, installer, valid, version, last_online,
            curr_version, language, ss_enabled, chat_enabled
        FROM fnd_registration_tab
        WHERE registered_date BETWEEN CONCAT(CURDATE(), ' 00:00:00')
                                  AND CONCAT(CURDATE(), ' 23:59:59')
        ORDER BY registered_date DESC
    ";

    if ($res = $mysqli->query($sql)) {
        while ($r = $res->fetch_assoc()) {
            // tag with the db(app) name
            $r['app_db'] = $appDb;
            $rows[] = $r;
        }
        $res->free();
    }
    return $rows;
}

function GetTodayRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetTodayRegisteredUsers($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // sort combined list (newest first)
    usort($all, function($a, $b) {
        return strcmp($b['registered_date'], $a['registered_date']);
    });

    return $all;
}

//YESTERDAY
function GetYesterdayRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $rows = [];

    // All requested fields
    $sql = "
        SELECT
             email,
            registered_date, device, premium, ads_free,
            referral_premium, installer, valid, version, last_online,
            curr_version, language, ss_enabled, chat_enabled
        FROM fnd_registration_tab
        WHERE registered_date BETWEEN CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 00:00:00')
                              AND CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 23:59:59')
        ORDER BY registered_date DESC
    ";

    if ($res = $mysqli->query($sql)) {
        while ($r = $res->fetch_assoc()) {
            // tag with the db(app) name
            $r['app_db'] = $appDb;
            $rows[] = $r;
        }
        $res->free();
    }
    return $rows;
}

function GetYesterdayRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetYesterdayRegisteredUsers($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // sort combined list (newest first)
    usort($all, function($a, $b) {
        return strcmp($b['registered_date'], $a['registered_date']);
    });

    return $all;
}

//LAST 7 DAYS
function GetLast7DaysRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $rows = [];

    // All requested fields
    $sql = "
        SELECT
             email,
            registered_date, device, premium, ads_free,
            referral_premium, installer, valid, version, last_online,
            curr_version, language, ss_enabled, chat_enabled
        FROM fnd_registration_tab
        WHERE registered_date BETWEEN CONCAT(DATE_SUB(CURDATE(), INTERVAL 6 DAY), ' 00:00:00')
                                AND CONCAT(CURDATE(), ' 23:59:59')
        ORDER BY registered_date DESC
    ";

    if ($res = $mysqli->query($sql)) {
        while ($r = $res->fetch_assoc()) {
            // tag with the db(app) name
            $r['app_db'] = $appDb;
            $rows[] = $r;
        }
        $res->free();
    }
    return $rows;
}

function GetLast7DaysRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetLast7DaysRegisteredUsers($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // sort combined list (newest first)
    usort($all, function($a, $b) {
        return strcmp($b['registered_date'], $a['registered_date']);
    });

    return $all;
}

//CURRENT MONTH
function GetCurrentMonthRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $rows = [];

    // All requested fields
    $sql = "
        SELECT
             email,
            registered_date, device, premium, ads_free,
            referral_premium, installer, valid, version, last_online,
            curr_version, language, ss_enabled, chat_enabled
        FROM fnd_registration_tab
        WHERE registered_date BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01')
                              AND LAST_DAY(CURDATE()) + INTERVAL 1 DAY - INTERVAL 1 SECOND
        ORDER BY registered_date DESC
    ";

    if ($res = $mysqli->query($sql)) {
        while ($r = $res->fetch_assoc()) {
            // tag with the db(app) name
            $r['app_db'] = $appDb;
            $rows[] = $r;
        }
        $res->free();
    }
    return $rows;
}

function GetCurrentMonthRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetCurrentMonthRegisteredUsers($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // sort combined list (newest first)
    usort($all, function($a, $b) {
        return strcmp($b['registered_date'], $a['registered_date']);
    });

    return $all;
}

//LAST MONTH
function GetLastMonthRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $rows = [];

    // All requested fields
    $sql = "
        SELECT
             email,
            registered_date, device, premium, ads_free,
            referral_premium, installer, valid, version, last_online,
            curr_version, language, ss_enabled, chat_enabled
        FROM fnd_registration_tab
        WHERE registered_date BETWEEN DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
                          AND LAST_DAY(CURDATE() - INTERVAL 1 MONTH) + INTERVAL 1 DAY - INTERVAL 1 SECOND
        ORDER BY registered_date DESC
    ";

    if ($res = $mysqli->query($sql)) {
        while ($r = $res->fetch_assoc()) {
            // tag with the db(app) name
            $r['app_db'] = $appDb;
            $rows[] = $r;
        }
        $res->free();
    }
    return $rows;
}

function GetLastMonthRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetLastMonthRegisteredUsers($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // sort combined list (newest first)
    usort($all, function($a, $b) {
        return strcmp($b['registered_date'], $a['registered_date']);
    });

    return $all;
}

//LAST 3 MONTH
function GetLast3MonthRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $rows = [];

    // All requested fields
    $sql = "
        SELECT
             email,
            registered_date, device, premium, ads_free,
            referral_premium, installer, valid, version, last_online,
            curr_version, language, ss_enabled, chat_enabled
        FROM fnd_registration_tab
       WHERE registered_date BETWEEN DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01')
                              AND LAST_DAY(CURDATE()) + INTERVAL 1 DAY - INTERVAL 1 SECOND
        ORDER BY registered_date DESC
    ";

    if ($res = $mysqli->query($sql)) {
        while ($r = $res->fetch_assoc()) {
            // tag with the db(app) name
            $r['app_db'] = $appDb;
            $rows[] = $r;
        }
        $res->free();
    }
    return $rows;
}

function GetLast3MonthRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows   = GetLast3MonthRegisteredUsers($mysqli, $db);
        $all    = array_merge($all, $rows);
        $mysqli->close();
    }

    // sort combined list (newest first)
    usort($all, function($a, $b) {
        return strcmp($b['registered_date'], $a['registered_date']);
    });

    return $all;
}

// LAST 30 DAYS
function GetLast30DaysRegisteredUsers(mysqli $mysqli, string $appDb): array {
    $rows = [];

    $sql = "
        SELECT
            email,
            registered_date, device, premium, ads_free,
            referral_premium, installer, valid, version, last_online,
            curr_version, language, ss_enabled, chat_enabled
        FROM fnd_registration_tab
        WHERE registered_date BETWEEN CONCAT(DATE_SUB(CURDATE(), INTERVAL 29 DAY), ' 00:00:00')
                                  AND CONCAT(CURDATE(), ' 23:59:59')
        ORDER BY registered_date DESC
    ";

    if ($res = $mysqli->query($sql)) {
        while ($r = $res->fetch_assoc()) {
            $r['app_db'] = $appDb;
            $rows[] = $r;
        }
        $res->free();
    }

    return $rows;
}

function GetLast30DaysRegisteredFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows = GetLast30DaysRegisteredUsers($mysqli, $db);
        $all = array_merge($all, $rows);
        $mysqli->close();
    }

    usort($all, function($a, $b) {
        return strcmp($b['registered_date'], $a['registered_date']);
    });

    return $all;
}


// CUSTOM DATE RANGE
function GetCustomDateRegisteredUsers(mysqli $mysqli, string $appDb, string $fromDate, string $toDate): array {
    $rows = [];

    $sql = "
        SELECT
            email,
            registered_date, device, premium, ads_free,
            referral_premium, installer, valid, version, last_online,
            curr_version, language, ss_enabled, chat_enabled
        FROM fnd_registration_tab
        WHERE registered_date BETWEEN ? AND ?
        ORDER BY registered_date DESC
    ";

    $fromDateTime = $fromDate . " 00:00:00";
    $toDateTime = $toDate . " 23:59:59";

    if ($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param("ss", $fromDateTime, $toDateTime);
        $stmt->execute();

        $res = $stmt->get_result();

        while ($r = $res->fetch_assoc()) {
            $r['app_db'] = $appDb;
            $rows[] = $r;
        }

        $stmt->close();
    }

    return $rows;
}

function GetCustomDateRegisteredFromDbArray($main_mysqli, array $db_array, string $fromDate, string $toDate): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $rows = GetCustomDateRegisteredUsers($mysqli, $db, $fromDate, $toDate);
        $all = array_merge($all, $rows);
        $mysqli->close();
    }

    usort($all, function($a, $b) {
        return strcmp($b['registered_date'], $a['registered_date']);
    });

    return $all;
}
?>