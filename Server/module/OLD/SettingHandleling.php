<?php
if (function_exists('Authorized')) {
    if($_POST['db']!=0){
        if ($tag == "SET_ADMOB_SETTINGS") {
            if(isset($_POST['type']) && isset($_POST['value'])){
                $response["success"] = TRUE;
                $type = $_POST['type'];
                $value=$_POST['value'];
                if(SetAdmobSetting($mysqli,$type,$value)){
                    $response["db"] = $_POST['db'];
                    $response["value"] = $value;
                    $response["success"] = true;
                }else{
                  $response["success"] = FALSE;
                  $response["error_msg"] = "Error Occured while updating";
                }
                echo json_encode($response);
                EXIT(); 
            }else{
                $response["success"] = FALSE;
                $response["error_msg"] = "(type,value) parameters are missing";
                echo json_encode($response);
                Exit();                
            }

        // }else if ($tag == "GET_STRING_SETTING") {
        //     if(isset($_POST['name'])){
        //         $name = $_POST['name'];
        //         $response["success"] = TRUE;
        //         $response["setting"]=GetStringSetting($mysqli,$name);
        //         echo json_encode($response);
        //         EXIT(); 
        //     }else{
        //         $response["success"] = FALSE;
        //         $response["error_msg"] = "{name} are missing";
        //         echo json_encode($response);
        //         Exit();                
        //     } 
        // }else if ($tag == "GET_INT_SETTING") {
        //     if(isset($_POST['name'])){
        //         $name = $_POST['name'];
        //         $response["success"] = TRUE;
        //         $response["setting"]=GetIntSetting($mysqli,$name);
        //         echo json_encode($response);
        //         EXIT(); 
        //     }else{
        //         $response["success"] = FALSE;
        //         $response["error_msg"] = "{name} are missing";
        //         echo json_encode($response);
        //         Exit();                
        //     }
        // }else if ($tag == "GET_ALL_SETTINGS") {
        //     $response["success"] = TRUE;
        //     $response["setting"]=GetSettings($mysqli);
        //     echo json_encode($response);
        //     EXIT(); 
        // }else if ($tag == "GET_ADMOB_SETTINGS") {
        //     $response["success"] = TRUE;
        //     $response["setting"]=GetAdmobSettings($mysqli);
        //     echo json_encode($response);
        //     EXIT(); 
        // }else if ($tag == "GET_APP_LINK_SETTINGS") {
        //     $response["success"] = TRUE;
        //     $response["feedback"]=GetAppLinksSettings($mysqli);
        //     echo json_encode($response);
        //     EXIT(); 
        // }else if ($tag == "SET_INT_SETTING") {
        //     if(isset($_POST['name']) && isset($_POST['value'])){
        //         $name = $_POST['name'];
        //         $value = $_POST['value'];
        //         if(SetIntSetting($mysqli,$name,$value)){
        //             $response["success"] = true;
        //         }else{
        //           $response["success"] = FALSE;
        //           $response["error_msg"] = "Error Occured while updating";
        //         }
        //         echo json_encode($response);
        //         EXIT(); 
        //     }else{
        //         $response["success"] = FALSE;
        //         $response["error_msg"] = "{name,value} are missing";
        //         echo json_encode($response);
        //         Exit();                
        //     }
        // }else if ($tag == "SET_STRING_SETTING") {
        //     if(isset($_POST['name']) && isset($_POST['value'])){
        //         $name = $_POST['name'];
        //         $value = $_POST['value'];
        //         if(SetStringSetting($mysqli,$name,$value)){
        //             $response["success"] = true;
        //         }else{
        //           $response["success"] = FALSE;
        //           $response["error_msg"] = "Error Occured while updating";
        //         }
        //         echo json_encode($response);
        //         EXIT(); 
        //     }else{
        //         $response["success"] = FALSE;
        //         $response["error_msg"] = "{name,value} are missing";
        //         echo json_encode($response);
        //         Exit();                
        //     }
         }
    }else{
        if ($tag == "GET_ADMOB_SETTING") {
            if(isset($_POST['type'])){
                $response["success"] = TRUE;
                $type = $_POST['type'];
    
                $appInfo = GetAppInfo($main_mysqli);
        
                if ($appInfo !== false) {
    
                    foreach ($appInfo as $app) {
                            
                        $appId = $app['id'];
                        $appName = $app['name'];
                        $appIconUrl = $app['icon_url'];
                        $appOrder = $app['app_order'];
                        $mysqli=SwapDatabase($main_mysqli,$appId);
                            
                        $response["AdmobLst"][$appId]["app_id"]=$appId;
                        $response["AdmobLst"][$appId]["app_name"]=$appName;
                        $response["AdmobLst"][$appId]["type"]=$type;
                        $response["AdmobLst"][$appId]["enabled"]=IsAdmobSettingEnabled($mysqli,$type);
    
                    }
    
                } else {
                    $response["success"] = FALSE;
                }
    
                echo json_encode($response);
                EXIT();
            }else{
                $response["success"] = FALSE;
                $response["error_msg"] = "(type) parameters are missing";
                echo json_encode($response);
                Exit();                
            }
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
//EXIT();



function IsAdmobSettingEnabled($mysqli,$type) {

    if($type=="B"){
        return SettingEnabled($mysqli,'ADMOB_BANNER_ADS');
    }else if($type=="I"){
        return SettingEnabled($mysqli,'ADMOB_INTERSTITIAL_AD');
    }else if($type=="O"){
        return SettingEnabled($mysqli,'ADMOB_APP_OPEN_AD');
    }else if($type=="N"){
        return SettingEnabled($mysqli,'ADMOB_NATIVE_ADS');
    }else if($type=="R"){
        return SettingEnabled($mysqli,'ADMOB_REWARD_ADS');
    }else{
        return false;
    }

};

function SetAdmobSetting($mysqli,$type,$value) {

    if($type=="B"){
        return SetIntSetting($mysqli,'ADMOB_BANNER_ADS',$value);
    }else if($type=="I"){
        return SetIntSetting($mysqli,'ADMOB_INTERSTITIAL_AD',$value);
    }else if($type=="O"){
        return SetIntSetting($mysqli,'ADMOB_APP_OPEN_AD',$value);
    }else if($type=="N"){
        return SetIntSetting($mysqli,'ADMOB_NATIVE_ADS',$value);
    }else if($type=="R"){
        return SetIntSetting($mysqli,'ADMOB_REWARD_ADS',$value);
    }else{
        return false;
    }

};


function SetIntSetting($mysqli,$name,$value) {
 
    if ($update_stmt = $mysqli->prepare("UPDATE fnd_settings_tab f set int_value=? where name=? ")) {
    	$update_stmt->bind_param('is', $value,$name);
        if ( $update_stmt->execute()) {
            return true;
        }else{	
			return false;
		}
	}else{
		return false;
	}
};




// function GetStringSetting($mysqli,$value) {
//     $prep_stmt = "SELECT string_value FROM fnd_settings_tab where name=?";
//     $stmt = $mysqli->prepare($prep_stmt);
//     if ($stmt) {
//               $stmt->bind_param('s', $value);
//         if ($stmt->execute()) {
//             $result = get_result($stmt);
//             $stmt->close();
//             if ($result != null) {
//               return $result[0]["string_value"];
//             } else {
//                 return "";
//             }
//         } else {
//             return "";
//         }
//     } else {
//         return "";
//     }
// };

// function GetIntSetting($mysqli,$value) {
//     $prep_stmt = "SELECT int_value FROM fnd_settings_tab where name=?";
//     $stmt = $mysqli->prepare($prep_stmt);
//     if ($stmt) {
//               $stmt->bind_param('s', $value);
//         if ($stmt->execute()) {
//             $result = get_result($stmt);
//             $stmt->close();
//             if ($result != null) {
//               return $result[0]["int_value"];
//             } else {
//                 return "";
//             }
//         } else {
//             return "";
//         }
//     } else {
//         return "";
//     }
// };


// function GetSettings($mysqli) {
 
//     $prep_stmt = "SELECT * FROM fnd_settings_tab order by name asc";
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

// function GetAdmobSettings($mysqli) {
 
//     $prep_stmt = "SELECT name,int_value as enabled FROM fnd_settings_tab WHERE name like 'ADMOB%_AD%' order by name asc";
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



// function GetAppLinksSettings($mysqli) {
 
//     $prep_stmt = "SELECT name,string_value as app_url FROM fnd_settings_tab WHERE name like '%URL' order by name asc";
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


// function SetStringSetting($mysqli,$name,$value) {
 
//     if ($update_stmt = $mysqli->prepare("UPDATE fnd_settings_tab f set string_value=? where name=? ")) {
//     	$update_stmt->bind_param('ss', $value,$name);
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