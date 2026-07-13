<?php
if (true) {
    if($_POST['db']!=0){
         if ($tag == "IOS_GET_APP_CONFIG" || $tag == "GET_APP_CONFIG") {
            $response["success"] = TRUE;
            $response["appconfig"]=GetAppConfig($mysqli);
            $response["result"]=$response["appconfig"];
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_GET_SIMILAR_APPS" || $tag == "GET_SIMILAR_APPS") {
            $response["success"] = TRUE;
            $response["feedback"]=GetSimilarApps($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_GET_APP_UPDATE" || $tag == "GET_APP_UPDATE") {
            $response["success"] = TRUE;
            $response["feedback"]=GetAppUpdate($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_GET_APP_SETTINGS" || $tag == "GET_APP_SETTINGS") {
            $response["success"] = TRUE;
            $response["result"]=GetAppSettings($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_GET_APP_FONTSIZE" || $tag == "GET_APP_FONTSIZE") {
            $response["success"] = TRUE;
            $response["result"]=GetAppFontsize($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_GET_ADMOB" || $tag == "GET_ADMOB") {
            $response["success"] = TRUE;
            $response["result"]=GetAdmob($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_GET_NAVIGATION" || $tag == "GET_NAVIGATION") {
            $response["success"] = TRUE;
            $response["result"]=GetNav($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_GET_PROMO" || $tag == "GET_PROMO") {
            $response["success"] = TRUE;
            $response["result"]=GetIosPromoSettings($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_SAVE_APP_CONFIG_SETTINGS" || $tag == "SAVE_IOS_APP_CONFIG_SETTINGS") {
            $settings = ios_app_decode_json_post_field('settings');
            echo json_encode(SaveIosAppConfigSettings($mysqli, $settings));
            EXIT(); 
        }else if ($tag == "IOS_SAVE_APP_FONTSIZE" || $tag == "SAVE_APP_FONTSIZE") {
            $font_sizes = ios_app_decode_json_post_field('fontsizes');
            echo json_encode(SaveIosFontSizes($mysqli, $font_sizes));
            EXIT(); 
        }else if ($tag == "IOS_SAVE_NAVIGATION" || $tag == "SAVE_NAVIGATION") {
            $settings = ios_app_decode_json_post_field('settings');
            echo json_encode(SaveIosNavigationSettings($mysqli, $settings));
            EXIT(); 
        }else if ($tag == "IOS_SAVE_APP_PROMO" || $tag == "SAVE_APP_PROMO") {
            $promos = ios_app_decode_json_post_field('promos');
            echo json_encode(SaveIosPromoSettings($mysqli, $promos));
            EXIT(); 
        }else if ($tag == "IOS_UPDATE_SIMILAR_APP_VISIBILITY" || $tag == "UPDATE_SIMILAR_APP_VISIBILITY") {
            echo json_encode(UpdateIosSimilarAppVisibility($mysqli));
            EXIT(); 
        }else if ($tag == "IOS_ADD_SIMILAR_APP" || $tag == "ADD_SIMILAR_APP") {
            echo json_encode(SaveIosSimilarApp($mysqli, false));
            EXIT(); 
        }else if ($tag == "IOS_UPDATE_SIMILAR_APP" || $tag == "UPDATE_SIMILAR_APP") {
            echo json_encode(SaveIosSimilarApp($mysqli, true));
            EXIT(); 
        }else if ($tag == "UPDATE_APP_CONFIG_TAB") {
            $response["success"] = TRUE;
            
            $result = UpdateAppConfigTab($mysqli);
        
            
             echo json_encode($response);
            EXIT(); 
        }else if ($tag == "IOS_UPDATE_APP_UPDATE" || $tag == "UPDATE_APP_UPDATE_TAB") {
            $response["success"] = TRUE;
            
            $result = UpdateAppUpdateTab($mysqli);
        
            
             echo json_encode($response);
            EXIT(); 
        }else if ($tag == "UPDATE_APP_SETTINGS_TAB") {
            $response["success"] = TRUE;
            
            $response = UpdateAppSettingsTab($mysqli);
            echo json_encode($response);
            exit();
        
            
             echo json_encode($response);
            EXIT(); 
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


function GetAppConfig($mysqli) {
 
    $prep_stmt = "SELECT a.id,a.param,a.int_value,string_value,comment FROM fnd_ios_app_config_tab a";
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

function UpdateAppConfigTab($mysqli) {
    $response = ["success" => false];

    // Read JSON body from request
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // Validate and extract settings
    if (isset($data['settings']) && is_array($data['settings'])) {
        $settings = $data['settings'];
        $allSuccess = true;

        foreach ($settings as $setting) {
            $param = isset($setting['param']) ? $setting['param'] : '';
            $int_value = isset($setting['int_value']) ? $setting['int_value'] : null;
            $string_value = isset($setting['string_value']) ? $setting['string_value'] : null;

            if (empty($param)) continue; // skip invalid entries

            // Prepare update statement
            $stmt = $mysqli->prepare("
                UPDATE fnd_ios_app_config_tab 
                SET int_value = ?, string_value = ?
                WHERE param = ?
            ");

            if ($stmt) {
                $stmt->bind_param("sss", $int_value, $string_value, $param);
                if (!$stmt->execute()) {
                    $allSuccess = false;
                }
                $stmt->close();
            } else {
                $allSuccess = false;
            }
        }

        $response["success"] = $allSuccess;
        $response["message"] = $allSuccess
            ? "All configuration values updated successfully"
            : "Some configuration values failed to update";
    } else {
        $response["message"] = "Invalid or missing settings data";
    }

    return $response;
}


function GetSimilarApps($mysqli) {
 
    $prep_stmt = "SELECT id,app_name,app_name_en,app_name_de,app_name_es,app_name_fr,app_name_pt,app_name_ru,app_name_zh,app_name_ja,app_name_ko,app_name_it,app_name_id,app_name_vi,app_name_tr,app_icon_url,apple_id,visible FROM fnd_ios_similar_apps";
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

function GetAppUpdate($mysqli) {
 
    $prep_stmt = "SELECT ver,app_update,mandatory,maintenance FROM fnd_ios_app_update_tab";
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

function UpdateAppUpdateTab($mysqli) {
    // Get POST values
    $ver = isset($_POST['ver']) ? $_POST['ver'] : '';
    $app_update = isset($_POST['app_update']) ? $_POST['app_update'] : '';
    $mandatory = isset($_POST['mandatory']) ? $_POST['mandatory'] : '';
    $maintenance = isset($_POST['maintenance']) ? $_POST['maintenance'] : '';

    // Validate that version key is provided
    if (empty($ver)) {
        return array("success" => false, "message" => "Version key (ver) is missing");
    }

    // Prepare update query
    $query = "
        UPDATE fnd_ios_app_update_tab 
        SET 
            app_update = ?,
            mandatory = ?,
            maintenance = ?
        WHERE ver = ?
    ";

    // Prepare statement
    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        return array("success" => false, "message" => "Prepare failed: " . $mysqli->error);
    }

    // Bind parameters
    $stmt->bind_param("iiis", $app_update, $mandatory, $maintenance, $ver);

    // Execute and check
    if ($stmt->execute()) {
        $result = array("success" => true, "message" => "Record updated successfully");
    } else {
        $result = array("success" => false, "message" => "Update failed: " . $stmt->error);
    }

    $stmt->close();

    return $result;
}



function GetAppSettings($mysqli) {
 
    $prep_stmt = "SELECT category,name,int_value,string_value FROM fnd_ios_settings_tab";
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

function UpdateAppSettingsTab($mysqli) {
    $result = ["success" => false, "updated" => 0, "errors" => []];

    // Read JSON body
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!isset($data['settings']) || !is_array($data['settings'])) {
        $result['errors'][] = "Invalid or missing 'settings' array.";
        return $result;
    }

    // Start a transaction so the save is atomic
    $mysqli->begin_transaction();

    // Prepare once; reuse per row
    $stmt = $mysqli->prepare("
        UPDATE fnd_ios_settings_tab
        SET int_value = ?, string_value = ?
        WHERE name = ?
    ");

    if (!$stmt) {
        $result['errors'][] = "Prepare failed: " . $mysqli->error;
        $mysqli->rollback();
        return $result;
    }

    $allOk = true;

    foreach ($data['settings'] as $row) {
        $name         = isset($row['name']) ? trim($row['name']) : '';
        $int_value    = array_key_exists('int_value', $row) ? $row['int_value'] : null;
        $string_value = array_key_exists('string_value', $row) ? $row['string_value'] : null;

        if ($name === '') { continue; } // skip invalid entries

        // Bind (use "sss" to allow NULL safely for both columns)
        $stmt->bind_param("sss", $int_value, $string_value, $name);

        if (!$stmt->execute()) {
            $allOk = false;
            $result['errors'][] = "Failed to update '$name': " . $stmt->error;
        } else {
            // affected_rows can be 0 if value is unchanged; still counts as processed
            $result['updated']++;
        }
    }

    $stmt->close();

    if ($allOk) {
        $mysqli->commit();
        $result['success'] = true;
    } else {
        $mysqli->rollback();
    }

    return $result;
}




function GetAppFontsize($mysqli) {
 
    $prep_stmt = "SELECT device,base_font_small_size,heading_font_small_size,subheading_font_small_size,base_font_medium_size,heading_font_medium_size,subheading_font_medium_size,base_font_large_size,heading_font_large_size,subheading_font_large_size FROM fnd_ios_fontsize_tab";
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

function GetAdmob($mysqli) {
 
    $prep_stmt = "SELECT ad_type,active,ad_id,top_margin,bottom_margin,custom,custom_width,custom_height,frequency,home_screen,fav_screen,content_screen FROM fnd_ios_admob_tab";
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


function GetNav($mysqli) {
 
    $prep_stmt = "SELECT param,active FROM fnd_ios_nav_tab";
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

function GetIosPromoSettings($mysqli) {
    $prep_stmt = "SELECT id,param,int_value,string_value,date_value,comment FROM fnd_ios_promo_tab ORDER BY id ASC";
    $stmt = $mysqli->prepare($prep_stmt);
    if ($stmt) {
        if ($stmt->execute()) {
            $lst = get_result($stmt);
            $stmt->close();
            return $lst;
        }
        return false;
    }
    return false;
}

function ios_app_decode_json_post_field($field) {
    $raw = isset($_POST[$field]) ? $_POST[$field] : '[]';
    $decoded = json_decode((string)$raw, true);
    if (!is_array($decoded)) {
        return [];
    }
    return $decoded;
}

function SaveIosAppConfigSettings($mysqli, $settings) {
    foreach ($settings as $setting) {
        if (!is_array($setting)) {
            return ["success" => false, "message" => "Invalid setting row."];
        }

        $param = trim((string)($setting['param'] ?? $setting['name'] ?? ''));
        if ($param === '') {
            continue;
        }

        $int_value = array_key_exists('int_value', $setting) && $setting['int_value'] !== null && $setting['int_value'] !== '' ? (int)$setting['int_value'] : null;
        $string_value = array_key_exists('string_value', $setting) && $setting['string_value'] !== null ? (string)$setting['string_value'] : null;

        $updated = UpdateIosNamedSetting($mysqli, 'fnd_ios_settings_tab', 'name', $param, $int_value, $string_value);
        if (!$updated['success']) {
            return $updated;
        }

        $updated = UpdateIosNamedSetting($mysqli, 'fnd_ios_app_config_tab', 'param', $param, $int_value, $string_value);
        if (!$updated['success']) {
            return $updated;
        }
    }

    return ["success" => true];
}

function UpdateIosNamedSetting($mysqli, $table, $key_column, $param, $int_value, $string_value) {
    $sql = "UPDATE $table SET int_value = ?, string_value = ? WHERE $key_column = ?";
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return ["success" => false, "message" => $mysqli->error];
    }

    $stmt->bind_param('iss', $int_value, $string_value, $param);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "message" => $error];
    }

    $stmt->close();
    return ["success" => true];
}

function SaveIosFontSizes($mysqli, $font_sizes) {
    $stmt = $mysqli->prepare('UPDATE fnd_ios_fontsize_tab SET base_font_small_size = ?, heading_font_small_size = ?, subheading_font_small_size = ?, base_font_medium_size = ?, heading_font_medium_size = ?, subheading_font_medium_size = ?, base_font_large_size = ?, heading_font_large_size = ?, subheading_font_large_size = ? WHERE device = ?');
    if (!$stmt) {
        return ["success" => false, "message" => $mysqli->error];
    }

    foreach ($font_sizes as $row) {
        $device = trim((string)($row['device'] ?? ''));
        if ($device === '') {
            continue;
        }

        $base_small = (int)($row['base_font_small_size'] ?? 0);
        $heading_small = (int)($row['heading_font_small_size'] ?? 0);
        $subheading_small = (int)($row['subheading_font_small_size'] ?? 0);
        $base_medium = (int)($row['base_font_medium_size'] ?? 0);
        $heading_medium = (int)($row['heading_font_medium_size'] ?? 0);
        $subheading_medium = (int)($row['subheading_font_medium_size'] ?? 0);
        $base_large = (int)($row['base_font_large_size'] ?? 0);
        $heading_large = (int)($row['heading_font_large_size'] ?? 0);
        $subheading_large = (int)($row['subheading_font_large_size'] ?? 0);

        $stmt->bind_param('iiiiiiiiis', $base_small, $heading_small, $subheading_small, $base_medium, $heading_medium, $subheading_medium, $base_large, $heading_large, $subheading_large, $device);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            return ["success" => false, "message" => $error];
        }
    }

    $stmt->close();
    return ["success" => true];
}

function SaveIosNavigationSettings($mysqli, $settings) {
    $stmt = $mysqli->prepare('UPDATE fnd_ios_nav_tab SET active = ? WHERE param = ?');
    if (!$stmt) {
        return ["success" => false, "message" => $mysqli->error];
    }

    foreach ($settings as $row) {
        $param = trim((string)($row['param'] ?? ''));
        if ($param === '') {
            continue;
        }

        $active = (int)($row['active'] ?? $row['int_value'] ?? 0);
        $stmt->bind_param('is', $active, $param);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            return ["success" => false, "message" => $error];
        }
    }

    $stmt->close();
    return ["success" => true];
}

function SaveIosPromoSettings($mysqli, $promos) {
    $stmt = $mysqli->prepare('UPDATE fnd_ios_promo_tab SET int_value = ?, string_value = ?, date_value = ? WHERE param = ?');
    if (!$stmt) {
        return ["success" => false, "message" => $mysqli->error];
    }

    foreach ($promos as $row) {
        $param = trim((string)($row['param'] ?? ''));
        if ($param === '') {
            continue;
        }

        $int_value = array_key_exists('int_value', $row) && $row['int_value'] !== null && $row['int_value'] !== '' ? (int)$row['int_value'] : null;
        $string_value = array_key_exists('string_value', $row) && $row['string_value'] !== null && $row['string_value'] !== '' ? (string)$row['string_value'] : null;
        $date_value = array_key_exists('date_value', $row) && $row['date_value'] !== null && $row['date_value'] !== '' ? (string)$row['date_value'] : null;

        $stmt->bind_param('isss', $int_value, $string_value, $date_value, $param);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            return ["success" => false, "message" => $error];
        }
    }

    $stmt->close();
    return ["success" => true];
}

function UpdateIosSimilarAppVisibility($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    $visible = (int)($_POST['visible'] ?? 0);
    if ($id <= 0) {
        return ["success" => false, "message" => "Similar app id is required."];
    }

    $stmt = $mysqli->prepare('UPDATE fnd_ios_similar_apps SET visible = ? WHERE id = ?');
    if (!$stmt) {
        return ["success" => false, "message" => $mysqli->error];
    }

    $stmt->bind_param('ii', $visible, $id);
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "message" => $error];
    }

    $stmt->close();
    return ["success" => true];
}

function SaveIosSimilarApp($mysqli, $is_update) {
    $fields = ['app_name', 'app_name_en', 'app_name_de', 'app_name_es', 'app_name_fr', 'app_name_pt', 'app_name_ru', 'app_name_zh', 'app_name_ja', 'app_name_ko', 'app_name_it', 'app_name_id', 'app_name_vi', 'app_name_tr', 'app_icon_url', 'apple_id'];
    $values = [];
    foreach ($fields as $field) {
        $values[$field] = (string)($_POST[$field] ?? '');
    }

    if ($is_update) {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            return ["success" => false, "message" => "Similar app id is required."];
        }

        $stmt = $mysqli->prepare('UPDATE fnd_ios_similar_apps SET app_name = ?, app_name_en = ?, app_name_de = ?, app_name_es = ?, app_name_fr = ?, app_name_pt = ?, app_name_ru = ?, app_name_zh = ?, app_name_ja = ?, app_name_ko = ?, app_name_it = ?, app_name_id = ?, app_name_vi = ?, app_name_tr = ?, app_icon_url = ?, apple_id = ? WHERE id = ?');
        if (!$stmt) {
            return ["success" => false, "message" => $mysqli->error];
        }

        $stmt->bind_param('ssssssssssssssssi', $values['app_name'], $values['app_name_en'], $values['app_name_de'], $values['app_name_es'], $values['app_name_fr'], $values['app_name_pt'], $values['app_name_ru'], $values['app_name_zh'], $values['app_name_ja'], $values['app_name_ko'], $values['app_name_it'], $values['app_name_id'], $values['app_name_vi'], $values['app_name_tr'], $values['app_icon_url'], $values['apple_id'], $id);
    } else {
        $visible = 1;
        $stmt = $mysqli->prepare('INSERT INTO fnd_ios_similar_apps (app_name, app_name_en, app_name_de, app_name_es, app_name_fr, app_name_pt, app_name_ru, app_name_zh, app_name_ja, app_name_ko, app_name_it, app_name_id, app_name_vi, app_name_tr, app_icon_url, apple_id, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        if (!$stmt) {
            return ["success" => false, "message" => $mysqli->error];
        }

        $stmt->bind_param('ssssssssssssssssi', $values['app_name'], $values['app_name_en'], $values['app_name_de'], $values['app_name_es'], $values['app_name_fr'], $values['app_name_pt'], $values['app_name_ru'], $values['app_name_zh'], $values['app_name_ja'], $values['app_name_ko'], $values['app_name_it'], $values['app_name_id'], $values['app_name_vi'], $values['app_name_tr'], $values['app_icon_url'], $values['apple_id'], $visible);
    }

    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        return ["success" => false, "message" => $error];
    }

    $stmt->close();
    return ["success" => true];
}

// function GetPendingFeedback($mysqli) {
 
//     $prep_stmt = "SELECT f.id,f.subject,f.message,f.created_date,f.from_email,f.app_version,f.resolution,f.resolved,f.seen,r.country,r.registered_date,r.last_online,r.language,r.firstname,r.lastname FROM fnd_feedback_tab f,fnd_registration_tab r where f.from_email=r.email AND resolved=0   order by f.created_date desc";
//     $stmt = $mysqli->prepare($prep_stmt);
//       if ($stmt) {
//       // $stmt->bind_param('s', $email);
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

// function GetResolvedFeedback($mysqli) {
 
//     $prep_stmt = "SELECT f.id,f.subject,f.message,f.created_date,f.from_email,f.app_version,f.resolution,f.resolved,f.seen,r.country,r.registered_date,r.last_online,r.language,r.firstname,r.lastname FROM fnd_feedback_tab f,fnd_registration_tab r where f.from_email=r.email AND resolved=1 and seen=0 order by f.created_date desc";
//     $stmt = $mysqli->prepare($prep_stmt);
//       if ($stmt) {
//       // $stmt->bind_param('s', $email);
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

// function GetArchivedFeedback($mysqli) {
 
//     $prep_stmt = "SELECT f.id,f.subject,f.message,f.created_date,f.from_email,f.app_version,f.resolution,f.resolved,f.seen,r.country,r.registered_date,r.last_online,r.language,r.firstname,r.lastname FROM fnd_feedback_tab f,fnd_registration_tab r where f.from_email=r.email AND resolved=1 and seen=1 order by f.created_date desc";
//     $stmt = $mysqli->prepare($prep_stmt);
//       if ($stmt) {
//       // $stmt->bind_param('s', $email);
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

// function SetFeedbackResolved($mysqli,$id,$resolution) {
 
//     if ($update_stmt = $mysqli->prepare("UPDATE fnd_feedback_tab f set resolution=?,resolved=1,seen=0 where id=? ")) {
//     	$update_stmt->bind_param('si', $resolution,$id);
//         if ( $update_stmt->execute()) {
//             return true;
//         }else{	
// 			return false;
// 		}
// 	}else{
// 		return false;
// 	}
// };
// function SetFeedbackArchived($mysqli,$id) {
 
//     if ($update_stmt = $mysqli->prepare("UPDATE fnd_feedback_tab f set resolved=1,seen=1 where id=? ")) {
//     	$update_stmt->bind_param('i', $id);
//         if ( $update_stmt->execute()) {
//             return true;
//         }else{	
// 			return false;
// 		}
// 	}else{
// 		return false;
// 	}
// };

// function DeleteFeedback($mysqli,$id) {
 
//     if ($update_stmt = $mysqli->prepare("DELETE from  fnd_feedback_tab where id=? ")) {
//     	$update_stmt->bind_param('i',$id);
//         if ( $update_stmt->execute()) {
//             return true;
//         }else{	
// 			return false;
// 		}
// 	}else{
// 		return false;
// 	}
// };

?>
