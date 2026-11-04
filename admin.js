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
var BASE_URL = window.location.origin;
var audioPlayer = new Audio();
var currentlyPlayingReminder = null;
var audioEnabled = false;
var azanFiles = [];
var settings = {
    city: 'Mumbai',
    state: '',
    country: 'India',
    calcMethod: '2',
    asrMethod: 'hanafi',
    adjustment: '0',
    alarmTime: '00:00',
    alarmAudio: 'azan/adhan1.mp3',
    reminders: [],
    theme: 'default',
    layout: 'default'
};
var lastSavedSettings = null;
document.addEventListener('DOMContentLoaded', function () {
    loadSettings();
    setupTabNavigation();
    setupEventListeners();
    fetchAzanFiles();
    var savedTheme = localStorage.getItem('selectedTheme') || 'default';
    selectTheme(savedTheme);
    var savedLayout = localStorage.getItem('selectedLayout') || 'default';
    selectLayout(savedLayout);
});
function setupTabNavigation() {
    var navTabs = document.querySelectorAll('.nav-tab');
    var sections = document.querySelectorAll('.settings-section');
    navTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var targetTab = tab.getAttribute('data-tab');
            navTabs.forEach(function (t) { return t.classList.remove('active'); });
            tab.classList.add('active');
            sections.forEach(function (section) {
                section.style.display = section.id === "".concat(targetTab, "-settings") ? 'block' : 'none';
                section.classList.toggle('active', section.id === "".concat(targetTab, "-settings"));
            });
        });
    });
}
function setupEventListeners() {
    document.getElementById('city').addEventListener('change', function (e) {
        settings.city = e.target.value;
    });
    document.getElementById('state').addEventListener('change', function (e) {
        settings.state = e.target.value;
    });
    document.getElementById('country').addEventListener('change', function (e) {
        settings.country = e.target.value;
    });
    document.getElementById('calc-method').addEventListener('change', function (e) {
        settings.calcMethod = e.target.value;
    });
    document.getElementById('asr-standard').addEventListener('click', function () {
        settings.asrMethod = 'standard';
        updateAsrButtons();
    });
    document.getElementById('asr-hanafi').addEventListener('click', function () {
        settings.asrMethod = 'hanafi';
        updateAsrButtons();
    });
    document.getElementById('adjustment').addEventListener('change', function (e) {
        settings.adjustment = e.target.value;
    });
    document.getElementById('alarm-time').addEventListener('change', function (e) {
        settings.alarmTime = e.target.value;
    });
    document.getElementById('alarm-audio').addEventListener('change', function (e) {
        settings.alarmAudio = e.target.value;
    });
    document.querySelectorAll('.theme-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var theme = this.querySelector('.theme-preview').classList[1].replace('theme-', '');
            selectTheme(theme);
        });
    });
    document.querySelectorAll('.layout-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var layout = this.querySelector('.layout-preview').classList[1].replace('layout-', '');
            selectLayout(layout);
        });
    });
}
function loadSettings() {
    return __awaiter(this, void 0, void 0, function () {
        var response, loadedSettings, error_1, savedSettings, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/save_settings.php"))];
                case 1:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("HTTP error! status: ".concat(response.status));
                    return [4 /*yield*/, response.json()];
                case 2:
                    loadedSettings = _a.sent();
                    // FIXED BUG: Map city correctly by looking at loadedSettings.city first, then loadedSettings.location, then default
                    settings = {
                        city: loadedSettings.city || loadedSettings.location || 'Mumbai',
                        state: loadedSettings.state || '',
                        country: loadedSettings.country || 'India',
                        calcMethod: loadedSettings.calcMethod || '2',
                        asrMethod: loadedSettings.asrMethod || 'hanafi',
                        adjustment: loadedSettings.adjustment || '0',
                        alarmTime: loadedSettings.alarmTime || '00:00',
                        alarmAudio: loadedSettings.alarmAudio || 'azan/adhan1.mp3',
                        reminders: loadedSettings.reminders || [],
                        theme: loadedSettings.theme || 'default',
                        layout: loadedSettings.layout || 'default'
                    };
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error loading settings:', error_1);
                    savedSettings = localStorage.getItem('prayerSettings');
                    if (savedSettings) {
                        parsed = JSON.parse(savedSettings);
                        settings = {
                            city: parsed.city || parsed.location || 'Mumbai',
                            state: parsed.state || '',
                            country: parsed.country || 'India',
                            calcMethod: parsed.calcMethod || '2',
                            asrMethod: parsed.asrMethod || 'hanafi',
                            adjustment: parsed.adjustment || '0',
                            alarmTime: parsed.alarmTime || '00:00',
                            alarmAudio: parsed.alarmAudio || 'azan/adhan1.mp3',
                            reminders: parsed.reminders || [],
                            theme: parsed.theme || 'default',
                            layout: parsed.layout || 'default'
                        };
                    }
                    return [3 /*break*/, 4];
                case 4:
                    lastSavedSettings = JSON.parse(JSON.stringify(settings));
                    updateUI();
                    return [2 /*return*/];
            }
        });
    });
}
function saveSettings() {
    return __awaiter(this, void 0, void 0, function () {
        var response, result, generalSettings, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    localStorage.setItem('prayerSettings', JSON.stringify(settings));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/save_settings.php"), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(settings)
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("HTTP error! status: ".concat(response.status));
                    return [4 /*yield*/, response.json()];
                case 3:
                    result = _a.sent();
                    showNotification(result.status === 'success' ? 'Settings saved successfully!' : 'Error saving settings');
                    lastSavedSettings = JSON.parse(JSON.stringify(settings));
                    generalSettings = {
                        city: settings.city,
                        state: settings.state,
                        country: settings.country,
                        calcMethod: settings.calcMethod,
                        asrMethod: settings.asrMethod,
                        adjustment: settings.adjustment
                    };
                    window.postMessage({ type: 'GENERAL_SETTINGS_UPDATED', settings: generalSettings }, BASE_URL);
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.error('Error saving settings:', error_2);
                    showNotification('Error saving settings to server');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function updateUI() {
    document.getElementById('city').value = settings.city;
    document.getElementById('state').value = settings.state;
    document.getElementById('country').value = settings.country;
    document.getElementById('calc-method').value = settings.calcMethod;
    document.getElementById('adjustment').value = settings.adjustment;
    document.getElementById('alarm-time').value = settings.alarmTime;
    var alarmAudioSelect = document.getElementById('alarm-audio');
    if (alarmAudioSelect) {
        alarmAudioSelect.value = settings.alarmAudio;
    }
    updateAsrButtons();
    updateThemeSelection();
    updateLayoutSelection();
    updateRemindersList();
}
function updateAsrButtons() {
    var standardBtn = document.getElementById('asr-standard');
    var hanafiBtn = document.getElementById('asr-hanafi');
    if (standardBtn && hanafiBtn) {
        standardBtn.classList.toggle('active', settings.asrMethod === 'standard');
        hanafiBtn.classList.toggle('active', settings.asrMethod === 'hanafi');
    }
}
function selectTheme(theme) {
    settings.theme = theme;
    updateThemeSelection();
    applyTheme(theme);
}
function updateThemeSelection() {
    document.querySelectorAll('.theme-card').forEach(function (card) {
        var theme = card.querySelector('.theme-preview').classList[1].replace('theme-', '');
        card.classList.toggle('active', theme === settings.theme);
    });
}
function applyTheme(theme) {
    var allThemes = ['default', 'blue', 'dark', 'light', 'emerald-gold', 'ruby', 'amber', 'purple', 'highcontrast'];
    allThemes.forEach(function (t) { document.body.classList.remove('theme-' + t); });
    if (theme !== 'default')
        document.body.classList.add("theme-".concat(theme));
    localStorage.setItem('selectedTheme', theme);
}
function selectLayout(layout) {
    settings.layout = layout;
    updateLayoutSelection();
    applyLayout(layout);
}
function updateLayoutSelection() {
    document.querySelectorAll('.layout-card').forEach(function (card) {
        var preview = card.querySelector('.layout-preview');
        if (!preview) return;
        var layoutClass = Array.from(preview.classList).find(function(c) { return c.startsWith('layout-'); });
        var layout = layoutClass ? layoutClass.replace('layout-', '') : 'default';
        card.classList.toggle('active', layout === settings.layout);
    });
}
function applyLayout(layout) {
    localStorage.setItem('selectedLayout', layout);
}
function addReminder() {
    var reminder = {
        time: '00:00',
        audio: azanFiles[0] ? "azan/".concat(azanFiles[0]) : 'azan/fajr.mp3',
        repeat: false
    };
    settings.reminders.push(reminder);
    updateRemindersList();
}
function updateRemindersList() {
    var remindersList = document.getElementById('reminders-list');
    if (!remindersList)
        return;
    remindersList.innerHTML = '';
    settings.reminders.forEach(function (reminder, index) {
        var reminderItem = document.createElement('div');
        reminderItem.className = 'reminder-item';
        // Build options list, ensuring current audio is represented even if not in scanned files
        var optionsHtml = azanFiles.map(function (file) { return "\n            <option value=\"azan/".concat(file, "\" ").concat(reminder.audio === "azan/".concat(file) ? 'selected' : '', ">\n                ").concat(file, "\n            </option>\n        "); }).join('');
        var currentFilename = reminder.audio ? reminder.audio.replace('azan/', '') : '';
        if (reminder.audio && !azanFiles.some(function (file) { return "azan/".concat(file) === reminder.audio; })) {
            optionsHtml = "\n                <option value=\"".concat(reminder.audio, "\" selected>\n                    ").concat(currentFilename, " (Saved)\n                </option>\n            ") + optionsHtml;
        }
        reminderItem.innerHTML = "\n            <input type=\"time\" value=\"".concat(reminder.time, "\" onchange=\"updateReminderTime(").concat(index, ", this.value)\">\n            <select onchange=\"updateReminderAudio(").concat(index, ", this.value)\">\n                ").concat(optionsHtml, "\n            </select>\n            <button onclick=\"removeReminder(").concat(index, ")\" class=\"btn btn-secondary\">\n                <i class=\"icon-delete\"></i> Delete\n            </button>\n        ");
        remindersList.appendChild(reminderItem);
    });
}
function updateReminderTime(index, time) {
    settings.reminders[index].time = time;
}
function updateReminderAudio(index, audio) {
    settings.reminders[index].audio = audio;
}
function removeReminder(index) {
    settings.reminders.splice(index, 1);
    updateRemindersList();
}
function showNotification(message) {
    var notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(function () {
        notification.classList.add('show');
        setTimeout(function () {
            notification.classList.remove('show');
            setTimeout(function () { return notification.remove(); }, 300);
        }, 2000);
    }, 100);
}
function fetchAzanFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var response, alarmAudioSelect_1, hasSelectedMatch_1, option, error_3, alarmAudioSelect_2, hasSelectedMatch_2, option;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch('list_mp3.php')];
                case 1:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("HTTP error! Status: ".concat(response.status));
                    return [4 /*yield*/, response.json()];
                case 2:
                    azanFiles = _a.sent();
                    alarmAudioSelect_1 = document.getElementById('alarm-audio');
                    if (alarmAudioSelect_1) {
                        alarmAudioSelect_1.innerHTML = '';
                        hasSelectedMatch_1 = false;
                        azanFiles.forEach(function (file) {
                            var option = document.createElement('option');
                            option.value = "azan/".concat(file);
                            option.textContent = file;
                            if (settings.alarmAudio === "azan/".concat(file)) {
                                option.selected = true;
                                hasSelectedMatch_1 = true;
                            }
                            alarmAudioSelect_1.appendChild(option);
                        });
                        // If we have a saved alarm sound that's not in the currently fetched list, insert it at the top
                        if (settings.alarmAudio && !hasSelectedMatch_1) {
                            option = document.createElement('option');
                            option.value = settings.alarmAudio;
                            option.textContent = settings.alarmAudio.replace('azan/', '') + ' (Saved)';
                            option.selected = true;
                            alarmAudioSelect_1.insertBefore(option, alarmAudioSelect_1.firstChild);
                        }
                        // Set select value
                        if (settings.alarmAudio) {
                            alarmAudioSelect_1.value = settings.alarmAudio;
                        }
                        else if (azanFiles.length > 0) {
                            alarmAudioSelect_1.value = "azan/".concat(azanFiles[0]);
                            settings.alarmAudio = "azan/".concat(azanFiles[0]);
                        }
                    }
                    updateRemindersList();
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    console.error('Error fetching MP3 files:', error_3);
                    azanFiles = ['adhan1.mp3', 'adhan2.mp3', 'silent.mp3'];
                    alarmAudioSelect_2 = document.getElementById('alarm-audio');
                    if (alarmAudioSelect_2) {
                        alarmAudioSelect_2.innerHTML = '';
                        hasSelectedMatch_2 = false;
                        azanFiles.forEach(function (file) {
                            var option = document.createElement('option');
                            option.value = "azan/".concat(file);
                            option.textContent = file;
                            if (settings.alarmAudio === "azan/".concat(file)) {
                                option.selected = true;
                                hasSelectedMatch_2 = true;
                            }
                            alarmAudioSelect_2.appendChild(option);
                        });
                        if (settings.alarmAudio && !hasSelectedMatch_2) {
                            option = document.createElement('option');
                            option.value = settings.alarmAudio;
                            option.textContent = settings.alarmAudio.replace('azan/', '') + ' (Saved)';
                            option.selected = true;
                            alarmAudioSelect_2.insertBefore(option, alarmAudioSelect_2.firstChild);
                        }
                        if (settings.alarmAudio) {
                            alarmAudioSelect_2.value = settings.alarmAudio;
                        }
                    }
                    updateRemindersList();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function pollSettings() {
    return __awaiter(this, void 0, void 0, function () {
        var response, newSettings, normalizedNew, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("".concat(BASE_URL, "/save_settings.php"))];
                case 1:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("HTTP error! status: ".concat(response.status));
                    return [4 /*yield*/, response.json()];
                case 2:
                    newSettings = _a.sent();
                    normalizedNew = {
                        city: newSettings.city || newSettings.location || 'Mumbai',
                        state: newSettings.state || '',
                        country: newSettings.country || 'India',
                        calcMethod: newSettings.calcMethod || '2',
                        asrMethod: newSettings.asrMethod || 'hanafi',
                        adjustment: newSettings.adjustment || '0',
                        alarmTime: newSettings.alarmTime || '00:00',
                        alarmAudio: newSettings.alarmAudio || 'azan/adhan1.mp3',
                        reminders: newSettings.reminders || [],
                        theme: newSettings.theme || 'default',
                        layout: newSettings.layout || 'default'
                    };
                    // If server settings changed since our last load/save, we update our local settings
                    if (JSON.stringify(normalizedNew) !== JSON.stringify(lastSavedSettings)) {
                        settings = JSON.parse(JSON.stringify(normalizedNew));
                        lastSavedSettings = JSON.parse(JSON.stringify(normalizedNew));
                        updateUI();
                        localStorage.setItem('prayerSettings', JSON.stringify(settings));
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    console.error('Error polling settings:', error_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function initializeAdmin() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadSettings()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fetchAzanFiles()];
                case 2:
                    _a.sent();
                    setInterval(pollSettings, 5000);
                    return [2 /*return*/];
            }
        });
    });
}
// Expose functions globally for inline HTML onclick/onchange handlers
window.addReminder = addReminder;
window.removeReminder = removeReminder;
window.updateReminderTime = updateReminderTime;
window.updateReminderAudio = updateReminderAudio;
window.saveSettings = saveSettings;
window.selectTheme = selectTheme;
window.selectLayout = selectLayout;
initializeAdmin();
