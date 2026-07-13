<?php
require './vendor/autoload.php';


use GuzzleHttp\Client;

if (function_exists('Authorized')) {
 
    if($_POST['db']!=0){
    
        if ($tag == "SEND_NOTIFICATION") {
            if(isset($_POST['user_email']) && isset($_POST['title'])&& isset($_POST['message'])){
                $db=$_POST['db'];
                $user_email = $_POST['user_email'];
                $title = $_POST['title'];
                $message= $_POST['message'];
                
                if(SendNotification($main_mysqli,$db,$user_email,$title,$message)){
                  $response["success"] = TRUE;  
                }else{
                    $response["success"] = FALSE;  
                }

                echo json_encode($response);
                EXIT(); 
            }else{
                $response["success"] = FALSE;
                $response["error_msg"] = "{user_email,title,message} are missing";
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



function SendNotification($main_mysqli,$db,$user_mail,$title,$body) {   
    $mysqli=SwapDatabase($main_mysqli,$db);
    $fcm_token=GetFirebaseToken($mysqli,$user_mail);
    $appInfo= GetAppSecuredInfo($main_mysqli,$db);
    
    if ($appInfo !== false) {
    
        foreach ($appInfo as $app) {
                            
            $appId = $app['id'];
            $appName = $app['name'];
            $privateKey = $app['private_key'];
            $endpoint = $app['endpoint'];
            $clientId = $app['client_id'];
            $clientEmail = $app['client_email'];
           SendNotification_($privateKey,$clientId,$clientEmail,$endpoint,$fcm_token,$title,$body);
           return true;
        }
    
    } else {
        $response["success"] = FALSE;
    }
    return false;

}

function GetAccessToken($privateKey,$clientId,$clientEmail) {

    $jwtHeader = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $now = time();

    $payload = [
        'iss' => $clientEmail,
        'sub' => $clientEmail,
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging'
    ];

    $jwtPayload = base64_encode(json_encode($payload));
    $data = "$jwtHeader.$jwtPayload";

    $privateKeyId = openssl_pkey_get_private($privateKey);

    if ($privateKeyId) {
        openssl_sign($data, $signature, $privateKeyId, OPENSSL_ALGO_SHA256);

        $assertion = "$data." . base64_encode($signature);

        $response = (new Client())->request('POST', 'https://oauth2.googleapis.com/token', [
            'form_params' => [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $assertion,
            ]
        ]);

        $responseData = json_decode($response->getBody(), true);

        return $responseData['access_token'];
    }

    return null;
}

function SendNotification_($privateKey,$clientId,$clientEmail,$endpoint,$fcm_token,$title,$body) {   
    $accessToken = GetAccessToken($privateKey,$clientId,$clientEmail);
    $message = [
        'message' => [
            'token' => $fcm_token,
            'notification' => [
                'title' => $title,
                'body' => $body,
            ]
        ]
    ];
    
    $data = json_encode($message);
    
    $headers = [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json',
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $endpoint);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    
    if ($response === false) {
        //echo 'Error: ' . curl_error($ch);
        return false;
    } else {
        return true;
    }
    
    curl_close($ch);
}

function GetFirebaseToken($mysqli,$mail) {
    $prep_stmt = "SELECT firebase_token FROM fnd_registration_tab where email=?";
    $stmt = $mysqli->prepare($prep_stmt);
    if ($stmt) {
              $stmt->bind_param('s', $mail);
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
               return $result[0]["firebase_token"];
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
