<?php
if (true) {
    if($_POST['db']!=0){
        if ($tag == "GET_IOS_ADMOBADS_SETTINGS") {
            admob_send_json([
                "success" => TRUE,
                "ads_ios" => GetIOSAdsSettings($mysqli)
            ]);
        }else if ($tag == "GET_ANDROID_ADMOBADS_SETTINGS") {
            admob_send_json([
                "success" => TRUE,
                "ads_android" => GetAndroidAdsSettings($mysqli)
            ]);
        }else if ($tag == "SAVE_IOS_ADMOBADS_SETTINGS") {
            $response["success"] = TRUE;
            
            $admob_banner_ads              = admob_int_post('ADMOB_BANNER_ADS');
            $admob_interstitial_ad         = admob_int_post('ADMOB_INTERSTITIAL_AD');

            $result = UpdateIOSAdsSettings($mysqli, $admob_banner_ads,$admob_interstitial_ad);
            admob_send_json($result);
        }else if ($tag == "SAVE_ANDROID_ADMOBADS_SETTINGS") {
            $admob_app_open_ad        = admob_int_post('ADMOB_APP_OPEN_AD');
            $admob_native_ads         = admob_int_post('ADMOB_NATIVE_ADS');
            $admob_banner_ads         = admob_int_post('ADMOB_BANNER_ADS');
            $admob_reward_ads         = admob_int_post('ADMOB_REWARD_ADS');
            $admob_interstitial_ad    = admob_int_post('ADMOB_INTERSTITIAL_AD');
            $admob_native_interval    = admob_int_post('ADMOB_NATIVE_INTERVAL');
            $reward_ad_interval_hours = admob_int_post('REWARD_AD_INTERVAL_HOURS');

            $result = UpdateAndroidAdsSettings($mysqli, $admob_app_open_ad, $admob_native_ads, $admob_banner_ads, $admob_reward_ads, $admob_interstitial_ad, $admob_native_interval, $reward_ad_interval_hours);
            admob_send_json($result);
        }else if ($tag == "GET_PENDING_FEEDBACK") {
            $response["success"] = TRUE;
            $response["feedback"]=GetPendingFeedback($mysqli);
            echo json_encode($response);
            EXIT(); 
        }
    }else{
        
    }
    
}
else
{
    admob_send_json([
        "success" => FALSE,
        "error_msg" => "Access Denied"
    ], 401);
}

function admob_send_json($payload, $status_code = 200) {
    if (!headers_sent()) {
        http_response_code($status_code);
        header('Content-Type: application/json');
    }
    echo json_encode($payload);
    EXIT();
}

function admob_int_post($name) {
    return isset($_POST[$name]) ? (int)$_POST[$name] : 0;
}

function GetIOSAdsSettings($mysqli) {
 
    $prep_stmt = "SELECT a.id,a.ad_type,active,frequency FROM fnd_ios_admob_tab a";
    $stmt = $mysqli->prepare($prep_stmt);
      if ($stmt) {
       // $stmt->bind_param('s', $email);
        if ($stmt->execute()) {
            $lst = get_result($stmt);
            $stmt->close();
            return $lst;
        } else {
            
            return [];
        }
    } else {
        return [];
    }
};

function GetAndroidAdsSettings($mysqli) {
 
   $prep_stmt = "SELECT name, int_value FROM fnd_settings_tab WHERE name IN ('ADMOB_APP_OPEN_AD','ADMOB_NATIVE_ADS','ADMOB_BANNER_ADS','ADMOB_REWARD_ADS','ADMOB_INTERSTITIAL_AD','ADMOB_NATIVE_INTERVAL','REWARD_AD_INTERVAL_HOURS')";
    $stmt = $mysqli->prepare($prep_stmt);
      if ($stmt) {
       // $stmt->bind_param('s', $email);
        if ($stmt->execute()) {
            $lst = get_result($stmt);
            $stmt->close();
            return $lst;
        } else {
            
            return [];
        }
    } else {
        return [];
    }
};

function UpdateAndroidAdsSettings($mysqli, $admob_app_open_ad, $admob_native_ads, $admob_banner_ads, $admob_reward_ads, $admob_interstitial_ad, $admob_native_interval, $reward_ad_interval_hours) {
    $settings = [
        'ADMOB_APP_OPEN_AD' => $admob_app_open_ad,
        'ADMOB_NATIVE_ADS' => $admob_native_ads,
        'ADMOB_BANNER_ADS' => $admob_banner_ads,
        'ADMOB_REWARD_ADS' => $admob_reward_ads,
        'ADMOB_INTERSTITIAL_AD' => $admob_interstitial_ad,
        'ADMOB_NATIVE_INTERVAL' => $admob_native_interval,
        'REWARD_AD_INTERVAL_HOURS' => $reward_ad_interval_hours
    ];

    foreach ($settings as $name => $value) {
        $result = UpsertAndroidAdmobSetting($mysqli, $name, (int)$value);
        if (!$result["success"]) {
            return $result;
        }
    }

    return ["success" => true];
}

function UpsertAndroidAdmobSetting($mysqli, $name, $value) {
    $stmt = $mysqli->prepare("UPDATE fnd_settings_tab SET int_value=?, category='admob' WHERE name=?");
    if (!$stmt) {
        return ["success" => false, "error_msg" => $mysqli->error];
    }

    $stmt->bind_param('is', $value, $name);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "error_msg" => $error];
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected !== 0) {
        return ["success" => true];
    }

    $stmt = $mysqli->prepare("SELECT name FROM fnd_settings_tab WHERE name=? LIMIT 1");
    if (!$stmt) {
        return ["success" => false, "error_msg" => $mysqli->error];
    }
    $stmt->bind_param('s', $name);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "error_msg" => $error];
    }
    $existing = get_result($stmt);
    $stmt->close();

    if (!empty($existing)) {
        return ["success" => true];
    }

    $stmt = $mysqli->prepare("INSERT INTO fnd_settings_tab (name, int_value, category) VALUES (?, ?, 'admob')");
    if (!$stmt) {
        return ["success" => false, "error_msg" => $mysqli->error];
    }
    $stmt->bind_param('si', $name, $value);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "error_msg" => $error];
    }
    $stmt->close();

    return ["success" => true];
}


function UpdateIOSAdsSettings($mysqli, $admob_banner_ads, $admob_interstitial_ad) {
    // Map each ad type to its new 'active' value
    $ads = [
        'ADMOB_BANNER_ADS' => $admob_banner_ads,
        'ADMOB_INTERSTITIAL_AD' => $admob_interstitial_ad
    ];

    foreach ($ads as $ad_type => $active_value) {
        if ($stmt = $mysqli->prepare("UPDATE fnd_ios_admob_tab SET active=? WHERE ad_type=?")) {
            $active_value = (int)$active_value;
            $stmt->bind_param('is', $active_value, $ad_type);
            if (!$stmt->execute()) {
                $error = $stmt->error ?: $mysqli->error;
                $stmt->close();
                return ["success" => false, "error_msg" => $error];
            }
            $stmt->close();
        } else {
            return ["success" => false, "error_msg" => $mysqli->error];
        }
    }

    return ["success" => true];
}


?>
