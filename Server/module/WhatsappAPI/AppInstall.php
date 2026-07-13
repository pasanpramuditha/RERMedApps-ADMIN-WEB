<?php
// if (true) {
    
//         if ($tag == "GET_TODAY_REGISTERED") {
//             $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
//             if (!$db_array || !is_array($db_array)) {
//                 $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
//                 echo json_encode($response); exit();
//             }
        
//             $response = [
//                 "success" => true,
//                 "users"   => GetTodayRegisteredFromDbArray($main_mysqli, $db_array)
//             ];
        
//             echo json_encode($response);
//             exit();
//         }else if ($tag == "GET_YESTERDAY_REGISTERED") {
//             $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
//             if (!$db_array || !is_array($db_array)) {
//                 $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
//                 echo json_encode($response); exit();
//             }
        
//             $response = [
//                 "success" => true,
//                 "users"   => GetYesterdayRegisteredFromDbArray($main_mysqli, $db_array)
//             ];
        
//             echo json_encode($response);
//             exit();
//         }else if ($tag == "GET_LAST7DAYS_REGISTERED") {
//             $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
//             if (!$db_array || !is_array($db_array)) {
//                 $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
//                 echo json_encode($response); exit();
//             }
        
//             $response = [
//                 "success" => true,
//                 "users"   => GetLast7DaysRegisteredFromDbArray($main_mysqli, $db_array)
//             ];
        
//             echo json_encode($response);
//             exit();
//         }else if ($tag == "GET_CURRENTMONTH_REGISTERED") {
//             $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
//             if (!$db_array || !is_array($db_array)) {
//                 $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
//                 echo json_encode($response); exit();
//             }
        
//             $response = [
//                 "success" => true,
//                 "users"   => GetCurrentMonthRegisteredFromDbArray($main_mysqli, $db_array)
//             ];
        
//             echo json_encode($response);
//             exit();
//         }
       
    
// }
// else
// {
//     header('HTTP/1.0 401 Unauthorized');
//     $response["success"] = FALSE;
//     $response["error_msg"] = "Access Denied";
//     echo json_encode($response);
//     Exit(); 
// }



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
function GetYesterdayRegisteredCount(mysqli $mysqli): int {

    $sql = "
        SELECT COUNT(*) as total
        FROM fnd_registration_tab
        WHERE registered_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
          AND registered_date < CURDATE()
    ";

    $count = 0;

    if ($res = $mysqli->query($sql)) {
        $row = $res->fetch_assoc();
        $count = (int)$row['total'];
        $res->free();
    }

    return $count;
}

function GetYesterdayRegisteredTotalFromDbArray($main_mysqli, array $db_array): int {

    $grandTotal = 0;

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);

        $count = GetYesterdayRegisteredCount($mysqli);
        $grandTotal += $count;

        // ❗ Remove this if SwapDatabase uses same connection
        // $mysqli->close();
    }

    return $grandTotal;
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


?>