<?php

require_once '../../include/db_connect.php';
require_once '../../include/functions.php';
	
if (isset($_POST['tag'])){
     $tag = $_POST['tag'];
     
	if($tag=='REGISTER'){
		
		$response=array("success"=>FALSE,"info"=>"");
		if(!isset($_POST['firstname'])){
			$response['success']=FALSE;
			$response['info']='Please enter first name';
			echo json_encode($response);
			return;
		}
		if(!isset($_POST['lastname'])){
			$response['success']=FALSE;
			$response['info']='Please enter last name';
			echo json_encode($response);
			return;
		}
		if(!isset($_POST['email'])){
			$response['success']=FALSE;
			$response['info']='Please enter email';
			echo json_encode($response);
			return;
		}


		$firstname=isset($_POST['firstname']) ? $_POST['firstname'] : '';
		$lastname=isset($_POST['lastname']) ? $_POST['lastname'] : '';
		$email=isset($_POST['email']) ? $_POST['email'] : '';
        $device=isset($_POST['device']) ? $_POST['device'] : '';
        $version=isset($_POST['version']) ? $_POST['version'] : '';
        $firebase_token=isset($_POST['firebase_token']) ? $_POST['firebase_token'] : '';
        
         $created=getDatetime();
				
				
        if(AlreadyRegistered($email,$device,$main_mysqli)){	
            
            $secret = hash('sha512', uniqid(openssl_random_pseudo_bytes(16), TRUE));
            $hash = hash('sha512', $email . $secret);
    
    		if(UpdateUser($main_mysqli,$email,$firstname,$lastname,$device,$version,$created,$secret,$hash,$firebase_token)){
    			$response['success']=TRUE;
    			$response['hash']=$hash;
    		}else{
    			$response['success']=FALSE;
    			$response['info']='Error while registering the user.';
    		};

		}else{
             $response['success']=FALSE;
			 $response['info']='Access Dinied22. Contact administrator';	
		}
		echo json_encode($response);
	}
	else{
	 	 $response['success']=FALSE;
		$response['info']='Access Dinied33. Contact administrator';
		echo json_encode($response);
	}
}
else
{
	$response['success']=FALSE;
    $response['info']='Access Dinied. Contact administrator';
	echo json_encode($response);
};

function AlreadyRegistered( $email,$device,$mysqli) {
	
	    $prep_stmt = "SELECT 1 FROM fnd_registration_tab WHERE email = ? LIMIT 1";
    $stmt = $mysqli->prepare($prep_stmt);
    
    if ($stmt) {
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows >0) {

            return true;
        }else{
			return false;
		}
    } else {
         return false;
    }
};

function DeleteUser($email,$device,$mysqli){
	if ($delete_stmt = $mysqli->prepare("DELETE FROM fnd_registration_tab WHERE email=?")) {
    	$delete_stmt->bind_param('s', $email);
            
        if ( $delete_stmt->execute()) {
            return true;
        }else{	
			return false;
		}
	}else{
		return false;
	}
}

function RegisterUser( $firstname,$lastname,$email,$device,$version,$created,$secret,$hash,$firebase_token,$mysqli) {

$valid=1;

    if ($insert_stmt = $mysqli->prepare("INSERT INTO fnd_registration_tab (firstname,lastname, email,device,version,registered_date,valid,secret,hash,firebase_token) VALUES ( ?,?,?,?,?,?,?,?,?,?)")) {
    	$insert_stmt->bind_param('ssssssisss', $firstname, $lastname, $email,$device,$version,$created,$valid,$secret,$hash,$firebase_token);
            
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


function UpdateUser($mysqli,$email, $firstname,$lastname,$device,$version,$created,$secret,$hash,$firebase_token) {



    if ($insert_stmt = $mysqli->prepare("UPDATE fnd_registration_tab SET firstname=?, lastname=?,device=?,version=?,registered_date=?,secret=?, hash=?,firebase_token=? WHERE email=?")) {
    	$insert_stmt->bind_param('sssssssss', $firstname, $lastname,$device,$version,$created,$secret,$hash,$firebase_token,$email);
            
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