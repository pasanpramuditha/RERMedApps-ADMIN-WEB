<?php

/**
 * This is an example of how to secure your PHP API endpoint.
 * You should integrate this logic into the top of your `RERMedappsHandleling.php` file.
 */

// --- START: Authentication Logic ---

// 1. Define the SAME secret token that you have in your .env file in the Next.js app.
// It's recommended to store this in a secure way on your server, not hardcoded.
$expected_token = 'YOUR_SUPER_SECRET_TOKEN_HERE';

// 2. Get the Authorization header from the incoming request.
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

// 3. Check if the header is present and formatted correctly ("Bearer <token>").
if (!$auth_header || !preg_match('/^Bearer\s+(.+)$/', $auth_header, $matches)) {
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(['success' => false, 'message' => 'Authorization header missing or malformed.']);
    exit;
}

// 4. Extract the token from the header.
$provided_token = $matches[1];

// 5. Compare the provided token with the expected token.
// Use hash_equals for a timing-attack-safe comparison.
if (!hash_equals($expected_token, $provided_token)) {
    header('HTTP/1.0 403 Forbidden');
    echo json_encode(['success' => false, 'message' => 'Invalid authentication token.']);
    exit;
}

// --- END: Authentication Logic ---


// If the script reaches this point, the token is valid.
// You can now proceed with your existing API logic.

echo json_encode([
    'success' => true, 
    'message' => 'Authentication successful! You can now process the request.',
    'received_tag' => $_POST['tag'] ?? 'No tag received'
]);

// ... your existing code from RERMedappsHandleling.php would go here ...

?>
