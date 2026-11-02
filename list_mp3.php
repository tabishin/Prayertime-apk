<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$azanDir = 'azan/';
$mp3Files = [];

// Check if directory exists
if (is_dir($azanDir)) {
    // Get all MP3 files from the directory
    $files = glob($azanDir . '*.mp3');
    
    // Extract just the filenames
    foreach ($files as $file) {
        $mp3Files[] = basename($file);
    }
}

// Return the list of MP3 files as JSON
echo json_encode($mp3Files);
?>
