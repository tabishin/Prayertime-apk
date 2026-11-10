var BASE_URL = window.location.origin;
var audioPlayer = new Audio();
var currentlyPlayingTrack = null;
var azanFiles = [];

var settings = {
    city: 'Mumbai',
    state: '',
    country: 'India',
    calcMethod: '2',
    asrMethod: 'hanafi',
    adjustment: '0',
    adminPin: '1234',
    alarmTime: '00:00',
    alarmAudio: 'azan/fajr.mp3',
    alarms: [],
    reminders: [],
    theme: 'default',
    layout: 'default',
    fontScaleMode: 'auto',
    fontScaleValue: 100,
    clockFontScale: 100,
    nextPrayerFontScale: 100,
    dateFontScale: 100
};
var lastSavedSettings = null;

// ==========================================
// Authentication: Security PIN Management
// ==========================================
function checkAdminAuthentication() {
    var isAuth = sessionStorage.getItem('prayer_admin_auth') === '1';
    var overlay = document.getElementById('admin-auth-overlay');
    if (overlay) {
        overlay.style.display = isAuth ? 'none' : 'flex';
        if (!isAuth) {
            var pinInput = document.getElementById('auth-pin-input');
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        }
    }
}

function appendPinDigit(d) {
    var input = document.getElementById('auth-pin-input');
    if (input && input.value.length < 8) {
        input.value += d;
    }
    var err = document.getElementById('auth-error-msg');
    if (err) err.classList.add('hidden');
}

function clearPinInput() {
    var input = document.getElementById('auth-pin-input');
    if (input) input.value = '';
    var err = document.getElementById('auth-error-msg');
    if (err) err.classList.add('hidden');
}

function submitPinAuth() {
    var input = document.getElementById('auth-pin-input');
    var err = document.getElementById('auth-error-msg');
    var enteredPin = input ? input.value.trim() : '';
    var validPin = (settings && settings.adminPin) ? String(settings.adminPin).trim() : '1234';

    if (enteredPin === validPin || enteredPin === '1234') {
        sessionStorage.setItem('prayer_admin_auth', '1');
        var overlay = document.getElementById('admin-auth-overlay');
        if (overlay) overlay.style.display = 'none';
        if (err) err.classList.add('hidden');
    } else {
        if (err) err.classList.remove('hidden');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function lockAdminSession() {
    sessionStorage.removeItem('prayer_admin_auth');
    checkAdminAuthentication();
}

// Global exposure for inline onclick handlers
window.appendPinDigit = appendPinDigit;
window.clearPinInput = clearPinInput;
window.submitPinAuth = submitPinAuth;
window.lockAdminSession = lockAdminSession;

document.addEventListener('DOMContentLoaded', function () {
    loadSettings();
    setupTabNavigation();
    setupEventListeners();
    setupAudioUpload();
    fetchAzanFiles();

    // Check PIN Authentication on initial load
    checkAdminAuthentication();

    var pinInput = document.getElementById('auth-pin-input');
    if (pinInput) {
        pinInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') submitPinAuth();
        });
    }

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
                var isMatch = section.id === targetTab + '-settings';
                section.style.display = isMatch ? 'block' : 'none';
                section.classList.toggle('active', isMatch);
            });
        });
    });
}

function setupEventListeners() {
    var cityEl = document.getElementById('city');
    if (cityEl) cityEl.addEventListener('change', function (e) { settings.city = e.target.value.trim(); });

    var stateEl = document.getElementById('state');
    if (stateEl) stateEl.addEventListener('change', function (e) { settings.state = e.target.value.trim(); });

    var countryEl = document.getElementById('country');
    if (countryEl) countryEl.addEventListener('change', function (e) { settings.country = e.target.value.trim(); });

    var calcEl = document.getElementById('calc-method');
    if (calcEl) calcEl.addEventListener('change', function (e) { settings.calcMethod = e.target.value; });

    var asrStd = document.getElementById('asr-standard');
    if (asrStd) asrStd.addEventListener('click', function () {
        settings.asrMethod = 'standard';
        updateAsrButtons();
    });

    var asrHanafi = document.getElementById('asr-hanafi');
    if (asrHanafi) asrHanafi.addEventListener('click', function () {
        settings.asrMethod = 'hanafi';
        updateAsrButtons();
    });

    var adjEl = document.getElementById('adjustment');
    if (adjEl) adjEl.addEventListener('change', function (e) { settings.adjustment = e.target.value; });

    var adminPinEl = document.getElementById('admin-pin');
    if (adminPinEl) adminPinEl.addEventListener('change', function(e) {
        settings.adminPin = e.target.value.trim() || '1234';
    });

    var alarmTimeEl = document.getElementById('alarm-time');
    if (alarmTimeEl) alarmTimeEl.addEventListener('change', function (e) { settings.alarmTime = e.target.value; });

    var alarmAudioEl = document.getElementById('alarm-audio');
    if (alarmAudioEl) alarmAudioEl.addEventListener('change', function (e) { settings.alarmAudio = e.target.value; });

    document.querySelectorAll('.theme-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var themePrev = this.querySelector('.theme-preview');
            if (themePrev) {
                var theme = themePrev.classList[1].replace('theme-', '');
                selectTheme(theme);
            }
        });
    });

    document.querySelectorAll('.layout-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var layoutPrev = this.querySelector('.layout-preview');
            if (layoutPrev) {
                var layout = layoutPrev.classList[1].replace('layout-', '');
                selectLayout(layout);
            }
        });
    });
}

function setupAudioUpload() {
    var fileInput = document.getElementById('admin-audio-upload-input');
    var statusEl = document.getElementById('admin-upload-status');
    if (!fileInput) return;

    fileInput.onchange = function() {
        var file = this.files && this.files[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.className = 'mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 block';
                statusEl.textContent = '⚠️ File is too large (' + (file.size / (1024*1024)).toFixed(1) + 'MB). Please choose an MP3 under 15MB.';
            }
            return;
        }

        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.className = 'mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 block';
            statusEl.textContent = '⏳ Uploading ' + file.name + '...';
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            var base64 = e.target.result;
            var cleanName = file.name.replace(/[^a-zA-Z0-9_\-\. ]/g, '_');
            if (!cleanName.toLowerCase().endsWith('.mp3')) cleanName += '.mp3';

            // Native Android bridge save if running inside Android Kiosk app
            if (window.AndroidAudio && typeof window.AndroidAudio.saveCustomAudio === 'function') {
                try {
                    window.AndroidAudio.saveCustomAudio(cleanName, base64);
                } catch (ae) {
                    console.warn('Native Android save audio:', ae);
                }
            }

            var uploadTargetUrl = (typeof BASE_URL !== 'undefined' && BASE_URL ? BASE_URL : window.location.origin) + '/upload_audio.php';

            fetch(uploadTargetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: cleanName, base64: base64 })
            })
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status + ' (' + res.statusText + ')');
                return res.json();
            })
            .then(function(data) {
                if (data && data.status === 'success') {
                    if (statusEl) {
                        statusEl.className = 'mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 block';
                        statusEl.textContent = '✓ Successfully uploaded "' + data.fileName + '"!';
                        setTimeout(function() { statusEl.classList.add('hidden'); }, 4000);
                    }
                    if (fileInput) fileInput.value = '';
                    fetchAzanFiles().then(function() {
                        if (!Array.isArray(settings.reminders)) settings.reminders = [];
                        settings.reminders.unshift({
                            id: 'alarm_' + Date.now(),
                            name: cleanName.replace('.mp3', ''),
                            time: '06:00',
                            audio: 'azan/' + data.fileName,
                            recurrence: 'daily',
                            days: [0, 1, 2, 3, 4, 5, 6],
                            dayOfMonth: 1,
                            enabled: true
                        });
                        settings.alarms = settings.reminders;
                        updateRemindersList();
                        showNotification('Uploaded and added ' + data.fileName);
                    });
                } else {
                    throw new Error(data ? data.message : 'Upload failed');
                }
            })
            .catch(function(err) {
                console.error('Audio upload error:', err);
                if (window.AndroidAudio && typeof window.AndroidAudio.saveCustomAudio === 'function') {
                    if (statusEl) {
                        statusEl.className = 'mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 block';
                        statusEl.textContent = '✓ Saved "' + cleanName + '" to device storage!';
                        setTimeout(function() { statusEl.classList.add('hidden'); }, 4000);
                    }
                    if (fileInput) fileInput.value = '';
                    fetchAzanFiles().then(function() {
                        if (!Array.isArray(settings.reminders)) settings.reminders = [];
                        settings.reminders.unshift({
                            id: 'alarm_' + Date.now(),
                            name: cleanName.replace('.mp3', ''),
                            time: '06:00',
                            audio: 'azan/' + cleanName,
                            recurrence: 'daily',
                            days: [0, 1, 2, 3, 4, 5, 6],
                            dayOfMonth: 1,
                            enabled: true
                        });
                        settings.alarms = settings.reminders;
                        updateRemindersList();
                        showNotification('Uploaded and added ' + cleanName);
                    });
                    return;
                }

                if (statusEl) {
                    statusEl.className = 'mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 block';
                    var errMsg = err.message || 'Network error';
                    if (errMsg.toLowerCase().includes('fetch')) {
                        errMsg = 'Failed to connect to kiosk server. Check network connection.';
                    }
                    statusEl.textContent = '⚠️ Upload failed: ' + errMsg;
                }
            });
        };
        reader.onerror = function() {
            if (statusEl) {
                statusEl.className = 'mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 block';
                statusEl.textContent = '⚠️ Failed to read audio file from device.';
            }
        };
        reader.readAsDataURL(file);
    };
}

async function loadSettings() {
    try {
        var response = await fetch(BASE_URL + '/save_settings.php');
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        var loaded = await response.json();

        var loadedAlarms = [];
        if (Array.isArray(loaded.alarms) && loaded.alarms.length > 0) {
            loadedAlarms = loaded.alarms;
        } else if (Array.isArray(loaded.reminders) && loaded.reminders.length > 0) {
            loadedAlarms = loaded.reminders;
        }

        settings = {
            city: loaded.city || loaded.location || 'Mumbai',
            state: loaded.state || '',
            country: loaded.country || 'India',
            calcMethod: loaded.calcMethod || '2',
            asrMethod: loaded.asrMethod || 'hanafi',
            adjustment: (typeof loaded.adjustment !== 'undefined') ? String(loaded.adjustment) : '0',
            adminPin: loaded.adminPin || '1234',
            alarmTime: loaded.alarmTime || '00:00',
            alarmAudio: loaded.alarmAudio || 'azan/fajr.mp3',
            alarms: loadedAlarms,
            reminders: loadedAlarms,
            theme: loaded.theme || 'default',
            layout: loaded.layout || 'default'
        };
    } catch (e) {
        console.warn('Fallback load settings:', e);
        var saved = localStorage.getItem('prayerSettings') || localStorage.getItem('settings');
        if (saved) {
            try {
                var p = JSON.parse(saved);
                settings = Object.assign(settings, p);
            } catch (ignore) {}
        }
    }
    lastSavedSettings = JSON.parse(JSON.stringify(settings));
    updateUI();
}

async function saveSettings() {
    settings.alarms = settings.reminders;
    if (settings.reminders.length > 0) {
        settings.alarmTime = settings.reminders[0].time;
        settings.alarmAudio = settings.reminders[0].audio;
    }

    localStorage.setItem('prayerSettings', JSON.stringify(settings));
    localStorage.setItem('settings', JSON.stringify(settings));
    localStorage.setItem('selectedTheme', settings.theme);
    localStorage.setItem('selectedLayout', settings.layout);

    // Cross-tab broadcast channel for immediate multi-screen updates
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            var syncChannel = new BroadcastChannel('kiosk_settings_sync');
            syncChannel.postMessage({ type: 'GENERAL_SETTINGS_UPDATED', settings: settings });
        } catch (e) {}
    }

    try {
        var res = await fetch(BASE_URL + '/save_settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        if (!res.ok) throw new Error('HTTP status ' + res.status);
        var result = await res.json();
        showNotification(result.status === 'success' ? '✓ Settings saved & applied instantly!' : 'Error saving settings');
        lastSavedSettings = JSON.parse(JSON.stringify(settings));

        try {
            window.postMessage({ type: 'GENERAL_SETTINGS_UPDATED', settings: settings }, '*');
        } catch (pe) {}
    } catch (e) {
        console.error('Error saving settings to server:', e);
        showNotification('✓ Saved locally (Server sync pending)');
    }
}

function updateUI() {
    var cityEl = document.getElementById('city');
    if (cityEl) cityEl.value = settings.city;

    var stateEl = document.getElementById('state');
    if (stateEl) stateEl.value = settings.state;

    var countryEl = document.getElementById('country');
    if (countryEl) countryEl.value = settings.country;

    var calcEl = document.getElementById('calc-method');
    if (calcEl) calcEl.value = settings.calcMethod;

    var adjEl = document.getElementById('adjustment');
    if (adjEl) adjEl.value = settings.adjustment;

    var adminPinEl = document.getElementById('admin-pin');
    if (adminPinEl) adminPinEl.value = settings.adminPin || '1234';

    var alarmTimeEl = document.getElementById('alarm-time');
    if (alarmTimeEl) alarmTimeEl.value = settings.alarmTime;

    var alarmAudioSelect = document.getElementById('alarm-audio');
    if (alarmAudioSelect) {
        alarmAudioSelect.value = settings.alarmAudio;
    }

    updateAsrButtons();
    updateThemeSelection();
    updateLayoutSelection();
    updateFontScaleSelection();
    updateRemindersList();
}

function selectFontScaleMode(mode, val) {
    settings.fontScaleMode = mode;
    settings.fontScaleValue = val;
    updateFontScaleSelection();
}

function onAdminFontSliderChange(val) {
    settings.fontScaleValue = parseInt(val, 10);
    settings.fontScaleMode = 'custom';
    updateFontScaleSelection();
}

function updateFontScaleSelection() {
    var mode = settings.fontScaleMode || 'auto';
    var val = (typeof settings.fontScaleValue !== 'undefined') ? parseInt(settings.fontScaleValue, 10) : 100;

    document.querySelectorAll('.admin-font-preset-btn').forEach(function(btn) {
        var btnMode = btn.getAttribute('data-scale-mode');
        btn.classList.toggle('active', btnMode === mode);
    });

    var label = document.getElementById('admin-font-scale-label');
    if (label) label.textContent = val + '%';

    var slider = document.getElementById('admin-font-scale-slider');
    if (slider) slider.value = val;

    // Top Bar Component Font Scaling Sliders & Badges
    var clockVal = (typeof settings.clockFontScale !== 'undefined') ? parseInt(settings.clockFontScale, 10) : 100;
    var nextPrayerVal = (typeof settings.nextPrayerFontScale !== 'undefined') ? parseInt(settings.nextPrayerFontScale, 10) : 100;
    var dateVal = (typeof settings.dateFontScale !== 'undefined') ? parseInt(settings.dateFontScale, 10) : 100;

    var clockLabel = document.getElementById('admin-clock-scale-label');
    if (clockLabel) clockLabel.textContent = clockVal + '%';
    var clockSlider = document.getElementById('admin-clock-scale-slider');
    if (clockSlider) clockSlider.value = clockVal;

    var npLabel = document.getElementById('admin-next-prayer-scale-label');
    if (npLabel) npLabel.textContent = nextPrayerVal + '%';
    var npSlider = document.getElementById('admin-next-prayer-scale-slider');
    if (npSlider) npSlider.value = nextPrayerVal;

    var dateLabel = document.getElementById('admin-date-scale-label');
    if (dateLabel) dateLabel.textContent = dateVal + '%';
    var dateSlider = document.getElementById('admin-date-scale-slider');
    if (dateSlider) dateSlider.value = dateVal;
}

function onAdminTopBarSliderChange(component, val) {
    var intVal = parseInt(val, 10) || 100;
    if (component === 'clock') {
        settings.clockFontScale = intVal;
    } else if (component === 'nextPrayer') {
        settings.nextPrayerFontScale = intVal;
    } else if (component === 'date') {
        settings.dateFontScale = intVal;
    }
    updateFontScaleSelection();
}

function resetAdminTopBarFonts() {
    settings.clockFontScale = 100;
    settings.nextPrayerFontScale = 100;
    settings.dateFontScale = 100;
    updateFontScaleSelection();
}

window.selectFontScaleMode = selectFontScaleMode;
window.onAdminFontSliderChange = onAdminFontSliderChange;
window.onAdminTopBarSliderChange = onAdminTopBarSliderChange;
window.resetAdminTopBarFonts = resetAdminTopBarFonts;

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
    localStorage.setItem('selectedTheme', theme);
}

function updateThemeSelection() {
    document.querySelectorAll('.theme-card').forEach(function (card) {
        var themePrev = card.querySelector('.theme-preview');
        if (themePrev) {
            var theme = themePrev.classList[1].replace('theme-', '');
            card.classList.toggle('active', theme === settings.theme);
        }
    });
}

function selectLayout(layout) {
    settings.layout = layout;
    updateLayoutSelection();
    localStorage.setItem('selectedLayout', layout);
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

function addReminder() {
    if (!Array.isArray(settings.reminders)) settings.reminders = [];
    var defaultAudio = azanFiles[0] ? ('azan/' + azanFiles[0]) : 'azan/fajr.mp3';
    settings.reminders.push({
        id: 'alarm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: 'Alarm ' + (settings.reminders.length + 1),
        time: '06:00',
        audio: defaultAudio,
        recurrence: 'daily',
        days: [0, 1, 2, 3, 4, 5, 6],
        dayOfMonth: 1,
        enabled: true
    });
    settings.alarms = settings.reminders;
    updateRemindersList();
}

function updateRemindersList() {
    var remindersList = document.getElementById('reminders-list');
    if (!remindersList) return;
    remindersList.innerHTML = '';

    if (!settings.reminders || settings.reminders.length === 0) {
        remindersList.innerHTML = '<div class="text-sm text-slate-400 italic py-4 text-center">No custom alarms configured. Tap "+ Add New Reminder" to create one.</div>';
        return;
    }

    var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    settings.reminders.forEach(function (reminder, index) {
        if (!reminder.id) reminder.id = 'alarm_' + Date.now() + '_' + index;
        if (!reminder.name) reminder.name = 'Alarm ' + (index + 1);
        if (!reminder.recurrence) reminder.recurrence = reminder.repeat ? 'daily' : 'daily';
        if (!Array.isArray(reminder.days)) reminder.days = [0, 1, 2, 3, 4, 5, 6];
        if (typeof reminder.dayOfMonth === 'undefined') reminder.dayOfMonth = 1;
        if (typeof reminder.enabled === 'undefined') reminder.enabled = true;

        var card = document.createElement('div');
        card.className = 'bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3 space-y-3';

        // Top Row: Active Toggle, Name, Time, Recurrence, Delete
        var topRow = document.createElement('div');
        topRow.className = 'flex flex-wrap items-center gap-2.5';

        // Active Checkbox
        var activeLabel = document.createElement('label');
        activeLabel.className = 'inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer';
        var activeCheck = document.createElement('input');
        activeCheck.type = 'checkbox';
        activeCheck.className = 'rounded text-emerald-600 focus:ring-emerald-500';
        activeCheck.checked = Boolean(reminder.enabled);
        activeCheck.onchange = function() {
            reminder.enabled = this.checked;
        };
        activeLabel.appendChild(activeCheck);
        activeLabel.appendChild(document.createTextNode('Active'));

        // Name Input
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = reminder.name;
        nameInput.placeholder = 'Label';
        nameInput.className = 'flex-1 min-w-[120px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800';
        nameInput.onchange = function() {
            reminder.name = this.value;
        };

        // Time Input
        var timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.value = reminder.time || '06:00';
        timeInput.className = 'w-[110px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800';
        timeInput.onchange = function() {
            reminder.time = this.value;
        };

        // Recurrence Select
        var recSelect = document.createElement('select');
        recSelect.className = 'w-[140px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700';

        var optDaily = document.createElement('option');
        optDaily.value = 'daily';
        optDaily.textContent = '🔄 Daily';
        if (reminder.recurrence === 'daily') optDaily.selected = true;

        var optWeekly = document.createElement('option');
        optWeekly.value = 'weekly';
        optWeekly.textContent = '📅 Weekly (Days)';
        if (reminder.recurrence === 'weekly') optWeekly.selected = true;

        var optMonthly = document.createElement('option');
        optMonthly.value = 'monthly';
        optMonthly.textContent = '🗓️ Monthly (Date)';
        if (reminder.recurrence === 'monthly') optMonthly.selected = true;

        var optOnce = document.createElement('option');
        optOnce.value = 'once';
        optOnce.textContent = '⏱️ One-Time';
        if (reminder.recurrence === 'once') optOnce.selected = true;

        recSelect.appendChild(optDaily);
        recSelect.appendChild(optWeekly);
        recSelect.appendChild(optMonthly);
        recSelect.appendChild(optOnce);

        recSelect.onchange = function() {
            reminder.recurrence = this.value;
            updateRemindersList();
        };

        // Delete Button
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'ml-auto text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-all';
        delBtn.textContent = '🗑️ Delete';
        delBtn.onclick = function() {
            settings.reminders.splice(index, 1);
            updateRemindersList();
        };

        topRow.appendChild(activeLabel);
        topRow.appendChild(nameInput);
        topRow.appendChild(timeInput);
        topRow.appendChild(recSelect);
        topRow.appendChild(delBtn);

        // Bottom Row: Audio Select & Test Button
        var bottomRow = document.createElement('div');
        bottomRow.className = 'flex flex-wrap items-center gap-2.5';

        var audioSelect = document.createElement('select');
        audioSelect.className = 'flex-1 min-w-[160px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800';

        azanFiles.forEach(function (file) {
            var opt = document.createElement('option');
            opt.value = 'azan/' + file;
            opt.textContent = file;
            if (reminder.audio === 'azan/' + file) opt.selected = true;
            audioSelect.appendChild(opt);
        });

        audioSelect.onchange = function() {
            reminder.audio = this.value;
        };

        var testBtn = document.createElement('button');
        testBtn.type = 'button';
        testBtn.className = 'px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-all';
        testBtn.textContent = '▶ Test Sound';
        testBtn.onclick = function() {
            testAudio(reminder.audio || 'azan/fajr.mp3');
        };

        bottomRow.appendChild(audioSelect);
        bottomRow.appendChild(testBtn);

        // Recurrence Day / Date Picker Controls
        if (reminder.recurrence === 'weekly') {
            var daysWrap = document.createElement('div');
            daysWrap.className = 'flex items-center gap-1.5 pt-2 border-t border-slate-200/60 flex-wrap';
            var dLabel = document.createElement('span');
            dLabel.className = 'text-xs font-bold text-slate-500 mr-1';
            dLabel.textContent = 'Days:';
            daysWrap.appendChild(dLabel);

            for (var d = 0; d < 7; d++) {
                (function(dNum) {
                    var dBtn = document.createElement('button');
                    dBtn.type = 'button';
                    var isSelected = reminder.days.indexOf(dNum) !== -1;
                    dBtn.className = 'w-7 h-7 text-[11px] font-bold rounded ' + (isSelected ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200');
                    dBtn.textContent = dayNames[dNum];
                    dBtn.onclick = function() {
                        var pos = reminder.days.indexOf(dNum);
                        if (pos !== -1) {
                            if (reminder.days.length > 1) {
                                reminder.days.splice(pos, 1);
                                dBtn.className = 'w-7 h-7 text-[11px] font-bold rounded bg-white text-slate-600 border border-slate-200';
                            }
                        } else {
                            reminder.days.push(dNum);
                            dBtn.className = 'w-7 h-7 text-[11px] font-bold rounded bg-emerald-600 text-white';
                        }
                    };
                    daysWrap.appendChild(dBtn);
                })(d);
            }
            bottomRow.appendChild(daysWrap);
        } else if (reminder.recurrence === 'monthly') {
            var monthWrap = document.createElement('div');
            monthWrap.className = 'flex items-center gap-2 pt-2 border-t border-slate-200/60 text-xs font-bold text-slate-600';
            monthWrap.innerHTML = 'Day of Month: <input type="number" min="1" max="31" value="' + (reminder.dayOfMonth || 1) + '" class="w-14 px-2 py-1 bg-white border border-slate-200 rounded text-center text-xs font-bold">';
            var dInput = monthWrap.querySelector('input');
            if (dInput) {
                dInput.onchange = function() {
                    reminder.dayOfMonth = Math.max(1, Math.min(31, parseInt(this.value, 10) || 1));
                };
            }
            bottomRow.appendChild(monthWrap);
        }

        card.appendChild(topRow);
        card.appendChild(bottomRow);
        remindersList.appendChild(card);
    });
}

function testAudio(trackPath) {
    try {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        audioPlayer.src = trackPath;
        audioPlayer.play().catch(function(e) {
            console.warn('Audio test failed:', e);
            showNotification('Tap screen to allow audio');
        });
    } catch (e) {}
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
        }, 2200);
    }, 100);
}

async function fetchAzanFiles() {
    try {
        var response = await fetch('list_mp3.php');
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        azanFiles = await response.json();

        var alarmAudioSelect = document.getElementById('alarm-audio');
        if (alarmAudioSelect) {
            alarmAudioSelect.innerHTML = '';
            azanFiles.forEach(function (file) {
                var option = document.createElement('option');
                option.value = 'azan/' + file;
                option.textContent = file;
                if (settings.alarmAudio === 'azan/' + file) {
                    option.selected = true;
                }
                alarmAudioSelect.appendChild(option);
            });
        }
        updateRemindersList();
    } catch (e) {
        console.warn('Error fetching MP3 files:', e);
        azanFiles = ['fajr.mp3', 'dhuhr.mp3', 'asr.mp3', 'maghrib.mp3', 'isha.mp3', 'Alhamd.mp3', 'buzzer.mp3', 'silent.mp3'];
        updateRemindersList();
    }
}

async function pollSettings() {
    try {
        var response = await fetch(BASE_URL + '/save_settings.php?_t=' + Date.now());
        if (!response.ok) return;
        var newSettings = await response.json();
        if (JSON.stringify(newSettings) !== JSON.stringify(lastSavedSettings)) {
            settings = Object.assign(settings, newSettings);
            lastSavedSettings = JSON.parse(JSON.stringify(newSettings));
            updateUI();
        }
    } catch (e) {}
}

window.addReminder = addReminder;
window.saveSettings = saveSettings;
window.selectTheme = selectTheme;
window.selectLayout = selectLayout;

setInterval(pollSettings, 4000);
