<?php
require_once '../../../include/db_connect.php';

 require_once 'AppInstall.php';


// // ✅ DB list
$ALL_APP_DBS = [
    "rermedap_FND_ANATOMY3D",
    "rermedap_FND_AUSCULTATION",
    "rermedap_FND_CLINICAL_SKILLS",
    "rermedap_FND_CONCISE_ENT",
    "rermedap_FND_CONCISE_GENETICS",
    "rermedap_FND_CONCISE_GERIATRICS",
    "rermedap_FND_CONCISE_GYNOBS",
    "rermedap_FND_CONCISE_GYNOBS_PRO",
    "rermedap_FND_CONCISE_INFECTIOUSDISEASES",
    "rermedap_FND_CONCISE_MEDICINE",
    "rermedap_FND_CONCISE_MEDICINE_PRO",
    "rermedap_FND_CONCISE_NEUROLOGY",
    "rermedap_FND_CONCISE_ORTHOPEDICS",
   // "rermedap_FND_CONCISE_PATHOLOGY",
    "rermedap_FND_CONCISE_PEDIATRICS",
    "rermedap_FND_CONCISE_PEDIATRICS_PRO",
    "rermedap_FND_CONCISE_PHYSIOLOGY",
    "rermedap_FND_CONCISE_PSYCHARITY",
    "rermedap_FND_CONCISE_PSYCHARITY_PRO",
    "rermedap_FND_CONCISE_RHEUMATOLOGY",
    "rermedap_FND_CONCISE_SURGERY",
    "rermedap_FND_CONCISE_SURGERY_PRO",
    "rermedap_FND_DIFF_DIAGNOSIS",
   // "rermedap_FND_DUMMY",
    "rermedap_FND_ECG",
    "rermedap_FND_EMERGENCY_MEDICINE",
    "rermedap_FND_FODMAP",
    "rermedap_FND_HISTORY_TAKING",
    "rermedap_FND_LAB_VALUES",
    "rermedap_FND_MEDICAL_MINDMAPS",
    "rermedap_FND_MEDSIMU_CASES",
    "rermedap_FND_SCM",
    //"rermedap_FND_SCM_IOS",
    "rermedap_FND_SCP",
    "rermedap_FND_SCS",
    "rermedap_FND_SURGERY_PRINCIPLES",
    "rermedap_FND_XRAY"
];

// ✅ DB list
// $ALL_APP_DBS = [
//     "rermedap_FND_XRAY",
//     "rermedap_FND_CONCISE_GYNOBS_PRO"
    
// ];

// ✅ Get yesterday total registrations across all DBs (COUNT ONLY)
$dt = new DateTime("now", new DateTimeZone("Asia/Kolkata"));
$dt->modify("-1 day");
$yesterdayDate = $dt->format("Y-m-d");
$total = GetYesterdayRegisteredTotalFromDbArray($main_mysqli, $ALL_APP_DBS);

// ✅ Build your message (COUNT ONLY)
$message  = "📊 Yesterday Registered Report (" . $yesterdayDate . ")\n";
$message .= "✅ Total Android registrations: " . $total . "\n";

/**
 * ✅ 4) SEND TO WHATSAPP GROUP (IMPORTANT: use @g.us)
 */
$apiUrl   = "https://wasenderapi.com/api/send-message";
$apiToken = "6ffb3655b46abf584c29b42a87b7208334ff8f65713c8a622d6851f271b8e5bd"; // 🔒 put in env/config if possible

// ✅ WhatsApp Group ID format: 123456789-987654321@g.us
$groupId  = "120363407996567770@g.us"; // <-- replace with YOUR real group id

$payload = [
    "to"   => $groupId,
    "text" => $message
];

/**
 * ✅ 5) SEND REQUEST (cURL)
 */
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $apiToken,
    "Content-Type: application/json",
    "Accept: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$result   = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    $result = "CURL ERROR: " . curl_error($ch);
}
curl_close($ch);

/**
 * ✅ 6) LOG RESULT (for cron debugging)
 */
file_put_contents(__DIR__ . "/daily_job_log.txt",
    "[" . date("Y-m-d H:i:s") . "] HTTP=" . $httpCode . " Count=" . $total . " Response=" . $result . PHP_EOL,
    FILE_APPEND
);

echo "Done\n";

?>