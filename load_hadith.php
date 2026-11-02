<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow CORS for debugging

// Enable error reporting for debugging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');
error_reporting(E_ALL);

// Path to the hadiths file
$hadithsFile = 'hadiths.json';

// Get the current day of the year (1 to 365/366) and map to 1-360
try {
    $currentDate = new DateTime();
    $dayOfYear = (int)$currentDate->format('z') + 1;
    $jsonDay = (($dayOfYear - 1) % 360) + 1;
} catch (Exception $e) {
    error_log("Error calculating day of year: " . $e->getMessage());
    $jsonDay = 1;
}

// Get the prayer parameter from the query string (e.g., ?prayer=Dhuhr)
$prayer = isset($_GET['prayer']) ? $_GET['prayer'] : '';
$dayParam = isset($_GET['day']) ? $_GET['day'] : $jsonDay;
error_log("Requested Day: $dayParam, Prayer: $prayer");

// Check if the file exists
if (!file_exists($hadithsFile)) {
    error_log("Hadiths file not found: $hadithsFile");
    $defaultHadith = [
        'Day' => (string)$dayParam,
        'Prayer' => $prayer,
        'Arabic' => 'Hadiths file not found',
        'Urdu' => 'حدیث فائل نہیں ملی',
        'Hindi' => 'हदीस फाइल नहीं मिली',
        'English' => 'Hadiths file not found',
        'Transliteration' => 'Not available',
        'Source' => 'N/A'
    ];
    echo json_encode($defaultHadith);
    exit;
}

// Read and decode the hadiths.json file
$hadithsData = file_get_contents($hadithsFile);
if ($hadithsData === false) {
    error_log("Failed to read hadiths file: $hadithsFile");
    $defaultHadith = [
        'Day' => (string)$dayParam,
        'Prayer' => $prayer,
        'Arabic' => 'Error reading Hadiths file',
        'Urdu' => 'حدیث فائل پڑھنے میں خرابی',
        'Hindi' => 'हदीस फाइल पढ़ने में त्रुटि',
        'English' => 'Error reading Hadiths file',
        'Transliteration' => 'Not available',
        'Source' => 'N/A'
    ];
    echo json_encode($defaultHadith);
    exit;
}

$hadiths = json_decode($hadithsData, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON decoding error in hadiths file: " . json_last_error_msg());
    $errorHadith = [
        'Day' => (string)$dayParam,
        'Prayer' => $prayer,
        'Arabic' => 'Error decoding Hadith data',
        'Urdu' => 'حدیث ڈیٹا ڈیکوڈ کرنے में خرابی',
        'Hindi' => 'हदीस डेटा डिकोड करने में त्रुटि',
        'English' => 'Error decoding Hadith data',
        'Transliteration' => 'Not available',
        'Source' => 'N/A'
    ];
    echo json_encode($errorHadith);
    exit;
}

// Log the number of Hadiths loaded
error_log("Total Hadiths loaded: " . count($hadiths));

// Find the Hadith for the requested day and prayer
$selectedHadith = null;
foreach ($hadiths as $hadith) {
    if ($hadith['Day'] === (string)$dayParam && $hadith['Prayer'] === $prayer) {
        $selectedHadith = $hadith;
        error_log("Found Hadith for Day $dayParam, Prayer $prayer: " . json_encode($hadith));
        break;
    }
}

// If no Hadith is found, return a default Hadith
if (!$selectedHadith) {
    error_log("No Hadith found for Day $dayParam, Prayer $prayer");
    $defaultHadith = [
        'Day' => (string)$dayParam,
        'Prayer' => $prayer,
        'Arabic' => 'No Hadith available for this day and prayer',
        'Urdu' => 'اس دن اور نماز کے لیے کوئی حدیث موجود نہیں',
        'Hindi' => 'इस दिन और नमाज़ के लिए कोई हदीस उपलब्ध नहीं',
        'English' => 'No Hadith available for this day and prayer',
        'Transliteration' => 'Not available',
        'Source' => 'N/A'
    ];
    echo json_encode($defaultHadith);
    exit;
}

echo json_encode($selectedHadith);
?>
