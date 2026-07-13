<?php
if (true) {
    if($_POST['db']!=0){
        
        if ($tag == "SAVE_INSTALL_REPORT") {
            $response["success"] = TRUE;
            $response["user"]=GetRegistered($mysqli,0,7);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "GET_REGISTERED_LAST28") {
            $response["success"] = TRUE;
            $response["user"]=GetRegistered($mysqli,0,28);
            echo json_encode($response);
            EXIT(); 
        }
  
        
    }else {
         if ($tag == "GET_TODAY_PURCHASES_IOS") {
             $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];

            if (!$db_array || !is_array($db_array)) {
                $response = ["success" => false, "error_msg" => "Invalid db_array parameter"];
                echo json_encode($response); exit();
            }
        
            $response = [
                "success" => true,
                "purchases" => GetTodayIOSPurchasesFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_YESTERDAY_PURCHASES_IOS") {
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];

            if (!$db_array || !is_array($db_array)) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetYesterdayIOSPurchasesFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_LAST7DAYS_PURCHASES_IOS") {
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetLast7DaysIOSPurchasesFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        }else if ($tag == "GET_TODAY_PURCHASES_ANDROID") {
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetTodayPurchasesAndroidFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        } else if ($tag == "GET_YESTERDAY_PURCHASES_ANDROID") {
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetYesterdayPurchasesAndroidFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
            exit();
        } else if ($tag == "GET_LAST7DAYS_PURCHASES_ANDROID") {
            $db_array = json_decode($_POST['db_array'] ?? '[]', true) ?? [];
        
            if (!$db_array || !is_array($db_array)) {
                echo json_encode(["success" => false, "error_msg" => "Invalid db_array parameter"]); exit();
            }
        
            $response = [
                "success"   => true,
                "purchases" => GetLast7DaysPurchasesAndroidFromDbArray($main_mysqli, $db_array)
            ];
        
            echo json_encode($response);
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


function GetUserByEmail($mysqli,$email) {
 
    $prep_stmt = "SELECT email,country,registered_date,device,premium as db_premium,ads_free,installer,valid,version as os_version,last_online,curr_version as app_version,referral_code,referrer,language,ss_enabled FROM fnd_registration_tab WHERE email=? ";
    $stmt = $mysqli->prepare($prep_stmt);
      if ($stmt) {
        $stmt->bind_param('s', $email);
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


function GetTodayIOSPurchases(mysqli $mysqli, string $appDb): array {
    $row = [
        'monthly'        => 0,
        'yearly'         => 0,
        'lifetime'       => 0,
        'lifetime_offer' => 0,
        'total'          => 0,
    ];

    $sql = "
        SELECT
            SUM(CASE WHEN LOWER(subscription_type) = 'monthly' THEN 1 ELSE 0 END)          AS monthly,
            SUM(CASE WHEN LOWER(subscription_type) = 'yearly' THEN 1 ELSE 0 END)           AS yearly,
            SUM(CASE WHEN LOWER(subscription_type) = 'lifetime' THEN 1 ELSE 0 END)         AS lifetime,
            SUM(CASE WHEN LOWER(subscription_type) IN ('lifetime_offer','lifetime offer')
                     THEN 1 ELSE 0 END)                                                    AS lifetime_offer,
            COUNT(*) AS total
        FROM fnd_ios_purchase_tab
        WHERE purchased_date BETWEEN CONCAT(CURDATE(), ' 00:00:00')
                                AND CONCAT(CURDATE(), ' 23:59:59')
    ";

    if ($res = $mysqli->query($sql)) {
        if ($r = $res->fetch_assoc()) {
            $row = [
                'monthly'        => (int)$r['monthly'],
                'yearly'         => (int)$r['yearly'],
                'lifetime'       => (int)$r['lifetime'],
                'lifetime_offer' => (int)$r['lifetime_offer'],
                'total'          => (int)$r['total'],
            ];
        }
        $res->free();
    }

    // tag with the db(app) name
    $row['app_db'] = $appDb;

    return $row;
}

function GetTodayIOSPurchasesFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $counts = GetTodayIOSPurchases($mysqli, $db);
        $all[]  = $counts;
        $mysqli->close();
    }

    return $all;
}


//YESTERDAY IOS

function GetYesterdayIOSPurchases(mysqli $mysqli, string $appDb): array {
    $row = [
        'monthly'        => 0,
        'yearly'         => 0,
        'lifetime'       => 0,
        'lifetime_offer' => 0,
        'total'          => 0,
    ];

    $sql = "
        SELECT
            SUM(CASE WHEN LOWER(subscription_type) = 'monthly' THEN 1 ELSE 0 END)          AS monthly,
            SUM(CASE WHEN LOWER(subscription_type) = 'yearly' THEN 1 ELSE 0 END)           AS yearly,
            SUM(CASE WHEN LOWER(subscription_type) = 'lifetime' THEN 1 ELSE 0 END)         AS lifetime,
            SUM(CASE WHEN LOWER(subscription_type) IN ('lifetime_offer','lifetime offer')
                     THEN 1 ELSE 0 END)                                                    AS lifetime_offer,
            COUNT(*) AS total
        FROM fnd_ios_purchase_tab
        WHERE purchased_date BETWEEN CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 00:00:00')
                                AND CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 23:59:59')
    ";

    if ($res = $mysqli->query($sql)) {
        if ($r = $res->fetch_assoc()) {
            $row = [
                'monthly'        => (int)$r['monthly'],
                'yearly'         => (int)$r['yearly'],
                'lifetime'       => (int)$r['lifetime'],
                'lifetime_offer' => (int)$r['lifetime_offer'],
                'total'          => (int)$r['total'],
            ];
        }
        $res->free();
    }

    // tag with the db(app) name
    $row['app_db'] = $appDb;

    return $row;
}


function GetYesterdayIOSPurchasesFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $counts = GetYesterdayIOSPurchases($mysqli, $db);
        $all[]  = $counts;
        $mysqli->close();
    }

    return $all;
}

// LAST 7 DAYS IOS

function GetLast7DaysIOSPurchases(mysqli $mysqli, string $appDb): array {
    $row = [
        'monthly'        => 0,
        'yearly'         => 0,
        'lifetime'       => 0,
        'lifetime_offer' => 0,
        'total'          => 0,
    ];

    $sql = "
        SELECT
            SUM(CASE WHEN LOWER(subscription_type) = 'monthly' THEN 1 ELSE 0 END)          AS monthly,
            SUM(CASE WHEN LOWER(subscription_type) = 'yearly' THEN 1 ELSE 0 END)           AS yearly,
            SUM(CASE WHEN LOWER(subscription_type) = 'lifetime' THEN 1 ELSE 0 END)         AS lifetime,
            SUM(CASE WHEN LOWER(subscription_type) IN ('lifetime_offer','lifetime offer')
                     THEN 1 ELSE 0 END)                                                    AS lifetime_offer,
            COUNT(*) AS total
        FROM fnd_ios_purchase_tab
        WHERE purchased_date BETWEEN CONCAT(DATE_SUB(CURDATE(), INTERVAL 6 DAY), ' 00:00:00')
                                AND CONCAT(CURDATE(), ' 23:59:59')
    ";

    if ($res = $mysqli->query($sql)) {
        if ($r = $res->fetch_assoc()) {
            $row = [
                'monthly'        => (int)$r['monthly'],
                'yearly'         => (int)$r['yearly'],
                'lifetime'       => (int)$r['lifetime'],
                'lifetime_offer' => (int)$r['lifetime_offer'],
                'total'          => (int)$r['total'],
            ];
        }
        $res->free();
    }

    $row['app_db'] = $appDb;
    return $row;
}


function GetLast7DaysIOSPurchasesFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $counts = GetLast7DaysIOSPurchases($mysqli, $db);
        $all[]  = $counts;
        $mysqli->close();
    }

    return $all;
}

// TODAY ANDROID

function GetTodayPurchasesAndroid(mysqli $mysqli, string $appDb): array {
    $row = [
        'monthly'        => 0,
        'yearly'         => 0,
        'lifetime'       => 0,
        'lifetime_offer' => 0,
        'total'          => 0,
    ];

    // If your timestamp column is different, swap created_date below (e.g., purchased_date).
    $sql = "
        SELECT
            /* Monthly plans */
            SUM(CASE WHEN LOWER(sku) LIKE '%monthly%' THEN 1 ELSE 0 END) AS monthly,

            /* Yearly / Annual plans */
            SUM(CASE WHEN (LOWER(sku) LIKE '%yearly%' OR LOWER(sku) LIKE '%annual%')
                     THEN 1 ELSE 0 END) AS yearly,

            /* Pure lifetime (exclude promo/offer SKUs so we don't double-count) */
            SUM(CASE WHEN LOWER(sku) LIKE '%lifetime%'
                      AND LOWER(sku) NOT LIKE '%offer%'
                      AND LOWER(sku) NOT LIKE '%off%'    /* handles aus_10off, aus_50off, etc. */
                     THEN 1 ELSE 0 END) AS lifetime,

            /* Lifetime offer / promo SKUs */
            SUM(CASE WHEN
                        LOWER(sku) LIKE '%lifetime_offer%' OR
                        LOWER(sku) LIKE '%lifetime offer%' OR
                        LOWER(sku) LIKE '%offer%' OR
                        LOWER(sku) LIKE '%10off%' OR LOWER(sku) LIKE '%20off%' OR
                        LOWER(sku) LIKE '%30off%' OR LOWER(sku) LIKE '%40off%' OR
                        LOWER(sku) LIKE '%50off%' OR LOWER(sku) LIKE '%60off%' OR
                        LOWER(sku) LIKE '%70off%' OR LOWER(sku) LIKE '%80off%' OR
                        LOWER(sku) LIKE '%90off%'
                     THEN 1 ELSE 0 END) AS lifetime_offer,

            COUNT(*) AS total
        FROM fnd_purchase_tab
        WHERE purchased_date BETWEEN CONCAT(CURDATE(), ' 00:00:00')
                              AND CONCAT(CURDATE(), ' 23:59:59')
    ";

    if ($res = $mysqli->query($sql)) {
        if ($r = $res->fetch_assoc()) {
            $row = [
                'monthly'        => (int)$r['monthly'],
                'yearly'         => (int)$r['yearly'],
                'lifetime'       => (int)$r['lifetime'],
                'lifetime_offer' => (int)$r['lifetime_offer'],
                'total'          => (int)$r['total'],
            ];
        }
        $res->free();
    }

    $row['app_db'] = $appDb;
    return $row;
}

function GetTodayPurchasesAndroidFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli  = SwapDatabase($main_mysqli, $db);
        $counts  = GetTodayPurchasesAndroid($mysqli, $db);
        $all[]   = $counts;
        $mysqli->close();
    }

    return $all;
}



//YESTERDAY ANDROID

function GetYesterdayPurchasesAndroid(mysqli $mysqli, string $appDb): array {
    $row = [
        'monthly'  => 0,
        'yearly'   => 0,
        'lifetime' => 0,
        'total'    => 0,
    ];

    $sql = "
        SELECT
            SUM(CASE WHEN LOWER(sku) LIKE '%monthly%' THEN 1 ELSE 0 END) AS monthly,
            SUM(CASE WHEN (LOWER(sku) LIKE '%yearly%' OR LOWER(sku) LIKE '%annual%')
                     THEN 1 ELSE 0 END) AS yearly,
            SUM(CASE WHEN LOWER(sku) LIKE '%lifetime%' THEN 1 ELSE 0 END) AS lifetime,
            COUNT(*) AS total
        FROM fnd_purchase_tab
        WHERE created_date BETWEEN CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 00:00:00')
                              AND CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 23:59:59')
    ";

    if ($res = $mysqli->query($sql)) {
        if ($r = $res->fetch_assoc()) {
            $row = [
                'monthly'  => (int)$r['monthly'],
                'yearly'   => (int)$r['yearly'],
                'lifetime' => (int)$r['lifetime'],
                'total'    => (int)$r['total'],
            ];
        }
        $res->free();
    }

    $row['app_db'] = $appDb;
    return $row;
}


function GetYesterdayPurchasesAndroidFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $counts = GetYesterdayPurchasesAndroid($mysqli, $db);
        $all[]  = $counts;
        $mysqli->close();
    }

    return $all;
}

// LAST & DAYS ANDROID

// Last 7 calendar days INCLUDING today (today + previous 6 days).
function GetLast7DaysPurchasesAndroid(mysqli $mysqli, string $appDb): array {
    $row = [
        'monthly'  => 0,
        'yearly'   => 0,
        'lifetime' => 0,
        'total'    => 0,
    ];

    $sql = "
        SELECT
            SUM(CASE WHEN LOWER(sku) LIKE '%monthly%' THEN 1 ELSE 0 END) AS monthly,
            SUM(CASE WHEN (LOWER(sku) LIKE '%yearly%' OR LOWER(sku) LIKE '%annual%')
                     THEN 1 ELSE 0 END) AS yearly,
            SUM(CASE WHEN LOWER(sku) LIKE '%lifetime%' THEN 1 ELSE 0 END) AS lifetime,
            COUNT(*) AS total
        FROM fnd_purchase_tab
        WHERE created_date BETWEEN CONCAT(DATE_SUB(CURDATE(), INTERVAL 6 DAY), ' 00:00:00')
                              AND CONCAT(CURDATE(), ' 23:59:59')
    ";

    if ($res = $mysqli->query($sql)) {
        if ($r = $res->fetch_assoc()) {
            $row = [
                'monthly'  => (int)$r['monthly'],
                'yearly'   => (int)$r['yearly'],
                'lifetime' => (int)$r['lifetime'],
                'total'    => (int)$r['total'],
            ];
        }
        $res->free();
    }

    $row['app_db'] = $appDb;
    return $row;
}


function GetLast7DaysPurchasesAndroidFromDbArray($main_mysqli, array $db_array): array {
    $all = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $counts = GetLast7DaysPurchasesAndroid($mysqli, $db);
        $all[]  = $counts;
        $mysqli->close();
    }

    return $all;
}


?>