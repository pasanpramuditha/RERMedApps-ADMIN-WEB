<?php
$response=array("success"=>FALSE,"info"=>"");

if (isset($_POST['tag'])) {
    require_once '../../include/db_connect.php';
    require_once '../../include/functions.php';
    
     $tag = $_POST['tag'];
     if ($tag == "SERVER_UP") {
         $version_code = $_POST['version_code'];
         if(!GetMaintainInfo($main_mysqli,$version_code)){
             
             $response['success']=TRUE;
             $response['info']='Server available';
        
         }else{
             $response['success']=FALSE;
             $response['info']='Server not available';
         }
     }
}else{
   $response['success']=TRUE;
   $response['info']='Different requet'; 
} 
echo json_encode($response);
return;

// function IsServerUp($mysqli) {
//     $prep_stmt = "SELECT int_value FROM fnd_settings_tab where name='SERVER_UP'";
//     $stmt = $mysqli->prepare($prep_stmt);
//     if ($stmt) {
//         if ($stmt->execute()) {
//             $result = get_result($stmt);
//             $stmt->close();
//             if ($result != null) {
//                 if($result[0]["int_value"]==1){
//                     return true;
//                 }else{
//                     return false;
//                 }
//             } else {
//                 return false;
//             }
//         } else {
//             return false;
//         }
//     } else {
//         return false;
//     }
// };

function GetMaintainInfo($mysqli, $version_code) {

    $prep_stmt = "SELECT under_maintain FROM fnd_app_config_tab WHERE version_code= ? LIMIT 1";
    $stmt = $mysqli->prepare($prep_stmt);
      if ($stmt) {
        $stmt->bind_param('i', $version_code);
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
                if($result[0]["under_maintain"]==1){
                    return true;
                }else{
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }
};

?>