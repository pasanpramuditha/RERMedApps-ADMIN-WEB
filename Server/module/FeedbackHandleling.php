<?php
if (true) {
    if($_POST['db']!=0){
        if ($tag == "GET_FEEDBACK") {
            if(isset($_POST['type'])){
                $id = $_POST['type'];
                $response["success"] = TRUE;
                if($id=="P"){
                   $response["feedback"]=GetPendingFeedback($mysqli);
                }else if($id=="R"){
                   $response["feedback"]=GetResolvedFeedback($mysqli);    
                }else{
                   $response["feedback"]=GetArchivedFeedback($mysqli);    
                }
                echo json_encode($response);
                EXIT(); 
            }else{
                $response["success"] = FALSE;
                $response["error_msg"] = "{type} is missing";
                echo json_encode($response);
                Exit();                
            }
        }else if ($tag == "GET_ALL_FEEDBACK") {
            $response["success"] = TRUE;
            $response["feedback"]=GetFeedback($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "GET_PENDING_FEEDBACK") {
            $response["success"] = TRUE;
            $response["feedback"]=GetPendingFeedback($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "GET_RESOLVED_FEEDBACK") {
            $response["success"] = TRUE;
            $response["feedback"]=GetResolvedFeedback($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "GET_ARCHIVED_FEEDBACK") {
            $response["success"] = TRUE;
            $response["feedback"]=GetArchivedFeedback($mysqli);
            echo json_encode($response);
            EXIT(); 
        }else if ($tag == "SET_FEEDBACK_RESOLVED") {
            if(isset($_POST['id']) && isset($_POST['resolution'])){
                $id = $_POST['id'];
                $resolution = $_POST['resolution'];
                if(SetFeedbackResolved($mysqli,$id,$resolution)){
                    $response["success"] = true;
                    $response["db"] = $_POST['db'];
                    $response["id"] = $_POST['id'];
                    $response["resolution"] = $resolution;
                    $response["notification_queued"] = false;

                    $app_id = isset($_POST['app_id']) ? (int)$_POST['app_id'] : 0;
                    $email = trim((string)($_POST['email'] ?? ''));
                    if ($app_id > 0 && $email !== '' && function_exists('QueueUserNotification')) {
                        $notification_result = QueueUserNotification(
                            $main_mysqli,
                            $app_id,
                            $email,
                            'FEEDBACK_DEFAULT_TITLE',
                            'FEEDBACK_DEFAULT_BODY'
                        );

                        $response["notification_queued"] = !empty($notification_result["success"]);
                        if (!empty($notification_result["queue_id"])) {
                            $response["notification_queue_id"] = $notification_result["queue_id"];
                        }
                        if (empty($notification_result["success"])) {
                            $response["notification_error_msg"] = $notification_result["error_msg"] ?? 'Unable to queue feedback notification.';
                        }
                    } else {
                        $response["notification_error_msg"] = "app_id or email is missing for feedback notification.";
                    }
                }else{
                   $response["success"] = FALSE;
                   $response["error_msg"] = "Error Occured while updating";
                }
                echo json_encode($response);
                EXIT(); 
            }else{
                $response["success"] = FALSE;
                $response["error_msg"] = "{id,resolution} are missing";
                echo json_encode($response);
                Exit();                
            }
            //
        }else if ($tag == "SET_FEEDBACK_ARCHIVED") {
            if(isset($_POST['id'])){
                $id = $_POST['id'];
                if(SetFeedbackArchived($mysqli,$id)){
                    $response["success"] = true;
                    $response["db"] = $_POST['db'];
                    $response["id"] = $_POST['id'];
                }else{
                   $response["success"] = FALSE;
                   $response["error_msg"] = "Error Occured while updating";
                }
                echo json_encode($response);
                EXIT(); 
            }else{
                $response["success"] = FALSE;
                $response["error_msg"] = "{id} are missing";
                echo json_encode($response);
                Exit();                
            }
            //SetFeedbackArchived
        }else if ($tag == "DELETE_FEEDBACK") {
            if(isset($_POST['id'])){
                $id = $_POST['id'];
                if(DeleteFeedback($mysqli,$id)){
                    $response["success"] = true;
                }else{
                   $response["success"] = FALSE;
                   $response["error_msg"] = "Error Occured while deleting";
                }
                echo json_encode($response);
                EXIT(); 
            }else{
                $response["success"] = FALSE;
                $response["error_msg"] = "{id} is missing";
                echo json_encode($response);
                Exit();                
            }
        }
    }else{
        if ($tag == "GET_ALL_APPS_FEEDBACK") {
            if(isset($_POST['type'])){
                $response["success"] = TRUE;
                $id = $_POST['type'];
                $limit = isset($_POST['limit']) ? max(0, (int)$_POST['limit']) : 300;

                $db_array = parse_db_array_request();
    
                if ($db_array) {

                    foreach ($db_array as $db) {
                        $mysqli=SwapDatabase($main_mysqli,$db);

                        if($id=="P"){
                          $response["feedbackLst"][$db]["feedback"]=GetPendingFeedback($mysqli, $limit);
                        }else if($id=="R"){
                          $response["feedbackLst"][$db]["feedback"]=GetResolvedFeedback($mysqli, $limit);
                        }else{
                          $response["feedbackLst"][$db]["feedback"]=GetArchivedFeedback($mysqli, $limit);
                        }

                        $mysqli->close();

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


function GetFeedbackByWhere($mysqli, $where = '', $limit = 300) {
    $sql = "SELECT
                f.id, f.subject, f.message, f.created_date, f.from_email,
                f.app_version, f.resolution, f.resolved, f.seen,
                r.country, r.registered_date, r.last_online, r.language,
                r.firstname, r.lastname
            FROM fnd_feedback_tab f
            LEFT JOIN (
                SELECT email, MAX(id) AS latest_id
                FROM fnd_registration_tab
                GROUP BY email
            ) latest_registration ON latest_registration.email = f.from_email
            LEFT JOIN fnd_registration_tab r
                ON r.id = latest_registration.latest_id";

    if ($where !== '') {
        $sql .= " WHERE {$where}";
    }

    $sql .= " ORDER BY f.created_date DESC";
    if ($limit > 0) {
        $sql .= " LIMIT ?";
    }

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        return [];
    }

    if ($limit > 0) {
        $stmt->bind_param('i', $limit);
    }

    if (!$stmt->execute()) {
        $stmt->close();
        return [];
    }

    $lst = get_result($stmt);
    $stmt->close();
    return $lst ?: [];
}

function GetFeedback($mysqli, $limit = 300) {
    return GetFeedbackByWhere($mysqli, '', $limit);
};

function GetPendingFeedback($mysqli, $limit = 300) {
    return GetFeedbackByWhere($mysqli, 'f.resolved = 0', $limit);
};

function GetResolvedFeedback($mysqli, $limit = 300) {
    return GetFeedbackByWhere($mysqli, 'f.resolved = 1 AND f.seen = 0', $limit);
};

function GetArchivedFeedback($mysqli, $limit = 300) {
    return GetFeedbackByWhere($mysqli, 'f.resolved = 1 AND f.seen = 1', $limit);
};

function SetFeedbackResolved($mysqli,$id,$resolution) {
 
    if ($update_stmt = $mysqli->prepare("UPDATE fnd_feedback_tab f set resolution=?,resolved=1,seen=0 where id=? ")) {
    	$update_stmt->bind_param('si', $resolution,$id);
        if ( $update_stmt->execute()) {
            return true;
        }else{	
			return false;
		}
	}else{
		return false;
	}
};
function SetFeedbackArchived($mysqli,$id) {
 
    if ($update_stmt = $mysqli->prepare("UPDATE fnd_feedback_tab f set resolved=1,seen=1 where id=? ")) {
    	$update_stmt->bind_param('i', $id);
        if ( $update_stmt->execute()) {
            return true;
        }else{	
			return false;
		}
	}else{
		return false;
	}
};

function DeleteFeedback($mysqli,$id) {
 
    if ($update_stmt = $mysqli->prepare("DELETE from  fnd_feedback_tab where id=? ")) {
    	$update_stmt->bind_param('i',$id);
        if ( $update_stmt->execute()) {
            return true;
        }else{	
			return false;
		}
	}else{
		return false;
	}
};

?>
