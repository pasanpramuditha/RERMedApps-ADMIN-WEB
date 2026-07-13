<?php
$app_name= 'RER Medapps Admin';
$header_color=' #4aa4c2';

if (!function_exists('Authorized')) {
function Authorized($mysqli){
    if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
        header('HTTP/1.0 401 Unauthorized');
        echo json_encode(['error' => 'Unauthorized']);
        exit();
    }
    
    list($type, $data) = explode(' ', $_SERVER['HTTP_AUTHORIZATION'], 2);
    list($username, $password) = explode(':', base64_decode($data));
    
    if (Authenticated($mysqli,$username, $password)) {
        $method = $_SERVER['REQUEST_METHOD'];
        $endpoint = $_SERVER['REQUEST_URI'];
        $requestParameters = json_encode($_REQUEST); 
        LogRequest($mysqli,$username,$method,$endpoint,$requestParameters);
        header('Content-Type: application/json');
        return true;
    }else{
        return false;
        // header('HTTP/1.0 401 Unauthorized');
        // echo json_encode(['error' => 'Unauthorized']);
        // exit();
    }
}
}


if (!function_exists('LogRequest')) {
function LogRequest($mysqli,$username,$method,$endpoint,$parameters){
    
    if(isset($_GET['db'])){
       $db_name = $_GET['db'];
    }else{
      $db_name="N/A";  
    }
    if(isset($_GET['tag'])){
       $tag_name = $_GET['tag'];
    }else{
      $tag_name="N/A";  
    }

    if ($insert_stmt = $mysqli->prepare("INSERT INTO fnd_history_log_tab (parameters,tag_name,db_name,user) VALUES (?,?,?,?)")) {
    	$insert_stmt->bind_param('ssss', $parameters,$tag_name,$db_name,$username);
            
        if ( $insert_stmt->execute()) {
            return true;
        }else{	
			return false;
		}
	}else{
		return false;
	}
}
}

if (!function_exists('Authenticated')) {
function Authenticated($mysqli, $email, $hash)
{
	$secret =get_secret($mysqli,$email,$hash);
	if($secret!=FALSE){
		$correct_hash = hash('sha512', $email . $secret);
		if($hash==$correct_hash){
			return TRUE;
		}else{
			return FALSE;
		}
	}
	return FALSE;
}
}

if (!function_exists('get_secret')) {
function get_secret($mysqli,$email,$hash){
	$prep_stmt = "SELECT secret FROM fnd_admin_tab where email=? and hash=?";
    $stmt      = $mysqli->prepare($prep_stmt);
    
    if ($stmt) {
        $stmt->bind_param('ss', $email,$hash);
        
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
                return $result[0]["secret"];
            } else {
                 return FALSE;
            }
        } else {
            return FALSE;
        }
    } else {
        return FALSE;
    }	
}; 
}

if (!function_exists('get_result')) {
function get_result($Statement)
{
   $RESULT = array();
   $Statement->store_result();
   for ($i = 0; $i < $Statement->num_rows; $i++) {
      $Metadata = $Statement->result_metadata();
      $PARAMS   = array();
      while ($Field = $Metadata->fetch_field()) {
         $PARAMS[] =& $RESULT[$i][$Field->name];
      }
      call_user_func_array(array(
         $Statement,
         'bind_result'
      ), $PARAMS);
      $Statement->fetch();
   }
   return $RESULT;
}
}

if (!function_exists('getDatetime')) {
function getDatetime(){
   $updated=date('Y-m-d H:i:s',strtotime("now")+630*60);
   return $updated;
}
}

if (!function_exists('getServertime')) {
function getServertime($mysqli){
    $prep_stmt = "SELECT now() datetime FROM dual";
    $stmt      = $mysqli->prepare($prep_stmt);
    
    if ($stmt) {
        if ($stmt->execute()) {
            $result = get_result($stmt);
            $stmt->close();
            if ($result != null) {
                return $result[0]["datetime"];
            } else {
                 return FALSE;
            }
        } else {
            return FALSE;
        }
    } else {
        return FALSE;
    }
    
   // $updated=date('Y-m-d H:i:s',strtotime("now")+630*60);
   // return $updated;
}
}

function parse_db_array_request(string $key = 'db_array'): array {
    $decoded = json_decode($_POST[$key] ?? '[]', true);
    if (!is_array($decoded)) {
        return [];
    }

    $values = [];
    foreach ($decoded as $value) {
        $value = trim((string)$value);
        if ($value !== '') {
            $values[] = $value;
        }
    }

    return array_values(array_unique($values));
}

function fetch_from_db_array($main_mysqli, array $db_array, callable $fetcher): array {
    $results = [];

    foreach ($db_array as $db) {
        $mysqli = SwapDatabase($main_mysqli, $db);
        $chunk = $fetcher($mysqli, $db);
        if (is_array($chunk) && !empty($chunk)) {
            $results = array_merge($results, $chunk);
        }
        $mysqli->close();
    }

    return $results;
}

function sort_rows_by_key_desc(array &$rows, string $key): void {
    usort($rows, function ($left, $right) use ($key) {
        $leftValue = $left[$key] ?? '';
        $rightValue = $right[$key] ?? '';
        return strcmp((string)$rightValue, (string)$leftValue);
    });
}

function count_rows_between(mysqli $mysqli, string $table, string $column, string $fromDateTime, string $toDateTime): int {
    $sql = "SELECT COUNT(*) AS total FROM {$table} WHERE {$column} BETWEEN ? AND ?";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return 0;
    }

    $stmt->bind_param("ss", $fromDateTime, $toDateTime);
    if (!$stmt->execute()) {
        $stmt->close();
        return 0;
    }

    $result = get_result($stmt);
    $stmt->close();

    return (int)($result[0]['total'] ?? 0);
}

function get_client_ip1() {
    $ipaddress = '';
    if (getenv('HTTP_CLIENT_IP'))
        $ipaddress = getenv('HTTP_CLIENT_IP');
    else if(getenv('HTTP_X_FORWARDED_FOR'))
        $ipaddress = getenv('HTTP_X_FORWARDED_FOR');
    else if(getenv('HTTP_X_FORWARDED'))
        $ipaddress = getenv('HTTP_X_FORWARDED');
    else if(getenv('HTTP_FORWARDED_FOR'))
        $ipaddress = getenv('HTTP_FORWARDED_FOR');
    else if(getenv('HTTP_FORWARDED'))
       $ipaddress = getenv('HTTP_FORWARDED');
    else if(getenv('REMOTE_ADDR'))
        $ipaddress = getenv('REMOTE_ADDR');
    else
        $ipaddress = 'UNKNOWN';
    return $ipaddress;
}

function get_client_ip2() {
    $ipaddress = '';
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_X_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    else if(isset($_SERVER['HTTP_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_FORWARDED'];
    else if(isset($_SERVER['REMOTE_ADDR']))
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    else
        $ipaddress = 'UNKNOWN';
    return $ipaddress;
}



/*--------------------
//    MAIL
----------------------*/
function SendFeedback($from_email,$to_email,$subject_,$message,$version){

  $subject = "Feedback - ".$GLOBALS['app_name'] ." (".$version.")";

  $message="
            <table>
                <thead>
                    <tr>
                        <th colspan='2'><img src='https://admin.rermedapps.com/fnd_logo.jpg' alt='Logo' width='30' height='30'/>  ".$GLOBALS['app_name']." (".$version.") </th>
                    </tr>
                </thead>
                <tbody>
            	   <tr>
                        <td>Email</td>
                        <td>".$from_email."</td>
            
                    </tr>
                    <tr>
                        <td>Subject</td>
                        <td>".$subject_."</td>
            
                    </tr>
                    <tr>
                        <td>Feedback</td>
                        <td>".$message."</td>
                    </tr>
                </tbody>
            </table>";
            
    WrapAndSendTo( "feedback@rermedapps.com","virajmrt@gmail.com", $message, $subject);
    WrapAndSendTo( "feedback@rermedapps.com","rermedapps@gmail.com", $message, $subject);
    
 }
 


 
function SendPurchase($email,$payload,$sku,$package,$orderId,$token,$signature,$os,$device,$purchased_date,$version){
  
  $subject = "Purchase - ".$GLOBALS['app_name'];

  $message="
            <table>
                <thead>
                    <tr>
                        <th colspan='2'><img src='https://admin.rermedapps.com/fnd_logo.jpg' alt='Logo' width='30' height='30'/>  ".$GLOBALS['app_name']." (".$version.") </th>
                    </tr>
                </thead>
                <tbody>
            	   <tr>
                        <td>Email</td>
                        <td>".$email."</td>
            
                    </tr>
                    <tr>
                        <td>Payload</td>
                        <td>".$payload."</td>
            
                    </tr>
                    <tr>
                        <td>Package Name</td>
                        <td>".$package."</td>
                    </tr>
            		<tr>
                        <td>Order Id</td>
                        <td>".$orderId."</td>
                    </tr>
            		        <tr>
                        <td>Sku</td>
                        <td>".$sku."</td>
                    </tr>
            		        <tr>
                        <td>Token</td>
                        <td>".$token."</td>
                    </tr>
            		<tr>
                        <td>Signature</td>
                        <td>".$signature."</td>
                    </tr>
            		<tr>
                        <td>Purchased on</td>
                        <td>".$purchased_date."</td>
                    </tr>	
            
                </tbody>
            </table>";
            
    WrapAndSendTo( "purchase@rermedapps.com","virajmrt@gmail.com", $message, $subject);
    WrapAndSendTo( "purchase@rermedapps.com","rermedapps@gmail.com", $message, $subject);
}
 
 
function  SendUnautheticatedAccess( $email, $hash,$os,$device,$ip1,$ip2, $created){
  $subject = "Unauthenticated Access - ".$GLOBALS['app_name'];

  $message="<table>
                <thead>
                    <tr>
                        <th colspan='2'><img src='https://admin.rermedapps.com/fnd_logo.jpg' alt='Logo' width='30' height='30'/>  ".$GLOBALS['app_name']." </th>
                    </tr>
                </thead>
                <tbody>
            	   <tr>
                        <td>Email</td>
                        <td>".$email."</td>
                    </tr>
                    <tr>
                        <td>Hash</td>
                        <td>".$hash."</td>
            
                    </tr>
                    <tr>
                        <td>Mobile OS</td>
                        <td>".$os."</td>
                    </tr>
            		<tr>
                        <td>Device</td>
                        <td>".$device."</td>
                    </tr>
            		        <tr>
                        <td>IP1</td>
                        <td>".$ip1."</td>
                    </tr>
            		        <tr>
                        <td>IP2</td>
                        <td>".$ip2."</td>
                    </tr>
            		<tr>
                        <td>Accesed At</td>
                        <td>".$created."</td>
                    </tr>	
            
                </tbody>
            </table>";

 WrapAndSendTo( "unauthorize@rermedapps.com","virajmrt@gmail.com", $message, $subject);
 WrapAndSendTo( "unauthorize@rermedapps.com","rermedapps@gmail.com", $message, $subject);
}

function WrapAndSendTo( $from,$to, $content, $subject)
{
  if ($to != false) {

    $message = "<!DOCTYPE html>
                <html lang='en'>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #f4f4f4;
                        }
                        table {
                            width: 100%;
                            max-width: 600px; /* Set a maximum width for better responsiveness */
                            margin: 20px auto;
                            border-collapse: collapse;
                            background-color: #ffffff;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        }
                         td {
                            padding: 15px;
                            text-align: left;
                            border-bottom: 1px solid #ddd;
                        }
                        th {
                            background-color: ".$GLOBALS['header_color'].";
                            color: white;
                			padding: 5px;
                            text-align: left;
                            border-bottom: 1px solid #ddd;
                			vertical-align: middle; 
                        }
                		th img {
                            vertical-align: middle;
                        }
                        tr:nth-child(odd) {
                            background-color: #f9f9f9; /* Color for odd rows */
                        }
                        tr:nth-child(even) {
                            background-color: #ffffff; /* Color for even rows */
                        }
                        @media screen and (max-width: 600px) {
                            table {
                                width: 100%;
                            }
                            th, td {
                                display: block;
                                width: 100%;
                                box-sizing: border-box;
                            }
                            th {
                                text-align: left;
                            }
                        }
                    </style>
                </head>
                <body>" 
                . $content .
                "</body>
                </html>";
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=iso-8859-1" . "\r\n";
    $headers .= "From: $from" . "\r\n";

    if(mail($to,$subject,$message,$headers)){
      
       return true;
    }else{
     
       return false;
    }

  } else {

    return false;
  }
}


?>
