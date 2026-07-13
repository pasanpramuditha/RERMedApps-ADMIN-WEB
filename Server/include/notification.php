<?php

define("ADMIN_SERVER_KEY", getenv('FCM_LEGACY_SERVER_KEY') ?: '');
define("FCM_URL", 'https://fcm.googleapis.com/fcm/send');


function SendTopicNotification($topic,$title,$message){

$apiKey = ADMIN_SERVER_KEY;
if ($apiKey === '') {
    error_log('FCM_LEGACY_SERVER_KEY is not configured.');
    return false;
}
$notification = ['title' => $title,
                  'body' => $message,
                  'icon' => 'myIcon', 
                  'sound' => 'mySound'];
                  
$extraNotificationData = ["message" => $notification,
                          "moredata" => 'dd'];
$fcmNotification = ['to' => '/topics/'.$topic,
                    'notification' => $notification,
                    'data' => $extraNotificationData,
                    "time_to_live" => 3600];
                    
                    
$headers = ['Authorization: key=' . $apiKey,
            'Content-Type: application/json'];
            
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, FCM_URL);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fcmNotification));
$result = curl_exec($ch);
curl_close($ch); 
return $result;
}

function SendNotification($token,$title,$message){

$apiKey = ADMIN_SERVER_KEY;
if ($apiKey === '') {
    error_log('FCM_LEGACY_SERVER_KEY is not configured.');
    return false;
}
$notification = ['title' => $title,
                 'body' => $message, 
                 'icon' => 'myIcon', 
                 'sound' => 'mySound'];
                 
$extraNotificationData = ["message" => $notification,
                          "moredata" => 'dd'];
$fcmNotification = ['to' => $token,
                    'notification' => $notification,
                    'data' => $extraNotificationData ,
                    'time_to_live' => 3600];
                    
$headers = ['Authorization: key=' . $apiKey,
            'Content-Type: application/json'];
            
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, FCM_URL);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fcmNotification));
$result = curl_exec($ch);
curl_close($ch); 
return $result;
}
?>





 
