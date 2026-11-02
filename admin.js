const BASE_URL = window.location.origin;

let audioPlayer = new Audio();
let currentlyPlayingReminder = null;
let audioEnabled = false;
let azanFiles = [];

let settings = {
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

let lastSavedSettings = null;

document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupTabNavigation();
    setupEventListeners();
    fetchAzanFiles();

    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    selectTheme(savedTheme);

    const savedLayout = localStorage.getItem('selectedLayout') || 'default';
    selectLayout(savedLayout);
});

function setupTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('.settings-section');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            sections.forEach(section => {
                section.style.display = section.id === `${targetTab}-settings` ? 'block' : 'none';
                section.classList.toggle('active', section.id === `${targetTab}-settings`);
            });
        });
    });
}

function setupEventListeners() {
    document.getElementById('city').addEventListener('change', function(e) {
        settings.city = e.target.value;
    });

    document.getElementById('state').addEventListener('change', function(e) {
        settings.state = e.target.value;
    });

    document.getElementById('country').addEventListener('change', function(e) {
        settings.country = e.target.value;
    });

    document.getElementById('calc-method').addEventListener('change', function(e) {
        settings.calcMethod = e.target.value;
    });

    document.getElementById('asr-standard').addEventListener('click', function() {
        settings.asrMethod = 'standard';
        updateAsrButtons();
    });

    document.getElementById('asr-hanafi').addEventListener('click', function() {
        settings.asrMethod = 'hanafi';
        updateAsrButtons();
    });

    document.getElementById('adjustment').addEventListener('change', function(e) {
        settings.adjustment = e.target.value;
    });

    document.getElementById('alarm-time').addEventListener('change', function(e) {
        settings.alarmTime = e.target.value;
    });

    document.getElementById('alarm-audio').addEventListener('change', function(e) {
        settings.alarmAudio = e.target.value;
    });

    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', function() {
            const theme = this.querySelector('.theme-preview').classList[1].replace('theme-', '');
            selectTheme(theme);
        });
    });

    document.querySelectorAll('.layout-card').forEach(card => {
        card.addEventListener('click', function() {
            const layout = this.querySelector('.layout-preview').classList[1].replace('layout-', '');
            selectLayout(layout);
        });
    });
}

async function loadSettings() {
    try {
        const response = await fetch(`${BASE_URL}/save_settings.php`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const loadedSettings = await response.json();
        
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
    } catch (error) {
        console.error('Error loading settings:', error);
        const savedSettings = localStorage.getItem('prayerSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
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
    }
    lastSavedSettings = JSON.parse(JSON.stringify(settings));
    updateUI();
}

async function saveSettings() {
    localStorage.setItem('prayerSettings', JSON.stringify(settings));
    try {
        const response = await fetch(`${BASE_URL}/save_settings.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        showNotification(result.status === 'success' ? 'Settings saved successfully!' : 'Error saving settings');
        
        lastSavedSettings = JSON.parse(JSON.stringify(settings));
        
        // Notify index.html of General Settings update
        const generalSettings = {
            city: settings.city,
            state: settings.state,
            country: settings.country,
            calcMethod: settings.calcMethod,
            asrMethod: settings.asrMethod,
            adjustment: settings.adjustment
        };
        window.postMessage({ type: 'GENERAL_SETTINGS_UPDATED', settings: generalSettings }, BASE_URL);
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings to server');
    }
}

function updateUI() {
    document.getElementById('city').value = settings.city;
    document.getElementById('state').value = settings.state;
    document.getElementById('country').value = settings.country;
    document.getElementById('calc-method').value = settings.calcMethod;
    document.getElementById('adjustment').value = settings.adjustment;
    document.getElementById('alarm-time').value = settings.alarmTime;
    
    const alarmAudioSelect = document.getElementById('alarm-audio');
    if (alarmAudioSelect) {
        alarmAudioSelect.value = settings.alarmAudio;
    }
    
    updateAsrButtons();
    updateThemeSelection();
    updateLayoutSelection();
    updateRemindersList();
}

function updateAsrButtons() {
    const standardBtn = document.getElementById('asr-standard');
    const hanafiBtn = document.getElementById('asr-hanafi');
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
    document.querySelectorAll('.theme-card').forEach(card => {
        const theme = card.querySelector('.theme-preview').classList[1].replace('theme-', '');
        card.classList.toggle('active', theme === settings.theme);
    });
}

function applyTheme(theme) {
    document.body.classList.remove('theme-blue', 'theme-dark', 'theme-light');
    if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('selectedTheme', theme);
}

function selectLayout(layout) {
    settings.layout = layout;
    updateLayoutSelection();
    applyLayout(layout);
}

function updateLayoutSelection() {
    document.querySelectorAll('.layout-card').forEach(card => {
        const layout = card.querySelector('.layout-preview').classList[1].replace('layout-', '');
        card.classList.toggle('active', layout === settings.layout);
    });
}

function applyLayout(layout) {
    localStorage.setItem('selectedLayout', layout);
}

function addReminder() {
    const reminder = {
        time: '00:00',
        audio: azanFiles[0] ? `azan/${azanFiles[0]}` : 'azan/adhan1.mp3',
        repeat: false
    };
    settings.reminders.push(reminder);
    updateRemindersList();
}

function updateRemindersList() {
    const remindersList = document.getElementById('reminders-list');
    if (!remindersList) return;
    remindersList.innerHTML = '';
    settings.reminders.forEach((reminder, index) => {
        const reminderItem = document.createElement('div');
        reminderItem.className = 'reminder-item';
        
        // Build options list, ensuring current audio is represented even if not in scanned files
        let optionsHtml = azanFiles.map(file => `
            <option value="azan/${file}" ${reminder.audio === `azan/${file}` ? 'selected' : ''}>
                ${file}
            </option>
        `).join('');

        const currentFilename = reminder.audio ? reminder.audio.replace('azan/', '') : '';
        if (reminder.audio && !azanFiles.some(file => `azan/${file}` === reminder.audio)) {
            optionsHtml = `
                <option value="${reminder.audio}" selected>
                    ${currentFilename} (Saved)
                </option>
            ` + optionsHtml;
        }

        reminderItem.innerHTML = `
            <input type="time" value="${reminder.time}" onchange="updateReminderTime(${index}, this.value)">
            <select onchange="updateReminderAudio(${index}, this.value)">
                ${optionsHtml}
            </select>
            <button onclick="removeReminder(${index})" class="btn btn-secondary">
                <i class="icon-delete"></i> Delete
            </button>
        `;
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
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }, 100);
}

async function fetchAzanFiles() {
    try {
        const response = await fetch('list_mp3.php');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        azanFiles = await response.json();
        
        const alarmAudioSelect = document.getElementById('alarm-audio');
        if (alarmAudioSelect) {
            alarmAudioSelect.innerHTML = '';
            
            // Build the option elements
            let hasSelectedMatch = false;
            azanFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = `azan/${file}`;
                option.textContent = file;
                if (settings.alarmAudio === `azan/${file}`) {
                    option.selected = true;
                    hasSelectedMatch = true;
                }
                alarmAudioSelect.appendChild(option);
            });

            // If we have a saved alarm sound that's not in the currently fetched list, insert it at the top
            if (settings.alarmAudio && !hasSelectedMatch) {
                const option = document.createElement('option');
                option.value = settings.alarmAudio;
                option.textContent = settings.alarmAudio.replace('azan/', '') + ' (Saved)';
                option.selected = true;
                alarmAudioSelect.insertBefore(option, alarmAudioSelect.firstChild);
            }

            // Set select value
            if (settings.alarmAudio) {
                alarmAudioSelect.value = settings.alarmAudio;
            } else if (azanFiles.length > 0) {
                alarmAudioSelect.value = `azan/${azanFiles[0]}`;
                settings.alarmAudio = `azan/${azanFiles[0]}`;
            }
        }
        updateRemindersList();
    } catch (error) {
        console.error('Error fetching MP3 files:', error);
        azanFiles = ['adhan1.mp3', 'adhan2.mp3', 'silent.mp3'];
        const alarmAudioSelect = document.getElementById('alarm-audio');
        if (alarmAudioSelect) {
            alarmAudioSelect.innerHTML = '';
            
            let hasSelectedMatch = false;
            azanFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = `azan/${file}`;
                option.textContent = file;
                if (settings.alarmAudio === `azan/${file}`) {
                    option.selected = true;
                    hasSelectedMatch = true;
                }
                alarmAudioSelect.appendChild(option);
            });

            if (settings.alarmAudio && !hasSelectedMatch) {
                const option = document.createElement('option');
                option.value = settings.alarmAudio;
                option.textContent = settings.alarmAudio.replace('azan/', '') + ' (Saved)';
                option.selected = true;
                alarmAudioSelect.insertBefore(option, alarmAudioSelect.firstChild);
            }

            if (settings.alarmAudio) {
                alarmAudioSelect.value = settings.alarmAudio;
            }
        }
        updateRemindersList();
    }
}

async function pollSettings() {
    try {
        const response = await fetch(`${BASE_URL}/save_settings.php`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const newSettings = await response.json();
        
        // Ensure city is correctly mapped from either 'city' or legacy 'location'
        const normalizedNew = {
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
    } catch (error) {
        console.error('Error polling settings:', error);
    }
}

async function initializeAdmin() {
    await loadSettings();
    await fetchAzanFiles();
    setInterval(pollSettings, 5000);
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
