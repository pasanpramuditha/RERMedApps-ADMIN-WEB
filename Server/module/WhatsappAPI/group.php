<?php
require '../../vendor/autoload.php'; // Assuming Guzzle is installed

use GuzzleHttp\Client;

$client = new Client();
$apiKey = '6ffb3655b46abf584c29b42a87b7208334ff8f65713c8a622d6851f271b8e5bd';
$url = 'https://www.wasenderapi.com/api/groups';

try {
    $response = $client->get($url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $apiKey,
            'Accept' => 'application/json',
        ]
    ]);

    echo $response->getBody();
} catch (\GuzzleHttp\Exception\RequestException $e) {
    echo "Request failed: " . $e->getMessage();
    if ($e->hasResponse()) {
        echo "\nResponse: " . $e->getResponse()->getBody();
    }
}