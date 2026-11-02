<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods', 'GET, OPTIONS');
header('Access-Control-Allow-Headers', 'Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

$queryParams = $_GET;
$endpoint = $queryParams['endpoint'] ?? '';
unset($queryParams['endpoint']);

if (isset($queryParams['date'])) {
    $dateParam = $queryParams['date'];
    unset($queryParams['date']);
    if (empty($endpoint)) {
        $parts = explode('-', $dateParam);
        $formattedDate = count($parts) === 3 ? "{$parts[2]}-{$parts[1]}-{$parts[0]}" : $dateParam;
        $endpoint = "timingsByCity/{$formattedDate}";
    }
}

if (empty($endpoint)) {
    $endpoint = 'timingsByCity';
}

$queryString = http_build_query($queryParams);
$url = "https://api.aladhan.com/v1/{$endpoint}" . ($queryString ? "?{$queryString}" : "");

$opts = [
    'http' => [
        'method' => 'GET',
        'header' => "User-Agent: PrayerTimesKiosk/1.0\r\nAccept: application/json\r\n",
        'timeout' => 10,
        'follow_location' => 1
    ]
];
$context = stream_context_create($opts);
$response = @file_get_contents($url, false, $context);

if ($response === false) {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['User-Agent: PrayerTimesKiosk/1.0', 'Accept: application/json']);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            echo json_encode(['status' => 'error', 'message' => 'Failed to fetch prayer times from Aladhan API']);
            exit;
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to fetch prayer times and cURL is not available']);
        exit;
    }
}

echo $response;
?>
