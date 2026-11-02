<?php
header('Content-Type: application/json');

// Path to the background folder
$dir = 'background/';
$files = [];

// Check if the directory exists
if (is_dir($dir)) {
    // Scan the directory for image files
    $allFiles = scandir($dir);
    foreach ($allFiles as $file) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif'])) {
            $files[] = $file;
        }
    }
}

// Return the list of image files as JSON
echo json_encode($files);
?>
