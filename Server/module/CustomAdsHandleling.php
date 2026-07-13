<?php
if (true) {
    if($_POST['db']!=0){
        if ($tag == "INSERT_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $db_name = isset($_POST['db_name']) ? $_POST['db_name'] : ResolveDatabaseName($main_mysqli, $_POST['db']);
            $package_name = isset($_POST['package_name']) ? $_POST['package_name'] : '';
            $content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';
            //$content        = isset($_POST['content']) ? $_POST['content'] : '';
            $btn_ok         = isset($_POST['btn_ok']) ? $_POST['btn_ok'] : '';
            $btn_cancel     = isset($_POST['btn_cancel']) ? $_POST['btn_cancel'] : '';
            $btn_explore    = isset($_POST['btn_explore']) ? $_POST['btn_explore'] : '';
            $btn_premium    = isset($_POST['btn_premium']) ? $_POST['btn_premium'] : '';
            $btn_visit      = isset($_POST['btn_visit']) ? $_POST['btn_visit'] : '';
            $btn_download   = isset($_POST['btn_download']) ? $_POST['btn_download'] : '';
            $btn_invite     = isset($_POST['btn_invite']) ? $_POST['btn_invite'] : '';
            $iap            = isset($_POST['iap']) ? $_POST['iap'] : '0';
            $case_subcase_id = isset($_POST['case_subcase_id']) ? $_POST['case_subcase_id'] : '';
            $navigate_url   = isset($_POST['navigate_url']) ? $_POST['navigate_url'] : '';
            $valid_from     = isset($_POST['valid_from']) ? $_POST['valid_from'] : '';
            $valid_to       = isset($_POST['valid_to']) ? $_POST['valid_to'] : '';
            $onetime        = isset($_POST['onetime']) ? $_POST['onetime'] : '';
            $target_group   = isset($_POST['target_group']) ? $_POST['target_group'] : '';
            $language       = isset($_POST['language']) ? $_POST['language'] : '';
            $mobile_height  = isset($_POST['mobile_height']) ? $_POST['mobile_height'] : '';
            $tablet_height  = isset($_POST['tablet_height']) ? $_POST['tablet_height'] : '';

            $inserted_count = InsertAndroidCustomAdsAdsMesssage(
        $mysqli, $firebase_ad_id, $content, $btn_ok, $btn_cancel, $btn_explore, $btn_premium,
        $btn_visit, $btn_download, $btn_invite, $iap, $case_subcase_id, $navigate_url,
        $valid_from, $valid_to, $onetime, $target_group, $language, $mobile_height,
        $tablet_height, $db_name,$package_name 
        );
        
            $response["success"] = $inserted_count > 0;
            $response["inserted_count"] = $inserted_count;
            
             echo json_encode($response);
            EXIT(); 
        }else if ($tag == "UPDATE_DEV_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $db_name = isset($_POST['db_name']) ? $_POST['db_name'] : ResolveDatabaseName($main_mysqli, $_POST['db']);
            $package_name = isset($_POST['package_name']) ? $_POST['package_name'] : '';
            $content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';
            //$content        = isset($_POST['content']) ? $_POST['content'] : '';
            $btn_ok         = isset($_POST['btn_ok']) ? $_POST['btn_ok'] : '';
            $btn_cancel     = isset($_POST['btn_cancel']) ? $_POST['btn_cancel'] : '';
            $btn_explore    = isset($_POST['btn_explore']) ? $_POST['btn_explore'] : '';
            $btn_premium    = isset($_POST['btn_premium']) ? $_POST['btn_premium'] : '';
            $btn_visit      = isset($_POST['btn_visit']) ? $_POST['btn_visit'] : '';
            $btn_download   = isset($_POST['btn_download']) ? $_POST['btn_download'] : '';
            $btn_invite     = isset($_POST['btn_invite']) ? $_POST['btn_invite'] : '';
            $iap            = isset($_POST['iap']) ? $_POST['iap'] : '0';
            $case_subcase_id = isset($_POST['case_subcase_id']) ? $_POST['case_subcase_id'] : '';
            $navigate_url   = isset($_POST['navigate_url']) ? $_POST['navigate_url'] : '';
            $valid_from     = isset($_POST['valid_from']) ? $_POST['valid_from'] : '';
            $valid_to       = isset($_POST['valid_to']) ? $_POST['valid_to'] : '';
            $onetime        = isset($_POST['onetime']) ? $_POST['onetime'] : '';
            $target_group   = isset($_POST['target_group']) ? $_POST['target_group'] : '';
            $language       = isset($_POST['language']) ? $_POST['language'] : '';
            $mobile_height  = isset($_POST['mobile_height']) ? $_POST['mobile_height'] : '';
            $tablet_height  = isset($_POST['tablet_height']) ? $_POST['tablet_height'] : '';

            $updated_count = UpdateDevAndroidCustomAdsMesssage(
        $mysqli, $firebase_ad_id, $content, $btn_ok, $btn_cancel, $btn_explore, $btn_premium,
        $btn_visit, $btn_download, $btn_invite, $iap, $case_subcase_id, $navigate_url,
        $valid_from, $valid_to, $onetime, $target_group, $language, $mobile_height,
        $tablet_height, $db_name,$package_name 
        );
        
            $response["success"] = $updated_count > 0;
            $response["updated_count"] = $updated_count;
            
             echo json_encode($response);
            EXIT(); 
        }else if ($tag == "UPDATE_LIVE_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $db_name = isset($_POST['db_name']) ? $_POST['db_name'] : ResolveDatabaseName($main_mysqli, $_POST['db']);
            $package_name = isset($_POST['package_name']) ? $_POST['package_name'] : '';
            $content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';
            //$content        = isset($_POST['content']) ? $_POST['content'] : '';
            $btn_ok         = isset($_POST['btn_ok']) ? $_POST['btn_ok'] : '';
            $btn_cancel     = isset($_POST['btn_cancel']) ? $_POST['btn_cancel'] : '';
            $btn_explore    = isset($_POST['btn_explore']) ? $_POST['btn_explore'] : '';
            $btn_premium    = isset($_POST['btn_premium']) ? $_POST['btn_premium'] : '';
            $btn_visit      = isset($_POST['btn_visit']) ? $_POST['btn_visit'] : '';
            $btn_download   = isset($_POST['btn_download']) ? $_POST['btn_download'] : '';
            $btn_invite     = isset($_POST['btn_invite']) ? $_POST['btn_invite'] : '';
            $iap            = isset($_POST['iap']) ? $_POST['iap'] : '0';
            $case_subcase_id = isset($_POST['case_subcase_id']) ? $_POST['case_subcase_id'] : '';
            $navigate_url   = isset($_POST['navigate_url']) ? $_POST['navigate_url'] : '';
            $valid_from     = isset($_POST['valid_from']) ? $_POST['valid_from'] : '';
            $valid_to       = isset($_POST['valid_to']) ? $_POST['valid_to'] : '';
            $onetime        = isset($_POST['onetime']) ? $_POST['onetime'] : '';
            $target_group   = isset($_POST['target_group']) ? $_POST['target_group'] : '';
            $language       = isset($_POST['language']) ? $_POST['language'] : '';
            $mobile_height  = isset($_POST['mobile_height']) ? $_POST['mobile_height'] : '';
            $tablet_height  = isset($_POST['tablet_height']) ? $_POST['tablet_height'] : '';

            $updated_count = UpdateLiveAndroidCustomAdsMesssage(
        $mysqli, $firebase_ad_id, $content, $btn_ok, $btn_cancel, $btn_explore, $btn_premium,
        $btn_visit, $btn_download, $btn_invite, $iap, $case_subcase_id, $navigate_url,
        $valid_from, $valid_to, $onetime, $target_group, $language, $mobile_height,
        $tablet_height, $db_name,$package_name 
        );
        
            $response["success"] = $updated_count > 0;
            $response["updated_count"] = $updated_count;
            
             echo json_encode($response);
            EXIT(); 
        }else if ($tag == "REVERT_TO_DEVELOPMENT_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=RevertToDevelopmentAndroidCustomAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "DELETE_DEVELOPMENT_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=DeleteDevelopmentAndroidCustomAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "DELETE_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=DeleteAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "PAUSE_DEV_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=PauseDevAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "PAUSE_LIVE_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=PauseLiveAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "RESUME_DEV_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=ResumeDevAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "RESUME_LIVE_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=ResumeLiveAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "STOP_DEV_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=StopDevAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "STOP_LIVE_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=StopLiveAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "UPDATE_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';
            //$content        = isset($_POST['content']) ? $_POST['content'] : '';
            $btn_ok         = isset($_POST['btn_ok']) ? $_POST['btn_ok'] : '';
            $btn_cancel     = isset($_POST['btn_cancel']) ? $_POST['btn_cancel'] : '';
            $btn_explore    = isset($_POST['btn_explore']) ? $_POST['btn_explore'] : '';
            $btn_premium    = isset($_POST['btn_premium']) ? $_POST['btn_premium'] : '';
            $btn_visit      = isset($_POST['btn_visit']) ? $_POST['btn_visit'] : '';
            $btn_download   = isset($_POST['btn_download']) ? $_POST['btn_download'] : '';
            $btn_invite     = isset($_POST['btn_invite']) ? $_POST['btn_invite'] : '';
            $iap            = isset($_POST['iap']) ? $_POST['iap'] : '0';
            $case_subcase_id = isset($_POST['case_subcase_id']) ? $_POST['case_subcase_id'] : '';
            $navigate_url   = isset($_POST['navigate_url']) ? $_POST['navigate_url'] : '';
            $valid_from     = isset($_POST['valid_from']) ? $_POST['valid_from'] : '';
            $valid_to       = isset($_POST['valid_to']) ? $_POST['valid_to'] : '';
            $onetime        = isset($_POST['onetime']) ? $_POST['onetime'] : '';
            $target_group   = isset($_POST['target_group']) ? $_POST['target_group'] : '';
            $language       = isset($_POST['language']) ? $_POST['language'] : '';
            $mobile_height  = isset($_POST['mobile_height']) ? $_POST['mobile_height'] : '';
            $tablet_height  = isset($_POST['tablet_height']) ? $_POST['tablet_height'] : '';
            
             $response["success"] = UpdateAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id,$content,$btn_ok,$btn_cancel,$btn_explore,$btn_premium,$btn_visit,$btn_download,$btn_invite,$iap,$case_subcase_id,$navigate_url,$valid_from,$valid_to,$onetime,$target_group,$language,$mobile_height,$tablet_height);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "PUBLISH_TO_PRODUCTION_ANDROID_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $db_name = isset($_POST['db_name']) ? $_POST['db_name'] : ResolveDatabaseName($main_mysqli, $_POST['db']);
            $package_name = isset($_POST['package_name']) ? $_POST['package_name'] : '';
            $content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';
            //$content        = isset($_POST['content']) ? $_POST['content'] : '';
            $btn_ok         = isset($_POST['btn_ok']) ? $_POST['btn_ok'] : '';
            $btn_cancel     = isset($_POST['btn_cancel']) ? $_POST['btn_cancel'] : '';
            $btn_explore    = isset($_POST['btn_explore']) ? $_POST['btn_explore'] : '';
            $btn_premium    = isset($_POST['btn_premium']) ? $_POST['btn_premium'] : '';
            $btn_visit      = isset($_POST['btn_visit']) ? $_POST['btn_visit'] : '';
            $btn_download   = isset($_POST['btn_download']) ? $_POST['btn_download'] : '';
            $btn_invite     = isset($_POST['btn_invite']) ? $_POST['btn_invite'] : '';
            $iap            = isset($_POST['iap']) ? $_POST['iap'] : '0';
            $case_subcase_id = isset($_POST['case_subcase_id']) ? $_POST['case_subcase_id'] : '';
            $navigate_url   = isset($_POST['navigate_url']) ? $_POST['navigate_url'] : '';
            $valid_from     = isset($_POST['valid_from']) ? $_POST['valid_from'] : '';
            $valid_to       = isset($_POST['valid_to']) ? $_POST['valid_to'] : '';
            $onetime        = isset($_POST['onetime']) ? $_POST['onetime'] : '';
            $target_group   = isset($_POST['target_group']) ? $_POST['target_group'] : '';
            $language       = isset($_POST['language']) ? $_POST['language'] : '';
            $mobile_height  = isset($_POST['mobile_height']) ? $_POST['mobile_height'] : '';
            $tablet_height  = isset($_POST['tablet_height']) ? $_POST['tablet_height'] : '';

            $inserted_count = PublishToProductionAndroidCustomAdsAdsMesssage(
        $mysqli, $firebase_ad_id, $content, $btn_ok, $btn_cancel, $btn_explore, $btn_premium,
        $btn_visit, $btn_download, $btn_invite, $iap, $case_subcase_id, $navigate_url,
        $valid_from, $valid_to, $onetime, $target_group, $language, $mobile_height,
        $tablet_height, $db_name,$package_name 
        );
        
         $response["success"] = $inserted_count > 0;
            $response["inserted_count"] = $inserted_count;
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "INSERT_IOS_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';
            $btn_name_english = isset($_POST['btn_name_english']) ? $_POST['btn_name_english'] : '';
            $btn_name_german  = isset($_POST['btn_name_german']) ? $_POST['btn_name_german'] : '';
            $btn_name_spanish = isset($_POST['btn_name_spanish']) ? $_POST['btn_name_spanish'] : '';
            $btn_name_french  = isset($_POST['btn_name_french']) ? $_POST['btn_name_french'] : '';
            $btn_name_portuguese = isset($_POST['btn_name_portuguese']) ? $_POST['btn_name_portuguese'] : '';
            $btn_name_russian = isset($_POST['btn_name_russian']) ? $_POST['btn_name_russian'] : '';
            $btn_name_chinese = isset($_POST['btn_name_chinese']) ? $_POST['btn_name_chinese'] : '';
            $btn_close_bottom = isset($_POST['btn_close_bottom']) ? $_POST['btn_close_bottom'] : '';
            $btn_close_top    = isset($_POST['btn_close_top']) ? $_POST['btn_close_top'] : '';
            $btn_color        = isset($_POST['btn_color']) ? $_POST['btn_color'] : '';
            $navigate_url     = isset($_POST['navigate_url']) ? $_POST['navigate_url'] : '';
            $valid_from       = isset($_POST['valid_from']) ? $_POST['valid_from'] : '';
            $valid_to         = isset($_POST['valid_to']) ? $_POST['valid_to'] : '';
            $onetime          = isset($_POST['onetime']) ? $_POST['onetime'] : '';
            $target_group     = isset($_POST['target_group']) ? $_POST['target_group'] : '';
            $language         = isset($_POST['language']) ? $_POST['language'] : '';

           $response["success"] = InsertIOSCustomAdsAdsMesssage($mysqli, $firebase_ad_id, $content, $btn_name_english, $btn_name_german, $btn_name_spanish,$btn_name_french, $btn_name_portuguese, $btn_name_russian, $btn_name_chinese,$btn_close_bottom, $btn_close_top, $btn_color, $navigate_url,$valid_from, $valid_to, $onetime, $target_group, $language);

            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "UPDATE_IOS_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';
            $btn_name_english = isset($_POST['btn_name_english']) ? $_POST['btn_name_english'] : '';
            $btn_name_german  = isset($_POST['btn_name_german']) ? $_POST['btn_name_german'] : '';
            $btn_name_spanish = isset($_POST['btn_name_spanish']) ? $_POST['btn_name_spanish'] : '';
            $btn_name_french  = isset($_POST['btn_name_french']) ? $_POST['btn_name_french'] : '';
            $btn_name_portuguese = isset($_POST['btn_name_portuguese']) ? $_POST['btn_name_portuguese'] : '';
            $btn_name_russian = isset($_POST['btn_name_russian']) ? $_POST['btn_name_russian'] : '';
            $btn_name_chinese = isset($_POST['btn_name_chinese']) ? $_POST['btn_name_chinese'] : '';
            $btn_close_bottom = isset($_POST['btn_close_bottom']) ? $_POST['btn_close_bottom'] : '';
            $btn_close_top    = isset($_POST['btn_close_top']) ? $_POST['btn_close_top'] : '';
            $btn_color        = isset($_POST['btn_color']) ? $_POST['btn_color'] : '';
            $navigate_url     = isset($_POST['navigate_url']) ? $_POST['navigate_url'] : '';
            $valid_from       = isset($_POST['valid_from']) ? $_POST['valid_from'] : '';
            $valid_to         = isset($_POST['valid_to']) ? $_POST['valid_to'] : '';
            $onetime          = isset($_POST['onetime']) ? $_POST['onetime'] : '';
            $target_group     = isset($_POST['target_group']) ? $_POST['target_group'] : '';
            $language         = isset($_POST['language']) ? $_POST['language'] : '';

           $response["success"] = UpdateIOSCustomAdsAdsMesssage($mysqli, $firebase_ad_id, $content, $btn_name_english, $btn_name_german, $btn_name_spanish,$btn_name_french, $btn_name_portuguese, $btn_name_russian, $btn_name_chinese,$btn_close_bottom, $btn_close_top, $btn_color, $navigate_url,$valid_from, $valid_to, $onetime, $target_group, $language);

            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "DELETE_IOS_CUSTOM_MESSAGE") {
            $response["success"] = TRUE;
            
            $firebase_ad_id        = isset($_POST['firebase_ad_id']) ? $_POST['firebase_ad_id'] : '';
            $response["success"]=DeleteIOSCustomAdsAdsMesssage($mysqli,$firebase_ad_id);
            echo json_encode($response);
            EXIT(); 
        }
    }else{
        
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


//ANDROID

//This use for the insert data to the fnd_android_custom_message_tab (Dev Table)
function InsertAndroidCustomAdsAdsMesssage($mysqli, $firebase_ad_id, $content, $btn_ok, $btn_cancel, $btn_explore, $btn_premium,$btn_visit, $btn_download, $btn_invite, $iap, $case_subcase_id, $navigate_url,$valid_from, $valid_to, $onetime, $target_group, $language, $mobile_height,$tablet_height, $db_name, $package_name) {
    // normalize ints
    $btn_ok       = (int)$btn_ok;
    $btn_cancel   = (int)$btn_cancel;
    $btn_explore  = (int)$btn_explore;
    $btn_premium  = (int)$btn_premium;
    $btn_visit    = (int)$btn_visit;
    $btn_download = (int)$btn_download;
    $btn_invite   = (int)$btn_invite;
    $iap          = (int)$iap;
    $onetime      = (int)$onetime;

    // extract app_name by removing prefix rermedap_FND_
    $app_name = $db_name;
    if (strpos($db_name, "rermedap_FND_") === 0) {
        $app_name = substr($db_name, strlen("rermedap_FND_"));
    }

    // prepare SQL insert
    $stmt = $mysqli->prepare("
        INSERT INTO fnd_android_custom_message_tab 
        (firebase_ad_id, content, btn_ok, btn_cancel, btn_explore, btn_premium,
         btn_visit, btn_download, btn_invite, iap, case_subcase_id, navigate_url,
         valid_from, valid_to, onetime, target_group, language, mobile_height, 
         tablet_height, app_name, package_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    if (!$stmt) {
        error_log("Prepare failed: " . $mysqli->error);
        return 0;
    }

    $stmt->bind_param(
        "ssiiiiiiiiisssissssss",
        $firebase_ad_id,
        $content,
        $btn_ok,
        $btn_cancel,
        $btn_explore,
        $btn_premium,
        $btn_visit,
        $btn_download,
        $btn_invite,
        $iap,
        $case_subcase_id,
        $navigate_url,
        $valid_from,
        $valid_to,
        $onetime,
        $target_group,
        $language,
        $mobile_height,
        $tablet_height,
        $app_name,
        $package_name
    );

    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        return 0;
    }

    $inserted_count = $stmt->affected_rows;
    $stmt->close();

    return $inserted_count;
}

//This use for the update data to the fnd_android_custom_message_tab (Dev Table) (Not Used)
function UpdateDevAndroidCustomAdsMesssage($mysqli, $firebase_ad_id, $content, $btn_ok, $btn_cancel, $btn_explore, $btn_premium,$btn_visit, $btn_download, $btn_invite, $iap, $case_subcase_id, $navigate_url,$valid_from, $valid_to, $onetime, $target_group, $language, $mobile_height,$tablet_height, $db_name, $package_name) {
    // normalize ints
    $btn_ok       = (int)$btn_ok;
    $btn_cancel   = (int)$btn_cancel;
    $btn_explore  = (int)$btn_explore;
    $btn_premium  = (int)$btn_premium;
    $btn_visit    = (int)$btn_visit;
    $btn_download = (int)$btn_download;
    $btn_invite   = (int)$btn_invite;
    $iap          = (int)$iap;
    $onetime      = (int)$onetime;

    // extract app_name by removing prefix rermedap_FND_
    $app_name = $db_name;
    if (strpos($db_name, "rermedap_FND_") === 0) {
        $app_name = substr($db_name, strlen("rermedap_FND_"));
    }

    // prepare SQL update (match by id + app_name + package for safety)
    $sql = "
        UPDATE fnd_android_custom_message_tab
        SET 
            btn_ok = ?,
            btn_cancel = ?,
            btn_explore = ?,
            btn_premium = ?,
            btn_visit = ?,
            btn_download = ?,
            btn_invite = ?,
            iap = ?,
            case_subcase_id = ?,
            navigate_url = ?,
            valid_from = ?,
            valid_to = ?,
            onetime = ?,
            target_group = ?,
            language = ?,
            mobile_height = ?,
            tablet_height = ?,
            app_name = ?,
            package_name = ?
        WHERE
            firebase_ad_id = ?
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        error_log("Prepare failed: " . $mysqli->error);
        return 0;
    }

    // types: s + 8*i + 4*s + i + 6*s + 3*s (WHERE) = 23 params
    $stmt->bind_param(
        "iiiiiiiissssisssssss",
        $btn_ok,
        $btn_cancel,
        $btn_explore,
        $btn_premium,
        $btn_visit,
        $btn_download,
        $btn_invite,
        $iap,
        $case_subcase_id,
        $navigate_url,
        $valid_from,
        $valid_to,
        $onetime,
        $target_group,
        $language,
        $mobile_height,
        $tablet_height,
        $app_name,
        $package_name,
        $firebase_ad_id
    );

    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        return 0;
    }

    $updated_count = $stmt->affected_rows;
    $stmt->close();

    return $updated_count; // 0 if no row matched/changed, >0 if updated
}

//This is use for delete the record from the fnd_android_custom_message_tab (Dev Table)
function RevertToDevelopmentAndroidCustomAdsMesssage($mysqli, $firebase_ad_id) {
    // Sanitize input
    $firebase_ad_id = $mysqli->real_escape_string($firebase_ad_id);

    // SQL DELETE query
    $sql = "DELETE FROM fnd_android_custom_message_tab WHERE firebase_ad_id = '$firebase_ad_id'";

    if ($mysqli->query($sql) === TRUE) {
        return true;  // Record deleted successfully
    } else {
        error_log("MySQL Error: " . $mysqli->error);
        return false; // Deletion failed
    }
}

//This is use for delete the record from the fnd_android_custom_message_tab (Dev Table)
function DeleteDevelopmentAndroidCustomAdsMesssage($mysqli, $firebase_ad_id) {
    // Sanitize input
    $firebase_ad_id = $mysqli->real_escape_string($firebase_ad_id);

    // SQL DELETE query
    $sql = "DELETE FROM fnd_android_custom_message_tab WHERE firebase_ad_id = '$firebase_ad_id'";

    if ($mysqli->query($sql) === TRUE) {
        return true;  // Record deleted successfully
    } else {
        error_log("MySQL Error: " . $mysqli->error);
        return false; // Deletion failed
    }
}

//This is use for insert the record to the fnd_custom_message_tab (Dev Table)
function PublishToProductionAndroidCustomAdsAdsMesssage($mysqli, $firebase_ad_id, $content, $btn_ok, $btn_cancel, $btn_explore, $btn_premium,$btn_visit, $btn_download, $btn_invite, $iap, $case_subcase_id, $navigate_url,$valid_from, $valid_to, $onetime, $target_group, $language, $mobile_height,$tablet_height, $db_name, $package_name) {
    // normalize ints
    $btn_ok       = (int)$btn_ok;
    $btn_cancel   = (int)$btn_cancel;
    $btn_explore  = (int)$btn_explore;
    $btn_premium  = (int)$btn_premium;
    $btn_visit    = (int)$btn_visit;
    $btn_download = (int)$btn_download;
    $btn_invite   = (int)$btn_invite;
    $iap          = (int)$iap;
    $onetime      = (int)$onetime;

    // extract app_name by removing prefix rermedap_FND_
    $app_name = $db_name;
    if (strpos($db_name, "rermedap_FND_") === 0) {
        $app_name = substr($db_name, strlen("rermedap_FND_"));
    }

    // prepare SQL insert
    $stmt = $mysqli->prepare("
        INSERT INTO fnd_custom_message_tab 
        (firebase_ad_id, content, btn_ok, btn_cancel, btn_explore, btn_premium,
         btn_visit, btn_download, btn_invite, iap, case_subcase_id, navigate_url,
         valid_from, valid_to, onetime, target_group, language, mobile_height, 
         tablet_height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    if (!$stmt) {
        error_log("Prepare failed: " . $mysqli->error);
        return 0;
    }

    $stmt->bind_param(
        "ssiiiiiiiiisssissss",
        $firebase_ad_id,
        $content,
        $btn_ok,
        $btn_cancel,
        $btn_explore,
        $btn_premium,
        $btn_visit,
        $btn_download,
        $btn_invite,
        $iap,
        $case_subcase_id,
        $navigate_url,
        $valid_from,
        $valid_to,
        $onetime,
        $target_group,
        $language,
        $mobile_height,
        $tablet_height
    );

    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        return 0;
    }

    $inserted_count = $stmt->affected_rows;
    $stmt->close();

    return $inserted_count;
}

//This use for the update data to the fnd_custom_message_tab (Live Table)
function UpdateLiveAndroidCustomAdsMesssage($mysqli, $firebase_ad_id, $content, $btn_ok, $btn_cancel, $btn_explore, $btn_premium,$btn_visit, $btn_download, $btn_invite, $iap, $case_subcase_id, $navigate_url,$valid_from, $valid_to, $onetime, $target_group, $language, $mobile_height,$tablet_height, $db_name, $package_name) {
    // normalize ints
    $btn_ok       = (int)$btn_ok;
    $btn_cancel   = (int)$btn_cancel;
    $btn_explore  = (int)$btn_explore;
    $btn_premium  = (int)$btn_premium;
    $btn_visit    = (int)$btn_visit;
    $btn_download = (int)$btn_download;
    $btn_invite   = (int)$btn_invite;
    $iap          = (int)$iap;
    $onetime      = (int)$onetime;

    // extract app_name by removing prefix rermedap_FND_
    $app_name = $db_name;
    if (strpos($db_name, "rermedap_FND_") === 0) {
        $app_name = substr($db_name, strlen("rermedap_FND_"));
    }

    // prepare SQL update (match by id + app_name + package for safety)
    $sql = "
        UPDATE fnd_custom_message_tab
        SET 
            btn_ok = ?,
            btn_cancel = ?,
            btn_explore = ?,
            btn_premium = ?,
            btn_visit = ?,
            btn_download = ?,
            btn_invite = ?,
            iap = ?,
            case_subcase_id = ?,
            navigate_url = ?,
            valid_from = ?,
            valid_to = ?,
            onetime = ?,
            target_group = ?,
            language = ?,
            mobile_height = ?,
            tablet_height = ?
        WHERE
            firebase_ad_id = ?
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        error_log("Prepare failed: " . $mysqli->error);
        return 0;
    }

    // types: s + 8*i + 4*s + i + 6*s + 3*s (WHERE) = 23 params
    $stmt->bind_param(
        "iiiiiiiissssisssss",
        $btn_ok,
        $btn_cancel,
        $btn_explore,
        $btn_premium,
        $btn_visit,
        $btn_download,
        $btn_invite,
        $iap,
        $case_subcase_id,
        $navigate_url,
        $valid_from,
        $valid_to,
        $onetime,
        $target_group,
        $language,
        $mobile_height,
        $tablet_height,
        $firebase_ad_id
    );

    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        return 0;
    }

    $updated_count = $stmt->affected_rows;
    $stmt->close();

    return $updated_count; // 0 if no row matched/changed, >0 if updated
}

//This use for Pause the fnd_android_custom_message_tab (Dev Table)
function PauseDevAndroidCustomAdsAdsMesssage($mysqli, $firebase_ad_id) {
    if (empty($firebase_ad_id)) {
        return false;
    }

    // Subtract 10 years from the row's current valid_to.
    // If valid_to is empty/zero/NULL, fall back to NOW() before subtracting.
    $sql = "
        UPDATE fnd_android_custom_message_tab
        SET valid_to = DATE_SUB(
            COALESCE(
                NULLIF(NULLIF(NULLIF(valid_to, ''), '0000-00-00'), '0000-00-00 00:00:00'),
                NOW()
            ),
            INTERVAL 10 YEAR
        )
        WHERE firebase_ad_id = ?
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        error_log('Prepare failed: ' . $mysqli->error);
        return false;
    }

    $stmt->bind_param("s", $firebase_ad_id);

    if (!$stmt->execute()) {
        error_log('Execute failed: ' . $stmt->error);
        $stmt->close();
        return false;
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    // success if at least one row was updated
    return $affected > 0;
}

//This use for Pause the fnd_custom_message_tab (Live Table)
function PauseLiveAndroidCustomAdsAdsMesssage($mysqli, $firebase_ad_id) {
    if (empty($firebase_ad_id)) {
        return false;
    }

    // Subtract 10 years from the row's current valid_to.
    // If valid_to is empty/zero/NULL, fall back to NOW() before subtracting.
    $sql = "
        UPDATE fnd_custom_message_tab
        SET valid_to = DATE_SUB(
            COALESCE(
                NULLIF(NULLIF(NULLIF(valid_to, ''), '0000-00-00'), '0000-00-00 00:00:00'),
                NOW()
            ),
            INTERVAL 10 YEAR
        )
        WHERE firebase_ad_id = ?
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        error_log('Prepare failed: ' . $mysqli->error);
        return false;
    }

    $stmt->bind_param("s", $firebase_ad_id);

    if (!$stmt->execute()) {
        error_log('Execute failed: ' . $stmt->error);
        $stmt->close();
        return false;
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    // success if at least one row was updated
    return $affected > 0;
}

//This use for Resume the fnd_android_custom_message_tab (Dev Table)
function ResumeDevAndroidCustomAdsAdsMesssage($mysqli, $firebase_ad_id) {
    if (empty($firebase_ad_id)) {
        return false;
    }

    $sql = "
        UPDATE fnd_android_custom_message_tab
        SET valid_to = DATE_ADD(
            COALESCE(
                NULLIF(NULLIF(NULLIF(valid_to, ''), '0000-00-00'), '0000-00-00 00:00:00'),
                NOW()
            ),
            INTERVAL 10 YEAR
        )
        WHERE firebase_ad_id = ?
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        error_log('Prepare failed: ' . $mysqli->error);
        return false;
    }

    $stmt->bind_param('s', $firebase_ad_id);

    if (!$stmt->execute()) {
        error_log('Execute failed: ' . $stmt->error);
        $stmt->close();
        return false;
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    // success if at least one row was updated
    return $affected > 0;
}

//This use for Resume the fnd_custom_message_tab (Live Table)
function ResumeLiveAndroidCustomAdsAdsMesssage($mysqli, $firebase_ad_id) {
    if (empty($firebase_ad_id)) {
        return false;
    }

    $sql = "
        UPDATE fnd_custom_message_tab
        SET valid_to = DATE_ADD(
            COALESCE(
                NULLIF(NULLIF(NULLIF(valid_to, ''), '0000-00-00'), '0000-00-00 00:00:00'),
                NOW()
            ),
            INTERVAL 10 YEAR
        )
        WHERE firebase_ad_id = ?
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        error_log('Prepare failed: ' . $mysqli->error);
        return false;
    }

    $stmt->bind_param('s', $firebase_ad_id);

    if (!$stmt->execute()) {
        error_log('Execute failed: ' . $stmt->error);
        $stmt->close();
        return false;
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    // success if at least one row was updated
    return $affected > 0;
}

//This is use for Stop the record from the fnd_android_custom_message_tab (Dev Table)
function StopDevAndroidCustomAdsAdsMesssage($mysqli, $firebase_ad_id) {
    // Sanitize input
    $firebase_ad_id = $mysqli->real_escape_string($firebase_ad_id);

    // SQL DELETE query
    $sql = "DELETE FROM fnd_android_custom_message_tab WHERE firebase_ad_id = '$firebase_ad_id'";

    if ($mysqli->query($sql) === TRUE) {
        return true;  // Record deleted successfully
    } else {
        error_log("MySQL Error: " . $mysqli->error);
        return false; // Deletion failed
    }
}

//This use for Stop the fnd_custom_message_tab (Live Table)
function StopLiveAndroidCustomAdsAdsMesssage($mysqli, $firebase_ad_id) {
    if (empty($firebase_ad_id)) {
        return false;
    }

    // Subtract 10 years from the row's current valid_to.
    // If valid_to is empty/zero/NULL, fall back to NOW() before subtracting.
    $sql = "
        UPDATE fnd_custom_message_tab
        SET valid_to = DATE_SUB(
            COALESCE(
                NULLIF(NULLIF(NULLIF(valid_to, ''), '0000-00-00'), '0000-00-00 00:00:00'),
                NOW()
            ),
            INTERVAL 10 YEAR
        )
        WHERE firebase_ad_id = ?
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        error_log('Prepare failed: ' . $mysqli->error);
        return false;
    }

    $stmt->bind_param("s", $firebase_ad_id);

    if (!$stmt->execute()) {
        error_log('Execute failed: ' . $stmt->error);
        $stmt->close();
        return false;
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    // success if at least one row was updated
    return $affected > 0;
}




function DeleteAndroidCustomAdsAdsMesssage($mysqli,$firebase_ad_id) {

      $valid_from = '2099-12-31 00:00:00';
    if ($insert_stmt = $mysqli->prepare("UPDATE fnd_custom_message_tab SET valid_from=? WHERE firebase_ad_id=?")) {
    	$insert_stmt->bind_param('ss', $valid_from, $firebase_ad_id);
            
        if ( $insert_stmt->execute()) {
          //  echo $email;
            return true;
        }else{	
             echo $mysqli->error;
			return false;
		}
	}else{
        echo  $mysqli->error;
		return false;
	}
};


//IOS

function InsertIOSCustomAdsAdsMesssage($mysqli, $firebase_ad_id, $content, $btn_name_english, $btn_name_german, $btn_name_spanish,$btn_name_french, $btn_name_portuguese, $btn_name_russian, $btn_name_chinese,$btn_close_bottom, $btn_close_top, $btn_color, $navigate_url,$valid_from, $valid_to, $onetime, $target_group, $language) {
      $btn_close_bottom = (int)$btn_close_bottom;
    $btn_close_top    = (int)$btn_close_top;
    $onetime          = (int)$onetime;

    $sql = "INSERT INTO tbl_ios_custom_message_tab
            (firebase_ad_id,
             content,
             btn_name_english,
             btn_name_german,
             btn_name_spanish,
             btn_name_french,
             btn_name_portuguese,
             btn_name_russian,
             btn_name_chinese,
             btn_close_bottom,
             btn_close_top,
             btn_color,
             navigate_url,
             valid_from,
             valid_to,
             onetime,
             target_group,
             language)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

    if (!$stmt = $mysqli->prepare($sql)) {
        return ['success' => false, 'error' => 'Prepare failed: '.$mysqli->error];
    }

    // types: 9 strings, 2 ints, 4 strings, 1 int, 2 strings = 17 params
    $types = 'sssssssss' . 'ii' . 'ssss' . 'i' . 'ss';

    if (!$stmt->bind_param(
        $types,
        $firebase_ad_id,
        $content,
        $btn_name_english,
        $btn_name_german,
        $btn_name_spanish,
        $btn_name_french,
        $btn_name_portuguese,
        $btn_name_russian,
        $btn_name_chinese,
        $btn_close_bottom,
        $btn_close_top,
        $btn_color,
        $navigate_url,
        $valid_from,   // e.g. 'YYYY-MM-DD HH:MM:SS'
        $valid_to,     // e.g. 'YYYY-MM-DD HH:MM:SS'
        $onetime,
        $target_group,
        $language
    )) {
        $err = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['success' => false, 'error' => 'Bind failed: '.$err];
    }

    if (!$stmt->execute()) {
        $err = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['success' => false, 'error' => 'Execute failed: '.$err];
    }

    $insertId = $stmt->insert_id ?: $mysqli->insert_id;
    $stmt->close();

    return true;
}

function UpdateIOSCustomAdsMessage($mysqli,$firebase_ad_id, $content,$btn_name_english,$btn_name_german,$btn_name_spanish,$btn_name_french,$btn_name_portuguese,$btn_name_russian,$btn_name_chinese,$btn_close_bottom,$btn_close_top,$btn_color,$navigate_url,$valid_from,$valid_to,$onetime,$target_group,$language) {
    
    $btn_close_bottom = (int)$btn_close_bottom;
    $btn_close_top    = (int)$btn_close_top;
    $onetime          = (int)$onetime;

    $sql = "UPDATE tbl_ios_custom_message_tab
            SET content = ?,
                btn_name_english = ?,
                btn_name_german = ?,
                btn_name_spanish = ?,
                btn_name_french = ?,
                btn_name_portuguese = ?,
                btn_name_russian = ?,
                btn_name_chinese = ?,
                btn_close_bottom = ?,
                btn_close_top = ?,
                btn_color = ?,
                navigate_url = ?,
                valid_from = ?,
                valid_to = ?,
                onetime = ?,
                target_group = ?,
                language = ?
            WHERE firebase_ad_id = ?";

    if (!$stmt = $mysqli->prepare($sql)) {
        return ['success' => false, 'error' => 'Prepare failed: '.$mysqli->error];
    }

    // types: 9 strings, 2 ints, 4 strings, 1 int, 2 strings, 1 string (firebase_ad_id) = 18 params
    $types = 'sssssssss' . 'ii' . 'ssss' . 'is';

    if (!$stmt->bind_param(
        $types,
        $content,
        $btn_name_english,
        $btn_name_german,
        $btn_name_spanish,
        $btn_name_french,
        $btn_name_portuguese,
        $btn_name_russian,
        $btn_name_chinese,
        $btn_close_bottom,
        $btn_close_top,
        $btn_color,
        $navigate_url,
        $valid_from,
        $valid_to,
        $onetime,
        $target_group,
        $language,
        $firebase_ad_id // used in WHERE clause
    )) {
        $err = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['success' => false, 'error' => 'Bind failed: '.$err];
    }

    if (!$stmt->execute()) {
        $err = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ['success' => false, 'error' => 'Execute failed: '.$err];
    }

    $affectedRows = $stmt->affected_rows;
    $stmt->close();

    return true;
}

function DeleteIOSCustomAdsAdsMesssage($mysqli,$firebase_ad_id) {

      $valid_from = '2099-12-31 00:00:00';
    if ($insert_stmt = $mysqli->prepare("UPDATE fnd_ios_custom_message_tab SET valid_from=? WHERE firebase_ad_id=?")) {
    	$insert_stmt->bind_param('ss', $valid_from, $firebase_ad_id);
            
        if ( $insert_stmt->execute()) {
          //  echo $email;
            return true;
        }else{	
             echo $mysqli->error;
			return false;
		}
	}else{
        echo  $mysqli->error;
		return false;
	}
};


?>
