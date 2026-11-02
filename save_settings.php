<?php
header('Content-Type: application/json');
$settingsFile = 'settings.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data && file_put_contents($settingsFile, json_encode($data)) !== false) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to save settings']);
    }
} else {
    if (file_exists($settingsFile)) {
        echo file_get_contents($settingsFile);
    } else {
        echo json_encode(['city' => 'Mumbai', 'country' => 'India', 'calcMethod' => '2', 'asrMethod' => 'hanafi', 'adjustment' => '0']);
    }
}
?>
