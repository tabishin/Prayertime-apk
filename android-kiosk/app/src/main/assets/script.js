var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
// Declaring global audio & user interaction flags
var userInteracted = false;
var audioEnabled = false;
// Safe kiosk detection without relying on URLSearchParams (compatible with older Android TV/Signage WebViews)
var isKiosk = (typeof window !== 'undefined' && window.location) ? ((window.location.search && window.location.search.indexOf("kiosk") !== -1) ||
    (window.location.origin && window.location.origin.indexOf("appassets") !== -1) ||
    window.location.protocol === "file:") : false;
if (isKiosk) {
    userInteracted = true;
    audioEnabled = true;
}
var audioPlayer = new Audio();
audioPlayer.preload = "auto";
audioPlayer.volume = 1.0;
var playedAzans = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
var playedAlarm = false;
var playedReminders = {};
var lastHadithUpdate = null;
var lastMakruhState = false;
var lastHour = -1;
var playedMakruhBuzzer = false;
var settings = null;
var currentTimings = null;
var currentlyPlayingReminder = null;
var prayerTimes30Days = {};
var currentHadithData = null; // Caching current hadith
var currentHolidays = []; // Caching current holidays
var holidayIndex = 0;
var lastCheckedPrayer = "";
// Reliable baseline offline prayer timings (ensures clock & countdown NEVER block on cold boot)
var fallbackTimings = {
    Fajr: "05:28",
    Sunrise: "06:44",
    Dhuhr: "12:29",
    Asr: "16:38",
    Sunset: "18:04",
    Maghrib: "18:04",
    Isha: "19:27",
    Imsak: "05:20"
};
function getTodayFormattedDate() {
    var now = new Date();
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return "".concat(now.getDate(), " ").concat(monthNames[now.getMonth()], " ").concat(now.getFullYear());
}
// Tick live clock immediately every second - runs synchronously from frame 1
function tickLiveClock() {
    try {
        var now = new Date();
        var timeDisplay = document.getElementById('current-time');
        if (timeDisplay) {
            timeDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        }
        var gregorianElement = document.getElementById('gregorian-date');
        if (gregorianElement && (!gregorianElement.textContent || gregorianElement.textContent === 'Loading...' || gregorianElement.textContent === 'N/A')) {
            gregorianElement.textContent = getTodayFormattedDate();
        }
    }
    catch (e) {
        console.warn("Live clock tick error:", e);
    }
}
// Start live clock immediately
tickLiveClock();
setInterval(tickLiveClock, 1000);
var azaanFiles = {
    Fajr: 'azan/fajr.mp3',
    Dhuhr: 'azan/dhuhr.mp3',
    Asr: 'azan/asr.mp3',
    Maghrib: 'azan/maghrib.mp3',
    Isha: 'azan/isha.mp3',
    MakruhBuzzer: 'azan/buzzer.mp3',
    HourlyBuzzer: 'azan/Alhamd.mp3',
    Silent: 'azan/silent.mp3'
};
function autoEnableAudio() {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    audioPlayer.src = azaanFiles.Silent;
                    audioPlayer.muted = true;
                    return [4 /*yield*/, audioPlayer.play()];
                case 1:
                    _a.sent();
                    audioPlayer.muted = false;
                    audioEnabled = true;
                    userInteracted = true;
                    console.log("Audio auto-enabled (kiosk mode)");
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.warn("Autoplay blocked, retrying...", err_1);
                    // retry after 3 seconds
                    setTimeout(autoEnableAudio, 3000);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Show interaction popup if no interaction
function showInteractionPopup() {
    if (!userInteracted && !isKiosk) {
        var popup = document.getElementById('interaction-popup');
        if (popup) {
            popup.style.display = 'block';
        }
    }
}
// Unlock audio on first user interaction
document.addEventListener('click', function () {
    if (!userInteracted) {
        userInteracted = true;
        audioEnabled = true;
        var popup = document.getElementById('interaction-popup');
        if (popup) {
            popup.style.display = 'none';
        }
        console.log("Audio enabled after user interaction.");
        audioPlayer.src = azaanFiles.Silent;
        audioPlayer.play().then(function () {
            console.log("Silent audio played successfully, unlocking autoplay.");
        }).catch(function (error) { return console.warn("Silent audio play failed:", error); });
    }
});
function isOnline() { return navigator.onLine; }
function toggleOfflineIndicator(isOffline) {
    var offlineIndicator = document.getElementById('offline-indicator');
    if (!offlineIndicator) {
        offlineIndicator = document.createElement('div');
        offlineIndicator.id = 'offline-indicator';
        offlineIndicator.style.position = 'fixed';
        offlineIndicator.style.top = '10px';
        offlineIndicator.style.right = '10px';
        offlineIndicator.style.width = '10px';
        offlineIndicator.style.height = '10px';
        offlineIndicator.style.borderRadius = '50%';
        offlineIndicator.style.backgroundColor = 'red';
        document.body.appendChild(offlineIndicator);
    }
    offlineIndicator.style.display = isOffline ? 'block' : 'none';
}
var BASE_URL = window.location.origin;
function loadSettings() {
    return __awaiter(this, void 0, void 0, function () {
        var defaultSettings, isLocalApp, storedSettings, storedStr, signal, timeoutId, controller_1, response, loadedSettings, loaded, error_1, bundleRes, bundleErr_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    defaultSettings = {
                        city: 'Mumbai',
                        state: '',
                        country: 'India',
                        calcMethod: '2',
                        asrMethod: 'hanafi',
                        adjustment: '0',
                        alarmTime: '00:00',
                        alarmAudio: '',
                        reminders: [],
                        theme: 'default',
                        layout: 'default'
                    };
                    isLocalApp = window.location.origin.includes('appassets') || window.location.protocol === 'file:' || !navigator.onLine;
                    storedSettings = null;
                    try {
                        storedStr = localStorage.getItem('settings');
                        if (storedStr)
                            storedSettings = JSON.parse(storedStr);
                    }
                    catch (e) { }
                    // On local/Android offline app, prioritize cached or settings.json directly
                    if (isLocalApp && storedSettings) {
                        return [2 /*return*/, storedSettings];
                    }
                    if (!!isLocalApp) return [3 /*break*/, 6];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    signal = undefined;
                    timeoutId = null;
                    if (typeof AbortController !== 'undefined') {
                        try {
                            controller_1 = new AbortController();
                            timeoutId = setTimeout(function () { try {
                                controller_1.abort();
                            }
                            catch (e) { } }, 3000);
                            signal = controller_1.signal;
                        }
                        catch (e) { }
                    }
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/save_settings.php"), {
                            signal: signal,
                            cache: 'no-cache'
                        })];
                case 2:
                    response = _a.sent();
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    loadedSettings = _a.sent();
                    loaded = {
                        city: loadedSettings.city || loadedSettings.location || 'Mumbai',
                        state: loadedSettings.state || '',
                        country: loadedSettings.country || 'India',
                        calcMethod: loadedSettings.calcMethod || '2',
                        asrMethod: loadedSettings.asrMethod || 'hanafi',
                        adjustment: loadedSettings.adjustment || '0',
                        alarmTime: loadedSettings.alarmTime || '00:00',
                        alarmAudio: loadedSettings.alarmAudio || '',
                        reminders: loadedSettings.reminders || [],
                        theme: loadedSettings.theme || 'default',
                        layout: loadedSettings.layout || 'default'
                    };
                    localStorage.setItem('settings', JSON.stringify(loaded));
                    return [2 /*return*/, loaded];
                case 4: return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.warn("Server settings fetch skipped, using local fallback");
                    return [3 /*break*/, 6];
                case 6:
                    if (storedSettings)
                        return [2 /*return*/, storedSettings];
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 11, , 12]);
                    return [4 /*yield*/, fetch('settings.json')];
                case 8:
                    bundleRes = _a.sent();
                    if (!bundleRes.ok) return [3 /*break*/, 10];
                    return [4 /*yield*/, bundleRes.json()];
                case 9:
                    storedSettings = _a.sent();
                    localStorage.setItem('settings', JSON.stringify(storedSettings));
                    return [2 /*return*/, storedSettings];
                case 10: return [3 /*break*/, 12];
                case 11:
                    bundleErr_1 = _a.sent();
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/, defaultSettings];
            }
        });
    });
}
function pollSettings() {
    return __awaiter(this, void 0, void 0, function () {
        var signal, timeoutId, controller_2, response, newSettings, normalizedNew, prayerGrid, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Only poll if on web server with PHP support and online
                    if (!navigator.onLine || window.location.origin.includes('appassets') || window.location.protocol === 'file:') {
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    signal = undefined;
                    timeoutId = null;
                    if (typeof AbortController !== 'undefined') {
                        try {
                            controller_2 = new AbortController();
                            timeoutId = setTimeout(function () { try {
                                controller_2.abort();
                            }
                            catch (e) { } }, 3000);
                            signal = controller_2.signal;
                        }
                        catch (e) { }
                    }
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/save_settings.php"), {
                            signal: signal,
                            cache: 'no-cache'
                        })];
                case 2:
                    response = _a.sent();
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    if (!response.ok)
                        throw new Error("HTTP error! Status: ".concat(response.status));
                    return [4 /*yield*/, response.json()];
                case 3:
                    newSettings = _a.sent();
                    normalizedNew = {
                        city: newSettings.city || newSettings.location || 'Mumbai',
                        state: newSettings.state || '',
                        country: newSettings.country || 'India',
                        calcMethod: newSettings.calcMethod || '2',
                        asrMethod: newSettings.asrMethod || 'hanafi',
                        adjustment: newSettings.adjustment || '0',
                        alarmTime: newSettings.alarmTime || '00:00',
                        alarmAudio: newSettings.alarmAudio || '',
                        reminders: newSettings.reminders || [],
                        theme: newSettings.theme || 'default',
                        layout: newSettings.layout || 'default',
                        azanAudioEnabled: typeof newSettings.azanAudioEnabled !== 'undefined' ? newSettings.azanAudioEnabled : true,
                        azanVolume: typeof newSettings.azanVolume !== 'undefined' ? newSettings.azanVolume : 100
                    };
                    if (!(JSON.stringify(normalizedNew) !== JSON.stringify(settings))) return [3 /*break*/, 5];
                    settings = normalizedNew;
                    console.log("Settings updated from server via polling:", settings);
                    localStorage.setItem('settings', JSON.stringify(settings));
                    var allKnownThemes = ['default', 'blue', 'dark', 'light', 'emerald-gold', 'ruby', 'amber', 'purple', 'highcontrast'];
                    for (var ti = 0; ti < allKnownThemes.length; ti++) {
                        document.body.classList.remove('theme-' + allKnownThemes[ti]);
                    }
                    if (settings.theme && settings.theme !== 'default') {
                        document.body.classList.add('theme-' + settings.theme);
                    }
                    prayerGrid = document.querySelector('.prayer-grid');
                    if (prayerGrid) {
                        var allKnownLayouts = ['default', 'compact', 'modern', 'horizontal', 'vertical'];
                        for (var li = 0; li < allKnownLayouts.length; li++) {
                            prayerGrid.classList.remove('layout-' + allKnownLayouts[li]);
                        }
                        if (settings.layout && settings.layout !== 'default') {
                            prayerGrid.classList.add('layout-' + settings.layout);
                        }
                    }
                    playedAzans = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
                    playedAlarm = false;
                    playedReminders = {};
                    playedMakruhBuzzer = false;
                    lastHour = -1;
                    prayerTimes30Days = {}; // Clear cache
                    return [4 /*yield*/, fetchDayPrayerTimes(getTodayDate())];
                case 4:
                    currentTimings = _a.sent(); // Force refetch today’s timings
                    if (currentTimings) {
                        console.log("New timings applied:", currentTimings);
                        updateTimeAndNextPrayer(currentTimings);
                    }
                    else {
                        console.error("Failed to fetch new prayer times");
                    }
                    fetchPrayerTimes30Days(); // Refetch 30-day data in background
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_2 = _a.sent();
                    // Log softly as a warning without throwing or tripping error banners during network hiccups
                    console.warn("Settings poll skipped or temporary network fluctuation:", error_2.message || error_2);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Add listener for General Settings updates
window.addEventListener('message', function (event) { return __awaiter(_this, void 0, void 0, function () {
    var updatedGeneralSettings_1, generalKeys, hasGeneralChanges;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(event.origin === BASE_URL && event.data.type === 'GENERAL_SETTINGS_UPDATED')) return [3 /*break*/, 2];
                updatedGeneralSettings_1 = event.data.settings;
                generalKeys = ['city', 'state', 'country', 'calcMethod', 'asrMethod', 'adjustment'];
                hasGeneralChanges = generalKeys.some(function (key) { return settings[key] !== updatedGeneralSettings_1[key]; });
                if (!hasGeneralChanges) return [3 /*break*/, 2];
                // Update only General Settings
                settings.city = updatedGeneralSettings_1.city;
                settings.state = updatedGeneralSettings_1.state;
                settings.country = updatedGeneralSettings_1.country;
                settings.calcMethod = updatedGeneralSettings_1.calcMethod;
                settings.asrMethod = updatedGeneralSettings_1.asrMethod;
                settings.adjustment = updatedGeneralSettings_1.adjustment;
                console.log("General settings updated from admin:", settings);
                localStorage.setItem('settings', JSON.stringify(settings));
                prayerTimes30Days = {}; // Clear cache to force refetch
                return [4 /*yield*/, fetchPrayerTimes()];
            case 1:
                currentTimings = _a.sent();
                if (currentTimings)
                    updateTimeAndNextPrayer(currentTimings);
                _a.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); });
function getTodayDate(offset) {
    if (offset === void 0) { offset = 0; }
    var today = new Date();
    today.setDate(today.getDate() + offset);
    return "".concat(today.getFullYear(), "-").concat((today.getMonth() + 1).toString().padStart(2, '0'), "-").concat(today.getDate().toString().padStart(2, '0'));
}
function timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string')
        return -1;
    // Strip timezone offset if Aladhan API returns it (e.g. "17:16 (IST)")
    var cleanTimeStr = timeStr.split(' ')[0];
    var _a = cleanTimeStr.split(':').map(Number), hours = _a[0], minutes = _a[1];
    if (isNaN(hours) || isNaN(minutes))
        return -1;
    return hours * 3600 + minutes * 60;
}
function secondsToHHMM(seconds) {
    if (seconds < 0)
        return '00:00';
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    return "".concat(hours.toString().padStart(2, '0'), ":").concat(minutes.toString().padStart(2, '0'));
}
function calculateQazaTime(ishaTime) {
    var ishaSeconds = timeToSeconds(ishaTime);
    if (ishaSeconds === -1)
        return 'N/A';
    var midnightSeconds = 24 * 3600; // Midnight (24:00)
    var qazaSeconds = (ishaSeconds + midnightSeconds) / 2; // Midpoint between Isha and midnight
    return secondsToHHMM(Math.floor(qazaSeconds));
}
function fetchPrayerTimes30Days() {
    return __awaiter(this, void 0, void 0, function () {
        var city, state, country, calcMethod, asrMethod, adjustment, shafaq, tune, timezonestring, today, endDate, months, commonParams, updatedAny_1, _i, months_1, m, endpoint, data, res, json, proxyErr_1, directUrl, res, json, directErr_1, monthErr_1, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!settings)
                        return [2 /*return*/];
                    city = settings.city, state = settings.state, country = settings.country, calcMethod = settings.calcMethod, asrMethod = settings.asrMethod, adjustment = settings.adjustment;
                    shafaq = 'general';
                    tune = '5,3,5,7,9,-1,0,8,-6';
                    timezonestring = 'Asia/Kolkata';
                    if (!isOnline()) {
                        console.warn("Offline: Using cached 30-day prayer times.");
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 19, , 20]);
                    today = new Date();
                    endDate = new Date();
                    endDate.setDate(today.getDate() + 30);
                    months = [{ year: today.getFullYear(), month: today.getMonth() + 1 }];
                    if (endDate.getMonth() !== today.getMonth() || endDate.getFullYear() !== today.getFullYear()) {
                        months.push({ year: endDate.getFullYear(), month: endDate.getMonth() + 1 });
                    }
                    commonParams = "city=".concat(encodeURIComponent(city), "&country=").concat(encodeURIComponent(country), "&state=").concat(encodeURIComponent(state || ''), "&method=").concat(calcMethod, "&school=").concat(asrMethod === 'hanafi' ? 1 : 0, "&shafaq=").concat(shafaq, "&tune=").concat(tune, "&timezonestring=").concat(timezonestring, "&adjustment=").concat(adjustment, "&calendarMethod=MATHEMATICAL");
                    updatedAny_1 = false;
                    _i = 0, months_1 = months;
                    _a.label = 2;
                case 2:
                    if (!(_i < months_1.length)) return [3 /*break*/, 18];
                    m = months_1[_i];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 16, , 17]);
                    endpoint = "calendarByCity/".concat(m.year, "/").concat(m.month);
                    data = null;
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 8, , 9]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/prayer_times_proxy.php?endpoint=").concat(endpoint, "&").concat(commonParams), { mode: 'cors' })];
                case 5:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 7];
                    return [4 /*yield*/, res.json()];
                case 6:
                    json = _a.sent();
                    if (json && json.data && Array.isArray(json.data)) {
                        data = json;
                    }
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    proxyErr_1 = _a.sent();
                    console.warn("Proxy failed for calendar ".concat(m.year, "/").concat(m.month, ", trying direct API:"), proxyErr_1);
                    return [3 /*break*/, 9];
                case 9:
                    if (!!data) return [3 /*break*/, 15];
                    _a.label = 10;
                case 10:
                    _a.trys.push([10, 14, , 15]);
                    directUrl = "https://api.aladhan.com/v1/calendarByCity/".concat(m.year, "/").concat(m.month, "?").concat(commonParams);
                    return [4 /*yield*/, fetch(directUrl, { mode: 'cors' })];
                case 11:
                    res = _a.sent();
                    if (!res.ok) return [3 /*break*/, 13];
                    return [4 /*yield*/, res.json()];
                case 12:
                    json = _a.sent();
                    if (json && json.data && Array.isArray(json.data)) {
                        data = json;
                    }
                    _a.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    directErr_1 = _a.sent();
                    console.warn("Direct calendar fetch failed for ".concat(m.year, "/").concat(m.month, ":"), directErr_1);
                    return [3 /*break*/, 15];
                case 15:
                    if (data && data.data && Array.isArray(data.data)) {
                        data.data.forEach(function (item) {
                            if (!item || !item.date || !item.timings)
                                return;
                            var g = item.date.gregorian;
                            if (!g)
                                return;
                            var dayStr = String(g.day).padStart(2, '0');
                            var monthStr = String(g.month.number).padStart(2, '0');
                            var key = "".concat(g.year, "-").concat(monthStr, "-").concat(dayStr);
                            prayerTimes30Days[key] = {
                                timings: item.timings,
                                readableDate: item.date.readable,
                                hijriDate: item.date.hijri ? "".concat(item.date.hijri.day, " ").concat(item.date.hijri.month.en, " ").concat(item.date.hijri.year) : '',
                                holidays: (item.date.hijri && item.date.hijri.holidays) || []
                            };
                            updatedAny_1 = true;
                        });
                    }
                    return [3 /*break*/, 17];
                case 16:
                    monthErr_1 = _a.sent();
                    console.warn("Error retrieving month ".concat(m.year, "/").concat(m.month, ":"), monthErr_1);
                    return [3 /*break*/, 17];
                case 17:
                    _i++;
                    return [3 /*break*/, 2];
                case 18:
                    if (updatedAny_1) {
                        localStorage.setItem('prayerTimes30Days', JSON.stringify(prayerTimes30Days));
                        console.log("Successfully cached 30-day prayer times from calendar.");
                        toggleOfflineIndicator(false);
                    }
                    return [3 /*break*/, 20];
                case 19:
                    err_2 = _a.sent();
                    console.warn("Could not complete 30-day prayer times background sync:", err_2);
                    return [3 /*break*/, 20];
                case 20: return [2 /*return*/];
            }
        });
    });
}
function fetchPrayerTimes() {
    return __awaiter(this, void 0, void 0, function () {
        var todayDate, cached, timings, err_3, cached, fallbackTimings, now, monthNames, fallbackDate;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!settings)
                        return [2 /*return*/, null];
                    todayDate = getTodayDate();
                    prayerTimes30Days = JSON.parse(localStorage.getItem('prayerTimes30Days')) || {};
                    // 1. If offline, use cached if available
                    if (!isOnline() && prayerTimes30Days[todayDate]) {
                        console.warn("Offline: Using cached prayer times.");
                        toggleOfflineIndicator(true);
                        cached = prayerTimes30Days[todayDate];
                        updatePrayerUI(cached.timings, cached.readableDate, cached.hijriDate);
                        return [2 /*return*/, cached.timings];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetchDayPrayerTimes(todayDate)];
                case 2:
                    timings = _a.sent();
                    if (timings) {
                        return [2 /*return*/, timings];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    console.error("Error fetching fresh timings:", err_3);
                    return [3 /*break*/, 4];
                case 4:
                    // 3. Fallback to cached today's timings if fresh fetch failed
                    if (prayerTimes30Days[todayDate]) {
                        console.warn("Fetch failed: falling back to cached prayer times.");
                        cached = prayerTimes30Days[todayDate];
                        updatePrayerUI(cached.timings, cached.readableDate, cached.hijriDate);
                        return [2 /*return*/, cached.timings];
                    }
                    fallbackTimings = {
                        Fajr: "05:28",
                        Sunrise: "06:44",
                        Dhuhr: "12:29",
                        Asr: "16:38",
                        Sunset: "18:04",
                        Maghrib: "18:04",
                        Isha: "19:27",
                        Imsak: "05:20"
                    };
                    now = new Date();
                    monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    fallbackDate = "".concat(now.getDate(), " ").concat(monthNames[now.getMonth()], " ").concat(now.getFullYear());
                    updatePrayerUI(fallbackTimings, fallbackDate, "Islamic Calendar");
                    return [2 /*return*/, fallbackTimings];
            }
        });
    });
}
function fetchDayPrayerTimes(date) {
    return __awaiter(this, void 0, void 0, function () {
        var city, state, country, calcMethod, asrMethod, adjustment, shafaq, tune, timezonestring, parts, dd_mm_yyyy, endpoint, urlParams, data, response, json, proxyError_1, directUrl, response, timings, readableDate, hijriDate, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!settings)
                        return [2 /*return*/, null];
                    city = settings.city, state = settings.state, country = settings.country, calcMethod = settings.calcMethod, asrMethod = settings.asrMethod, adjustment = settings.adjustment;
                    shafaq = 'general';
                    tune = '5,3,5,7,9,-1,0,8,-6';
                    timezonestring = 'Asia/Kolkata';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, , 10]);
                    parts = date ? date.split('-') : [];
                    dd_mm_yyyy = parts.length === 3 ? "".concat(parts[2], "-").concat(parts[1], "-").concat(parts[0]) : '';
                    endpoint = dd_mm_yyyy ? "timingsByCity/".concat(dd_mm_yyyy) : 'timingsByCity';
                    urlParams = "city=".concat(encodeURIComponent(city), "&country=").concat(encodeURIComponent(country), "&state=").concat(encodeURIComponent(state || ''), "&method=").concat(calcMethod, "&school=").concat(asrMethod === 'hanafi' ? 1 : 0, "&adjustment=").concat(adjustment, "&shafaq=").concat(shafaq, "&tune=").concat(tune, "&timezonestring=").concat(timezonestring, "&calendarMethod=MATHEMATICAL");
                    console.log("Fetching prayer times for date:", date, "endpoint:", endpoint);
                    data = null;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 8]);
                    console.log("Fetching via proxy...");
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/prayer_times_proxy.php?endpoint=").concat(endpoint, "&").concat(urlParams), { mode: 'cors' })];
                case 3:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Proxy status: ".concat(response.status));
                    return [4 /*yield*/, response.json()];
                case 4:
                    json = _a.sent();
                    if (json && json.status === 'error')
                        throw new Error(json.message || 'Proxy error');
                    if (json && json.data)
                        data = json;
                    return [3 /*break*/, 8];
                case 5:
                    proxyError_1 = _a.sent();
                    console.warn("Proxy failed, trying direct Aladhan API:", proxyError_1);
                    directUrl = dd_mm_yyyy
                        ? "https://api.aladhan.com/v1/timingsByCity/".concat(dd_mm_yyyy, "?").concat(urlParams)
                        : "https://api.aladhan.com/v1/timingsByCity?".concat(urlParams);
                    return [4 /*yield*/, fetch(directUrl, { mode: 'cors' })];
                case 6:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Direct fetch status: ".concat(response.status));
                    return [4 /*yield*/, response.json()];
                case 7:
                    data = _a.sent();
                    return [3 /*break*/, 8];
                case 8:
                    if (!data || !data.data || !data.data.timings) {
                        throw new Error("Invalid prayer times payload received");
                    }
                    timings = data.data.timings;
                    readableDate = data.data.date.readable;
                    hijriDate = "".concat(data.data.date.hijri.day, " ").concat(data.data.date.hijri.month.en, " ").concat(data.data.date.hijri.year);
                    prayerTimes30Days[date] = { timings: timings, readableDate: readableDate, hijriDate: hijriDate, holidays: data.data.date.hijri.holidays || [] };
                    localStorage.setItem('prayerTimes30Days', JSON.stringify(prayerTimes30Days));
                    toggleOfflineIndicator(false);
                    console.log("Fetched timings:", timings);
                    updatePrayerUI(timings, readableDate, hijriDate);
                    return [2 /*return*/, timings];
                case 9:
                    error_3 = _a.sent();
                    console.error("Error fetching prayer times:", error_3);
                    if (!isOnline()) {
                        toggleOfflineIndicator(true);
                    }
                    return [2 /*return*/, null];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function formatTo12Hour(timeStr) {
    if (!timeStr || typeof timeStr !== 'string')
        return 'N/A';
    var cleanTime = timeStr.split(' ')[0]; // strip timezone labels e.g. "17:16 (IST)" -> "17:16"
    var parts = cleanTime.split(':');
    if (parts.length < 2)
        return cleanTime;
    var hours = parseInt(parts[0], 10);
    var minutes = parts[1];
    if (isNaN(hours))
        return cleanTime;
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // convert hour '0' to '12'
    return "".concat(hours.toString().padStart(2, '0'), ":").concat(minutes, " ").concat(ampm);
}
function updatePrayerUI(timings, readableDate, hijriDate) {
    var fields = [
        { id: 'fajr-begins', value: timings ? timings.Fajr : '' },
        { id: 'fajr-jamaat', value: timings ? timings.Fajr : '' },
        { id: 'fajr-additional', value: timings ? timings.Imsak : '' },
        { id: 'dhuhr-begins', value: timings ? timings.Dhuhr : '' },
        { id: 'dhuhr-jamaat', value: timings ? timings.Dhuhr : '' },
        { id: 'dhuhr-additional', value: timings ? timings.Sunrise : '' },
        { id: 'asr-begins', value: timings ? timings.Asr : '' },
        { id: 'asr-jamaat', value: timings ? timings.Asr : '' },
        { id: 'asr-additional', value: timings ? timings.Sunset : '' },
        { id: 'maghrib-begins', value: timings ? timings.Maghrib : '' },
        { id: 'maghrib-jamaat', value: timings ? timings.Maghrib : '' },
        { id: 'maghrib-additional', value: timings ? timings.Sunset : '' },
        { id: 'isha-begins', value: timings ? timings.Isha : '' },
        { id: 'isha-jamaat', value: timings ? timings.Isha : '' },
        { id: 'isha-qaza', value: (timings && timings.Isha) ? calculateQazaTime(timings.Isha) : 'N/A' },
        { id: 'gregorian-date', value: readableDate },
        { id: 'islamic-date', value: hijriDate },
        { id: 'current-city', value: settings ? settings.city : '' },
    ];
    fields.forEach(function (field) {
        var element = document.getElementById(field.id);
        if (element) {
            var cleanValue = field.value ? String(field.value) : '';
            // Format times as 12-hour strings if applicable
            var isTimeField = field.id.endsWith('-begins') ||
                field.id.endsWith('-jamaat') ||
                field.id.endsWith('-additional') ||
                field.id.endsWith('-qaza');
            if (isTimeField && cleanValue && cleanValue !== 'N/A') {
                cleanValue = cleanValue.split(' ')[0];
                cleanValue = formatTo12Hour(cleanValue);
            }
            element.textContent = cleanValue || 'N/A';
        }
    });
    console.log("UI updated with:", { timings: timings, readableDate: readableDate, hijriDate: hijriDate });
}
function fetchHadith(day, prayer) {
    return __awaiter(this, void 0, void 0, function () {
        var cachedHadiths, hadithCacheKey, cachedHadith, defaultHadith, isLocalApp, response, hadith, error_4, fallbackResponse, hadiths, hadith, fallbackError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cachedHadiths = JSON.parse(localStorage.getItem('cachedHadiths') || '{}');
                    hadithCacheKey = "hadith-".concat(day, "-").concat(prayer);
                    cachedHadith = cachedHadiths[hadithCacheKey];
                    if (cachedHadith) {
                        return [2 /*return*/, cachedHadith];
                    }
                    defaultHadith = {
                        Day: String(day),
                        Prayer: prayer,
                        English: "The best among you are those who have the best manners and character.",
                        Source: "Sahih al-Bukhari 6035"
                    };
                    isLocalApp = (typeof window !== 'undefined' && window.location) ? (window.location.origin.includes('appassets') ||
                        window.location.protocol === 'file:' ||
                        !navigator.onLine) : false;
                    if (!!isLocalApp) return [3 /*break*/, 6];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/load_hadith.php?prayer=").concat(prayer, "&day=").concat(day))];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    hadith = _a.sent();
                    cachedHadiths[hadithCacheKey] = hadith;
                    localStorage.setItem('cachedHadiths', JSON.stringify(cachedHadiths));
                    return [2 /*return*/, hadith];
                case 4: return [3 /*break*/, 6];
                case 5:
                    error_4 = _a.sent();
                    return [3 /*break*/, 6];
                case 6:
                    _a.trys.push([6, 10, , 11]);
                    return [4 /*yield*/, fetch('hadiths.json')];
                case 7:
                    fallbackResponse = _a.sent();
                    if (!fallbackResponse.ok) return [3 /*break*/, 9];
                    return [4 /*yield*/, fallbackResponse.json()];
                case 8:
                    hadiths = _a.sent();
                    hadith = hadiths.find(function (h) { return h.Day === String(day) && h.Prayer === prayer; });
                    if (hadith) {
                        cachedHadiths[hadithCacheKey] = hadith;
                        localStorage.setItem('cachedHadiths', JSON.stringify(cachedHadiths));
                        return [2 /*return*/, hadith];
                    }
                    _a.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    fallbackError_1 = _a.sent();
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/, defaultHadith];
            }
        });
    });
}
// FIXED: This function is called every second. We fetch and compile hadiths and holidays
// ONLY if the prayer or date has changed, instead of spawning infinitely many intervals!
function displayHadithAndHolidays(timings) {
    return __awaiter(this, void 0, void 0, function () {
        var now, currentSeconds, startOfYear, dayOfYear, jsonDay, prayerTimes, mostRecentPrayer, mostRecentPrayerSeconds, _i, prayerTimes_1, prayer, prayerSeconds, cacheKey, _loop_1, i, title, content, source, hadithBox, currentHolidayText;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!timings)
                        return [2 /*return*/];
                    now = new Date();
                    currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
                    startOfYear = new Date(now.getFullYear(), 0, 0);
                    dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
                    jsonDay = ((dayOfYear - 1) % 360) + 1;
                    prayerTimes = [
                        { name: 'Fajr', time: timings.Fajr },
                        { name: 'Dhuhr', time: timings.Dhuhr },
                        { name: 'Asr', time: timings.Asr },
                        { name: 'Maghrib', time: timings.Maghrib },
                        { name: 'Isha', time: timings.Isha },
                    ];
                    mostRecentPrayer = 'Isha';
                    mostRecentPrayerSeconds = 0;
                    for (_i = 0, prayerTimes_1 = prayerTimes; _i < prayerTimes_1.length; _i++) {
                        prayer = prayerTimes_1[_i];
                        prayerSeconds = timeToSeconds(prayer.time);
                        if (prayerSeconds !== -1 && currentSeconds >= prayerSeconds && prayerSeconds > mostRecentPrayerSeconds) {
                            mostRecentPrayer = prayer.name;
                            mostRecentPrayerSeconds = prayerSeconds;
                        }
                    }
                    cacheKey = "".concat(jsonDay, "-").concat(mostRecentPrayer);
                    if (!(cacheKey !== lastHadithUpdate)) return [3 /*break*/, 2];
                    lastHadithUpdate = cacheKey;
                    return [4 /*yield*/, fetchHadith(jsonDay, mostRecentPrayer)];
                case 1:
                    currentHadithData = _a.sent();
                    // Compile upcoming holidays
                    currentHolidays = [];
                    _loop_1 = function (i) {
                        var date = getTodayDate(i);
                        var cachedDay = prayerTimes30Days[date];
                        if (cachedDay && cachedDay.holidays && cachedDay.holidays.length > 0) {
                            currentHolidays.push.apply(currentHolidays, cachedDay.holidays.map(function (h) { return "".concat(h, " on ").concat(cachedDay.readableDate); }));
                        }
                    };
                    for (i = 0; i < 30; i++) {
                        _loop_1(i);
                    }
                    holidayIndex = 0;
                    _a.label = 2;
                case 2:
                    title = document.getElementById('hadith-title');
                    content = document.getElementById('hadith-english');
                    source = document.getElementById('hadith-source');
                    if (title && content && source && currentHadithData) {
                        hadithBox = document.getElementById('hadith-box');
                        // Toggle view: 20 seconds Hadith, 10 seconds Holidays
                        if (Date.now() % 30000 < 20000) {
                            if (hadithBox)
                                hadithBox.classList.remove('holiday-active');
                            title.textContent = 'HADITH';
                            content.textContent = currentHadithData.English || 'Not available';
                            source.textContent = currentHadithData.Source ? "Source: ".concat(currentHadithData.Source) : 'Source: Not available';
                        }
                        else {
                            if (hadithBox)
                                hadithBox.classList.add('holiday-active');
                            title.textContent = 'HOLIDAY';
                            if (currentHolidays.length === 0) {
                                content.textContent = 'No upcoming holidays';
                            }
                            else {
                                currentHolidayText = currentHolidays[holidayIndex % currentHolidays.length];
                                content.textContent = currentHolidayText;
                                // Increment index once when we enter the holiday phase
                                if (Math.floor((Date.now() % 30000) / 1000) === 20) {
                                    holidayIndex = (holidayIndex + 1) % currentHolidays.length;
                                }
                            }
                            source.textContent = '';
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function resetPlayedFlags() {
    var now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
        playedAzans = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
        playedAlarm = false;
        playedReminders = {};
        playedMakruhBuzzer = false;
        lastHour = -1;
        currentlyPlayingReminder = null;
        console.log("Reset played flags at midnight.");
    }
}
function showPlayPrompt(reminderIndex, audio) {
    var nextPrayerElement = document.getElementById('next-prayer');
    if (nextPrayerElement) {
        nextPrayerElement.textContent = "Reminder ".concat(reminderIndex + 1, " Ready - Click to Play");
        nextPrayerElement.classList.add('play-prompt');
        nextPrayerElement.onclick = function () {
            audioPlayer.src = audio;
            audioPlayer.play().then(function () {
                currentlyPlayingReminder = reminderIndex;
                updateTimeAndNextPrayer(currentTimings);
            }).catch(function (error) { return console.error("Error playing Reminder ".concat(reminderIndex, ":"), error); });
        };
    }
}
function updateTimeAndNextPrayer(timings) {
    return __awaiter(this, void 0, void 0, function () {
        var now, currentTime, timeDisplay, gregorianElement, monthNames, islamicElement, todayDate, nextPrayerElement_1, currentSeconds, currentHour, currentMinute, currentSecond, imsakSeconds, sunriseSeconds, dhuhrSeconds, asrSeconds, sunsetSeconds, isMakruh, makruhEndSeconds, prayers, timeWindow, _loop_2, _i, prayers_1, prayer, alarmTime, alarmAudio, alarmSeconds, alarmDiff, reminders, currentPrayer, mostRecentPrayerSeconds, nextPrayer, nextPrayerSeconds, nextPrayerDate, _a, prayers_2, prayer, prayerSeconds, nextPrayerElement, remainingSeconds, remainingTime, reminderData, reminderAudio, timeElapsed, remainingSeconds, remainingTime, remainingSeconds, remainingTime, prayerBoxes, highlightClasses, currentBoxId, currentBox;
        return __generator(this, function (_b) {
            now = new Date();
            currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            timeDisplay = document.getElementById('current-time');
            if (timeDisplay) {
                timeDisplay.textContent = currentTime;
            }
            gregorianElement = document.getElementById('gregorian-date');
            if (gregorianElement && (gregorianElement.textContent === 'Loading...' || !gregorianElement.textContent || gregorianElement.textContent === 'N/A')) {
                monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                gregorianElement.textContent = "".concat(now.getDate(), " ").concat(monthNames[now.getMonth()], " ").concat(now.getFullYear());
            }
            islamicElement = document.getElementById('islamic-date');
            if (islamicElement && (islamicElement.textContent === 'Loading...' || !islamicElement.textContent || islamicElement.textContent === 'N/A')) {
                todayDate = getTodayDate();
                if (prayerTimes30Days[todayDate] && prayerTimes30Days[todayDate].hijriDate) {
                    islamicElement.textContent = prayerTimes30Days[todayDate].hijriDate;
                }
            }
            if (!timings || typeof timings !== 'object') {
                nextPrayerElement_1 = document.getElementById('next-prayer');
                if (nextPrayerElement_1) {
                    nextPrayerElement_1.textContent = "Loading prayer times...";
                }
                return [2 /*return*/];
            }
            currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            currentHour = now.getHours();
            currentMinute = now.getMinutes();
            currentSecond = now.getSeconds();
            imsakSeconds = timeToSeconds(timings.Imsak);
            sunriseSeconds = timeToSeconds(timings.Sunrise);
            dhuhrSeconds = timeToSeconds(timings.Dhuhr);
            asrSeconds = timeToSeconds(timings.Asr);
            sunsetSeconds = timeToSeconds(timings.Sunset);
            isMakruh = false;
            makruhEndSeconds = 0;
            if (sunriseSeconds !== -1 && currentSeconds >= sunriseSeconds && currentSeconds < (sunriseSeconds + 900)) {
                isMakruh = true;
                makruhEndSeconds = sunriseSeconds + 900;
            }
            else if (dhuhrSeconds !== -1 && currentSeconds >= (dhuhrSeconds - 600) && currentSeconds < dhuhrSeconds) {
                isMakruh = true;
                makruhEndSeconds = dhuhrSeconds;
            }
            else if (sunsetSeconds !== -1 && currentSeconds >= (sunsetSeconds - 1200) && currentSeconds < sunsetSeconds) {
                isMakruh = true;
                makruhEndSeconds = sunsetSeconds;
            }
            resetPlayedFlags();
            if (!userInteracted && !isKiosk)
                showInteractionPopup();
            window.__scriptJsHandlingAudio = true;
            var currentVolume = (settings && typeof settings.azanVolume !== 'undefined') ? Math.max(0, Math.min(1, settings.azanVolume / 100)) : 1.0;
            var isAzanEnabled = !settings || settings.azanAudioEnabled !== false;

            function playKioskAudioTrack(audioSrc, vol) {
                var clean = audioSrc || '';
                if (!clean.startsWith('http') && !clean.startsWith('/') && !clean.startsWith('azan/')) {
                    clean = 'azan/' + clean;
                }
                var v = typeof vol === 'number' ? Math.max(0, Math.min(1, vol)) : 1.0;
                if (window.AndroidAudio && typeof window.AndroidAudio.playAudio === 'function') {
                    try {
                        if (typeof window.AndroidAudio.setVolume === 'function') {
                            window.AndroidAudio.setVolume(v);
                        }
                        window.AndroidAudio.playAudio(clean);
                        console.log("[Audio] Played via native AndroidAudio:", clean);
                        return;
                    } catch (e) {
                        console.warn("[Audio] Native bridge failed, using HTML5:", e);
                    }
                }
                try {
                    audioPlayer.volume = v;
                    audioPlayer.src = clean;
                    audioPlayer.play().catch(function(err) {
                        console.warn("[Audio] Direct play failed, trying Blob:", err);
                        fetch(clean)
                            .then(function(res) { return res.blob(); })
                            .then(function(b) {
                                audioPlayer.src = URL.createObjectURL(b);
                                audioPlayer.volume = v;
                                audioPlayer.play().catch(function(e) { console.error("Blob play failed:", e); });
                            })
                            .catch(function(fe) { console.error("Audio fetch error:", fe); });
                    });
                } catch (e) {
                    console.error("Audio exception:", e);
                }
            }

            if (currentHour !== lastHour && currentMinute === 0 && currentSecond <= 6) {
                console.log("[Hourly Buzzer Check] Triggered! hour=".concat(currentHour, ", isAzanEnabled=").concat(isAzanEnabled, ", isMakruh=").concat(isMakruh));
                if (isAzanEnabled && !isMakruh) {
                    console.log("[Hourly Buzzer Check] Playing hourly buzzer from ".concat(azaanFiles.HourlyBuzzer, "..."));
                    playKioskAudioTrack(azaanFiles.HourlyBuzzer, currentVolume);
                    audioEnabled = true;
                }
                lastHour = currentHour;
            }
            prayers = [
                { name: 'Fajr', time: timings.Fajr, audio: azaanFiles.Fajr },
                { name: 'Dhuhr', time: timings.Dhuhr, audio: azaanFiles.Dhuhr },
                { name: 'Asr', time: timings.Asr, audio: azaanFiles.Asr },
                { name: 'Maghrib', time: timings.Maghrib, audio: azaanFiles.Maghrib },
                { name: 'Isha', time: timings.Isha, audio: azaanFiles.Isha },
            ];
            timeWindow = 60;
            _loop_2 = function (prayer) {
                var prayerSeconds = timeToSeconds(prayer.time);
                if (prayerSeconds === -1)
                    return "continue";
                var diff = currentSeconds - prayerSeconds;
                if (diff >= 0 && diff <= timeWindow && !playedAzans[prayer.name]) {
                    if (isAzanEnabled && !isMakruh) {
                        playKioskAudioTrack(prayer.audio, currentVolume);
                        playedAzans[prayer.name] = true;
                        audioEnabled = true;
                        userInteracted = true;
                        console.log("Azan played successfully for " + prayer.name);
                    }
                    else if (!isAzanEnabled) {
                        console.log("Azan for " + prayer.name + " muted (Azan disabled in settings).");
                    }
                }
            };
            for (_i = 0, prayers_1 = prayers; _i < prayers_1.length; _i++) {
                prayer = prayers_1[_i];
                _loop_2(prayer);
            }
            alarmTime = (settings && settings.alarmTime) ? settings.alarmTime : '00:00';
            alarmAudio = (settings && settings.alarmAudio) ? settings.alarmAudio : '';
            alarmSeconds = timeToSeconds(alarmTime);
            if (alarmSeconds !== -1) {
                alarmDiff = currentSeconds - alarmSeconds;
                if (alarmDiff >= 0 && alarmDiff <= timeWindow && !playedAlarm && alarmAudio) {
                    if (audioEnabled && !isMakruh) {
                        playKioskAudioTrack(alarmAudio, currentVolume);
                        playedAlarm = true;
                    }
                }
            }
            reminders = (settings && settings.reminders) ? settings.reminders : [];
            reminders.forEach(function (reminder, index) {
                var time = reminder ? reminder.time : null;
                var audio = reminder ? reminder.audio : null;
                var repeat = (reminder && reminder.repeat) ? true : false;
                if (!time)
                    return;
                if (audio && !audio.startsWith('azan/'))
                    audio = "azan/".concat(audio);
                var reminderSeconds = timeToSeconds(time);
                if (reminderSeconds === -1)
                    return;
                var diff = currentSeconds - reminderSeconds;
                if (diff >= 0 && diff <= timeWindow && (!playedReminders[index] || repeat) && audio) {
                    if (audioEnabled && !isMakruh) {
                        playKioskAudioTrack(audio, currentVolume);
                        currentlyPlayingReminder = index;
                        if (!repeat)
                            playedReminders[index] = true;
                    }
                    else if (!userInteracted && !isMakruh) {
                        showPlayPrompt(index, audio);
                        if (!repeat)
                            playedReminders[index] = true;
                    }
                }
            });
            currentPrayer = null;
            mostRecentPrayerSeconds = -Infinity;
            nextPrayer = null;
            nextPrayerSeconds = Infinity;
            nextPrayerDate = null;
            for (_a = 0, prayers_2 = prayers; _a < prayers_2.length; _a++) {
                prayer = prayers_2[_a];
                prayerSeconds = timeToSeconds(prayer.time);
                if (prayerSeconds === -1)
                    continue;
                if (currentSeconds >= prayerSeconds && prayerSeconds > mostRecentPrayerSeconds) {
                    currentPrayer = prayer.name;
                    mostRecentPrayerSeconds = prayerSeconds;
                }
                if (prayerSeconds > currentSeconds && prayerSeconds < nextPrayerSeconds) {
                    nextPrayer = prayer;
                    nextPrayerSeconds = prayerSeconds;
                    nextPrayerDate = getTodayDate(0); // Today
                }
            }
            if (!currentPrayer)
                currentPrayer = 'Isha';
            if (!nextPrayer) {
                nextPrayer = prayers[0];
                nextPrayerSeconds = timeToSeconds(nextPrayer.time) + 24 * 3600;
                nextPrayerDate = getTodayDate(1); // Tomorrow
            }
            if (isMakruh && !lastMakruhState && !playedMakruhBuzzer) {
                if (audioEnabled) {
                    audioPlayer.src = azaanFiles.MakruhBuzzer;
                    audioPlayer.play().then(function () {
                        playedMakruhBuzzer = true;
                    }).catch(function (error) { return console.error("Error playing Makruh buzzer:", error); });
                }
            }
            else if (!isMakruh && lastMakruhState) {
                playedMakruhBuzzer = false;
            }
            lastMakruhState = isMakruh;
            nextPrayerElement = document.getElementById('next-prayer');
            if (nextPrayerElement) {
                if (isMakruh) {
                    remainingSeconds = makruhEndSeconds - currentSeconds;
                    remainingTime = secondsToHHMM(remainingSeconds);
                    nextPrayerElement.innerHTML = "<strong style=\"color: #FFFFFF; background-color: #FF0000; padding: 2px 5px; font-weight: bold;\">Makruh Waqt ends at ".concat(remainingTime, "</strong>");
                    nextPrayerElement.classList.add('makruh-warning');
                    nextPrayerElement.classList.remove('play-prompt');
                    nextPrayerElement.onclick = null;
                }
                else if (currentlyPlayingReminder !== null) {
                    reminderData = (settings && settings.reminders && settings.reminders[currentlyPlayingReminder]) ? settings.reminders[currentlyPlayingReminder] : null;
                    reminderAudio = reminderData ? reminderData.audio.split('/').pop().replace(/\.[^/.]+$/, '') : "Reminder";
                    timeElapsed = Date.now() % 25000;
                    if (timeElapsed < 10000) { // 10s audio name
                        nextPrayerElement.textContent = "".concat(reminderAudio, " Playing");
                    }
                    else { // 15s next prayer
                        remainingSeconds = nextPrayerSeconds - currentSeconds;
                        remainingTime = secondsToHHMM(remainingSeconds);
                        nextPrayerElement.textContent = "Next Prayer: ".concat(nextPrayer.name, " in ").concat(remainingTime);
                    }
                    nextPrayerElement.classList.remove('makruh-warning', 'play-prompt');
                    nextPrayerElement.onclick = function () {
                        audioPlayer.pause();
                        currentlyPlayingReminder = null;
                        updateTimeAndNextPrayer(timings);
                    };
                }
                else {
                    nextPrayerElement.classList.remove('makruh-warning');
                    if (!nextPrayerElement.classList.contains('play-prompt')) {
                        nextPrayerElement.onclick = null;
                        remainingSeconds = nextPrayerSeconds - currentSeconds;
                        remainingTime = secondsToHHMM(remainingSeconds);
                        nextPrayerElement.textContent = "Next Prayer: ".concat(nextPrayer.name, " in ").concat(remainingTime);
                    }
                }
            }
            prayerBoxes = ['fajr-box', 'dhuhr-box', 'asr-box', 'maghrib-box', 'isha-box'];
            highlightClasses = ['fajr-highlight', 'dhuhr-highlight', 'asr-highlight', 'maghrib-highlight', 'isha-highlight'];
            prayerBoxes.forEach(function (box) {
                var element = document.getElementById(box);
                if (element) {
                    highlightClasses.forEach(function (cls) { return element.classList.remove(cls); });
                    element.classList.remove('makruh-highlight');
                }
            });
            currentBoxId = "".concat(currentPrayer.toLowerCase(), "-box");
            currentBox = document.getElementById(currentBoxId);
            if (currentBox) {
                if (isMakruh) {
                    currentBox.classList.add('makruh-highlight');
                }
                else {
                    currentBox.classList.add("".concat(currentPrayer.toLowerCase(), "-highlight"));
                }
            }
            try {
                displayHadithAndHolidays(timings);
            }
            catch (e) {
                console.warn("displayHadithAndHolidays error:", e);
            }
            return [2 /*return*/];
        });
    });
}
window.addEventListener('storage', function (event) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(event.key === 'settings' || event.key === null)) return [3 /*break*/, 3];
                return [4 /*yield*/, loadSettings()];
            case 1:
                settings = _a.sent();
                playedAzans = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
                playedAlarm = false;
                playedReminders = {};
                playedMakruhBuzzer = false;
                lastHour = -1;
                return [4 /*yield*/, fetchPrayerTimes()];
            case 2:
                currentTimings = _a.sent();
                if (currentTimings)
                    updateTimeAndNextPrayer(currentTimings);
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var initialTimings, cached30, today, popup, settingsErr_1, liveTimings, prayerErr_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    initialTimings = fallbackTimings;
                    try {
                        cached30 = JSON.parse(localStorage.getItem('prayerTimes30Days') || '{}');
                        today = getTodayDate();
                        if (cached30 && cached30[today] && cached30[today].timings) {
                            initialTimings = cached30[today].timings;
                            updatePrayerUI(initialTimings, cached30[today].readableDate, cached30[today].hijriDate);
                        }
                        else {
                            updatePrayerUI(fallbackTimings, getTodayFormattedDate(), "Islamic Calendar");
                        }
                    }
                    catch (e) {
                        updatePrayerUI(fallbackTimings, getTodayFormattedDate(), "Islamic Calendar");
                    }
                    currentTimings = initialTimings;
                    updateTimeAndNextPrayer(currentTimings);
                    // 2. Start high-frequency update interval for next prayer countdown and clock
                    setInterval(function () {
                        updateTimeAndNextPrayer(currentTimings || fallbackTimings);
                    }, 1000);
                    // 3. Audio kiosk unlock
                    if (isKiosk) {
                        popup = document.getElementById('interaction-popup');
                        if (popup)
                            popup.remove();
                        autoEnableAudio();
                    }
                    else {
                        showInteractionPopup();
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, loadSettings()];
                case 2:
                    settings = _a.sent();
                    if (settings) {
                        var allKnownThemes = ['default', 'blue', 'dark', 'light', 'emerald-gold', 'ruby', 'amber', 'purple', 'highcontrast'];
                        for (var ti = 0; ti < allKnownThemes.length; ti++) {
                            document.body.classList.remove('theme-' + allKnownThemes[ti]);
                        }
                        if (settings.theme && settings.theme !== 'default') {
                            document.body.classList.add("theme-".concat(settings.theme));
                        }
                        var pGrid = document.querySelector('.prayer-grid');
                        if (pGrid) {
                            var allKnownLayouts = ['default', 'compact', 'modern', 'horizontal', 'vertical'];
                            for (var li = 0; li < allKnownLayouts.length; li++) {
                                pGrid.classList.remove('layout-' + allKnownLayouts[li]);
                            }
                            if (settings.layout && settings.layout !== 'default') {
                                pGrid.classList.add("layout-".concat(settings.layout));
                            }
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    settingsErr_1 = _a.sent();
                    console.warn("Settings load warning:", settingsErr_1);
                    return [3 /*break*/, 4];
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, fetchPrayerTimes()];
                case 5:
                    liveTimings = _a.sent();
                    if (liveTimings) {
                        currentTimings = liveTimings;
                        updateTimeAndNextPrayer(currentTimings);
                    }
                    return [3 /*break*/, 7];
                case 6:
                    prayerErr_1 = _a.sent();
                    console.warn("Prayer times fetch warning:", prayerErr_1);
                    return [3 /*break*/, 7];
                case 7:
                    try {
                        fetchPrayerTimes30Days();
                    }
                    catch (e) { }
                    // 6. Settings polling & periodic stability reload
                    setInterval(pollSettings, 5000);
                    setInterval(function () {
                        console.log("[Auto Reload] Refreshing page for kiosk stability and fresh data fetch...");
                        window.location.reload();
                    }, 65 * 60 * 1000);
                    // 7. Request screen wake lock
                    requestScreenWakeLock();
                    return [2 /*return*/];
            }
        });
    });
}
// --- Android & Mobile Kiosk Enhancements ---
// 1. Screen Wake Lock (Prevents Android screen from dimming/sleeping)
var wakeLock = null;
function requestScreenWakeLock() {
    return __awaiter(this, void 0, void 0, function () {
        var err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!('wakeLock' in navigator)) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, navigator.wakeLock.request('screen')];
                case 2:
                    wakeLock = _a.sent();
                    console.log('[WakeLock] Screen Wake Lock active - display will stay on.');
                    return [3 /*break*/, 4];
                case 3:
                    err_4 = _a.sent();
                    console.warn('[WakeLock] Could not acquire screen wake lock:', err_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Re-acquire wake lock if tab/app becomes visible again
document.addEventListener('visibilitychange', function () {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestScreenWakeLock();
    }
});
// 2. Double-click or double-tap anywhere to toggle fullscreen
document.addEventListener('dblclick', function () {
    if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(function () { });
        }
    }
    else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(function () { });
        }
    }
});
// 3. Register Service Worker for PWA / offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').then(function (reg) {
            console.log('[PWA] Service Worker registered:', reg.scope);
        }).catch(function (err) {
            console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
}
// Start init on DOM ready or immediately if document already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}
window.addEventListener('load', function () {
    if (!currentTimings)
        init();
});
