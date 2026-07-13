<?php
require '../vendor/autoload.php';


use GuzzleHttp\Client;

function validateGoogleIdToken($idToken) {
    $client = new \GuzzleHttp\Client();
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . $idToken;

    try {
        $response = $client->request('GET', $url);
        $data = json_decode($response->getBody(), true);
 //throw new Exception($data['aud']);
 
  //echo json_encode($data);
        // Check if the ID token is valid
        if (isset($data['aud']) && $data['aud'] = '114014891288-o4gua7pl73t5o7850vj9moprfq1jijv6.apps.googleusercontent.com') {
            return $data;
            
        } else {
            throw new Exception('Invalid ID token.');
        }
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// Get the ID token from the request
$idToken = $_POST['idToken'];

$result = validateGoogleIdToken($idToken);

if (isset($result['error'])) {
    echo json_encode([
        'status' => 'error',
        'message' => $result['error'],
    ]);
} else {
    echo json_encode($result);
    // echo json_encode([
    //     'status' => 'success',
    //     'uid' => $result['sub'],
    //     'email' => $result['email'],
    //     'name' => $result['name'],
    // ]);
}



?>