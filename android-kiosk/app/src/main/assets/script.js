// Declaring global audio & user interaction flags
let userInteracted = false;
let audioEnabled = false;

const isKiosk = new URLSearchParams(window.location.search).has("kiosk");
if (isKiosk) {
    userInteracted = true;
    audioEnabled = true;
}
const audioPlayer = new Audio();
audioPlayer.preload = "auto";
audioPlayer.volume = 1.0;
let playedAzans = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
let playedAlarm = false;
let playedReminders = {};
let lastHadithUpdate = null;
let lastMakruhState = false;
let lastHour = -1;
let playedMakruhBuzzer = false;
let settings = null;
let currentTimings = null;
let currentlyPlayingReminder = null;
let prayerTimes30Days = {};
let currentHadithData = null; // Caching current hadith
let currentHolidays = [];     // Caching current holidays
let holidayIndex = 0;
let lastCheckedPrayer = "";

const azaanFiles = {
    Fajr: 'azan/fajr.mp3',
    Dhuhr: 'azan/dhuhr.mp3',
    Asr: 'azan/asr.mp3',
    Maghrib: 'azan/maghrib.mp3',
    Isha: 'azan/isha.mp3',
    MakruhBuzzer: 'azan/buzzer.mp3',
    HourlyBuzzer: 'azan/Alhamd.mp3',
    Silent: 'azan/silent.mp3'
};

async function autoEnableAudio() {
    try {
        audioPlayer.src = azaanFiles.Silent;
        audioPlayer.muted = true;

        await audioPlayer.play();

        audioPlayer.muted = false;
        audioEnabled = true;
        userInteracted = true;

        console.log("Audio auto-enabled (kiosk mode)");

    } catch (err) {
        console.warn("Autoplay blocked, retrying...", err);

        // retry after 3 seconds
        setTimeout(autoEnableAudio, 3000);
    }
}


// Show interaction popup if no interaction
function showInteractionPopup() {
    if (!userInteracted && !isKiosk) {
        const popup = document.getElementById('interaction-popup');
        if (popup) {
            popup.style.display = 'block';
        }
    }
}


// Unlock audio on first user interaction
document.addEventListener('click', () => {
    if (!userInteracted) {
        userInteracted = true;
        audioEnabled = true;
        const popup = document.getElementById('interaction-popup');
        if (popup) {
            popup.style.display = 'none';
        }
        console.log("Audio enabled after user interaction.");
        audioPlayer.src = azaanFiles.Silent;
        audioPlayer.play().then(() => {
            console.log("Silent audio played successfully, unlocking autoplay.");
        }).catch(error => console.warn("Silent audio play failed:", error));
    }
});

function isOnline() { return navigator.onLine; }

function toggleOfflineIndicator(isOffline) {
    let offlineIndicator = document.getElementById('offline-indicator');
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

const BASE_URL = window.location.origin;

async function loadSettings() {
    const defaultSettings = {
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
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`${BASE_URL}/save_settings.php`, {
            signal: controller.signal,
            cache: 'no-cache'
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const loadedSettings = await response.json();
        const loaded = {
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
        console.log("Loaded settings from server:", loaded);
        localStorage.setItem('settings', JSON.stringify(loaded));
        return loaded;
    } catch (error) {
        console.warn("Could not fetch fresh settings from server, using local cache:", error.message || error);
        const storedSettings = JSON.parse(localStorage.getItem('settings')) || defaultSettings;
        return storedSettings;
    }
}


async function pollSettings() {
    // Only poll if browser reports online to avoid unnecessary failed requests
    if (!navigator.onLine) {
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`${BASE_URL}/save_settings.php`, {
            signal: controller.signal,
            cache: 'no-cache'
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
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
            alarmAudio: newSettings.alarmAudio || '',
            reminders: newSettings.reminders || [],
            theme: newSettings.theme || 'default',
            layout: newSettings.layout || 'default'
        };

        if (JSON.stringify(normalizedNew) !== JSON.stringify(settings)) {
            settings = normalizedNew;
            console.log("Settings updated from server via polling:", settings);
            localStorage.setItem('settings', JSON.stringify(settings));
            document.body.classList.remove('theme-blue', 'theme-dark', 'theme-light');
            if (settings.theme && settings.theme !== 'default') {
                document.body.classList.add(`theme-${settings.theme}`);
            }
            const prayerGrid = document.querySelector('.prayer-grid');
            if (prayerGrid) {
                prayerGrid.classList.remove('layout-default', 'layout-compact', 'layout-modern');
                if (settings.layout) prayerGrid.classList.add(`layout-${settings.layout}`);
            }
            playedAzans = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
            playedAlarm = false;
            playedReminders = {};
            playedMakruhBuzzer = false;
            lastHour = -1;
            prayerTimes30Days = {}; // Clear cache
            currentTimings = await fetchDayPrayerTimes(getTodayDate()); // Force refetch today’s timings
            if (currentTimings) {
                console.log("New timings applied:", currentTimings);
                updateTimeAndNextPrayer(currentTimings);
            } else {
                console.error("Failed to fetch new prayer times");
            }
            fetchPrayerTimes30Days(); // Refetch 30-day data in background
        }
    } catch (error) {
        // Log softly as a warning without throwing or tripping error banners during network hiccups
        console.warn("Settings poll skipped or temporary network fluctuation:", error.message || error);
    }
}

// Add listener for General Settings updates
window.addEventListener('message', async (event) => {
    if (event.origin === BASE_URL && event.data.type === 'GENERAL_SETTINGS_UPDATED') {
        const updatedGeneralSettings = event.data.settings;
        const generalKeys = ['city', 'state', 'country', 'calcMethod', 'asrMethod', 'adjustment'];
        const hasGeneralChanges = generalKeys.some(key => settings[key] !== updatedGeneralSettings[key]);

        if (hasGeneralChanges) {
            // Update only General Settings
            settings.city = updatedGeneralSettings.city;
            settings.state = updatedGeneralSettings.state;
            settings.country = updatedGeneralSettings.country;
            settings.calcMethod = updatedGeneralSettings.calcMethod;
            settings.asrMethod = updatedGeneralSettings.asrMethod;
            settings.adjustment = updatedGeneralSettings.adjustment;

            console.log("General settings updated from admin:", settings);
            localStorage.setItem('settings', JSON.stringify(settings));
            prayerTimes30Days = {}; // Clear cache to force refetch
            currentTimings = await fetchPrayerTimes();
            if (currentTimings) updateTimeAndNextPrayer(currentTimings);
        }
    }
});


function getTodayDate(offset = 0) {
    const today = new Date();
    today.setDate(today.getDate() + offset);
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
}

function timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return -1;
    // Strip timezone offset if Aladhan API returns it (e.g. "17:16 (IST)")
    const cleanTimeStr = timeStr.split(' ')[0];
    const [hours, minutes] = cleanTimeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return -1;
    return hours * 3600 + minutes * 60;
}

function secondsToHHMM(seconds) {
    if (seconds < 0) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function calculateQazaTime(ishaTime) {
    const ishaSeconds = timeToSeconds(ishaTime);
    if (ishaSeconds === -1) return 'N/A';
    const midnightSeconds = 24 * 3600; // Midnight (24:00)
    const qazaSeconds = (ishaSeconds + midnightSeconds) / 2; // Midpoint between Isha and midnight
    return secondsToHHMM(Math.floor(qazaSeconds));
}

async function fetchPrayerTimes30Days() {
    if (!settings) return;
    const { city, state, country, calcMethod, asrMethod, adjustment } = settings;
    const shafaq = 'general';
    const tune = '5,3,5,7,9,-1,0,8,-6';
    const timezonestring = 'Asia/Kolkata';

    if (!isOnline()) {
        console.warn("Offline: Using cached 30-day prayer times.");
        return;
    }

    try {
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 30);

        // Fetch calendar by month (1 or at most 2 requests for 30+ days)
        const months = [{ year: today.getFullYear(), month: today.getMonth() + 1 }];
        if (endDate.getMonth() !== today.getMonth() || endDate.getFullYear() !== today.getFullYear()) {
            months.push({ year: endDate.getFullYear(), month: endDate.getMonth() + 1 });
        }

        const commonParams = `city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&state=${encodeURIComponent(state || '')}&method=${calcMethod}&school=${asrMethod === 'hanafi' ? 1 : 0}&shafaq=${shafaq}&tune=${tune}&timezonestring=${timezonestring}&adjustment=${adjustment}&calendarMethod=MATHEMATICAL`;

        let updatedAny = false;

        for (const m of months) {
            try {
                const endpoint = `calendarByCity/${m.year}/${m.month}`;
                let data = null;

                // 1. Try proxy
                try {
                    const res = await fetch(`${BASE_URL}/prayer_times_proxy.php?endpoint=${endpoint}&${commonParams}`, { mode: 'cors' });
                    if (res.ok) {
                        const json = await res.json();
                        if (json && json.data && Array.isArray(json.data)) {
                            data = json;
                        }
                    }
                } catch (proxyErr) {
                    console.warn(`Proxy failed for calendar ${m.year}/${m.month}, trying direct API:`, proxyErr);
                }

                // 2. Direct fallback
                if (!data) {
                    try {
                        const directUrl = `https://api.aladhan.com/v1/calendarByCity/${m.year}/${m.month}?${commonParams}`;
                        const res = await fetch(directUrl, { mode: 'cors' });
                        if (res.ok) {
                            const json = await res.json();
                            if (json && json.data && Array.isArray(json.data)) {
                                data = json;
                            }
                        }
                    } catch (directErr) {
                        console.warn(`Direct calendar fetch failed for ${m.year}/${m.month}:`, directErr);
                    }
                }

                if (data && data.data && Array.isArray(data.data)) {
                    data.data.forEach(item => {
                        if (!item || !item.date || !item.timings) return;
                        const g = item.date.gregorian;
                        if (!g) return;
                        const dayStr = String(g.day).padStart(2, '0');
                        const monthStr = String(g.month.number).padStart(2, '0');
                        const key = `${g.year}-${monthStr}-${dayStr}`;

                        prayerTimes30Days[key] = {
                            timings: item.timings,
                            readableDate: item.date.readable,
                            hijriDate: item.date.hijri ? `${item.date.hijri.day} ${item.date.hijri.month.en} ${item.date.hijri.year}` : '',
                            holidays: (item.date.hijri && item.date.hijri.holidays) || []
                        };
                        updatedAny = true;
                    });
                }
            } catch (monthErr) {
                console.warn(`Error retrieving month ${m.year}/${m.month}:`, monthErr);
            }
        }

        if (updatedAny) {
            localStorage.setItem('prayerTimes30Days', JSON.stringify(prayerTimes30Days));
            console.log("Successfully cached 30-day prayer times from calendar.");
            toggleOfflineIndicator(false);
        }
    } catch (err) {
        console.warn("Could not complete 30-day prayer times background sync:", err);
    }
}

async function fetchPrayerTimes() {
    if (!settings) return null;
    const todayDate = getTodayDate();
    prayerTimes30Days = JSON.parse(localStorage.getItem('prayerTimes30Days')) || {};

    // 1. If offline, use cached if available
    if (!isOnline() && prayerTimes30Days[todayDate]) {
        console.warn("Offline: Using cached prayer times.");
        toggleOfflineIndicator(true);
        const cached = prayerTimes30Days[todayDate];
        updatePrayerUI(cached.timings, cached.readableDate, cached.hijriDate);
        return cached.timings;
    }

    // 2. Try to fetch fresh today's prayer times
    try {
        const timings = await fetchDayPrayerTimes(todayDate);
        if (timings) {
            return timings;
        }
    } catch (err) {
        console.error("Error fetching fresh timings:", err);
    }

    // 3. Fallback to cached today's timings if fresh fetch failed
    if (prayerTimes30Days[todayDate]) {
        console.warn("Fetch failed: falling back to cached prayer times.");
        const cached = prayerTimes30Days[todayDate];
        updatePrayerUI(cached.timings, cached.readableDate, cached.hijriDate);
        return cached.timings;
    }

    return null;
}

async function fetchDayPrayerTimes(date) {
    if (!settings) return null;
    const { city, state, country, calcMethod, asrMethod, adjustment } = settings;
    const shafaq = 'general';
    const tune = '5,3,5,7,9,-1,0,8,-6';
    const timezonestring = 'Asia/Kolkata';

    try {
        const parts = date ? date.split('-') : [];
        const dd_mm_yyyy = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
        const endpoint = dd_mm_yyyy ? `timingsByCity/${dd_mm_yyyy}` : 'timingsByCity';

        const urlParams = `city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&state=${encodeURIComponent(state || '')}&method=${calcMethod}&school=${asrMethod === 'hanafi' ? 1 : 0}&adjustment=${adjustment}&shafaq=${shafaq}&tune=${tune}&timezonestring=${timezonestring}&calendarMethod=MATHEMATICAL`;
        console.log("Fetching prayer times for date:", date, "endpoint:", endpoint);

        let data = null;
        try {
            console.log("Fetching via proxy...");
            const response = await fetch(`${BASE_URL}/prayer_times_proxy.php?endpoint=${endpoint}&${urlParams}`, { mode: 'cors' });
            if (!response.ok) throw new Error(`Proxy status: ${response.status}`);
            const json = await response.json();
            if (json && json.status === 'error') throw new Error(json.message || 'Proxy error');
            if (json && json.data) data = json;
        } catch (proxyError) {
            console.warn("Proxy failed, trying direct Aladhan API:", proxyError);
            const directUrl = dd_mm_yyyy
                ? `https://api.aladhan.com/v1/timingsByCity/${dd_mm_yyyy}?${urlParams}`
                : `https://api.aladhan.com/v1/timingsByCity?${urlParams}`;
            const response = await fetch(directUrl, { mode: 'cors' });
            if (!response.ok) throw new Error(`Direct fetch status: ${response.status}`);
            data = await response.json();
        }

        if (!data || !data.data || !data.data.timings) {
            throw new Error("Invalid prayer times payload received");
        }

        const timings = data.data.timings;
        const readableDate = data.data.date.readable;
        const hijriDate = `${data.data.date.hijri.day} ${data.data.date.hijri.month.en} ${data.data.date.hijri.year}`;
        prayerTimes30Days[date] = { timings, readableDate, hijriDate, holidays: data.data.date.hijri.holidays || [] };
        localStorage.setItem('prayerTimes30Days', JSON.stringify(prayerTimes30Days));
        toggleOfflineIndicator(false);
        console.log("Fetched timings:", timings);
        updatePrayerUI(timings, readableDate, hijriDate);
        return timings;
    } catch (error) {
        console.error("Error fetching prayer times:", error);
        if (!isOnline()) {
            toggleOfflineIndicator(true);
        }
        return null;
    }
}

function formatTo12Hour(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 'N/A';
    const cleanTime = timeStr.split(' ')[0]; // strip timezone labels e.g. "17:16 (IST)" -> "17:16"
    const parts = cleanTime.split(':');
    if (parts.length < 2) return cleanTime;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return cleanTime;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // convert hour '0' to '12'
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

function updatePrayerUI(timings, readableDate, hijriDate) {
    const fields = [
        { id: 'fajr-begins', value: timings?.Fajr },
        { id: 'fajr-jamaat', value: timings?.Fajr },
        { id: 'fajr-additional', value: timings?.Imsak },
        { id: 'dhuhr-begins', value: timings?.Dhuhr },
        { id: 'dhuhr-jamaat', value: timings?.Dhuhr },
        { id: 'dhuhr-additional', value: timings?.Sunrise },
        { id: 'asr-begins', value: timings?.Asr },
        { id: 'asr-jamaat', value: timings?.Asr },
        { id: 'asr-additional', value: timings?.Sunset },
        { id: 'maghrib-begins', value: timings?.Maghrib },
        { id: 'maghrib-jamaat', value: timings?.Maghrib },
        { id: 'maghrib-additional', value: timings?.Sunset },
        { id: 'isha-begins', value: timings?.Isha },
        { id: 'isha-jamaat', value: timings?.Isha },
        { id: 'isha-qaza', value: timings?.Isha ? calculateQazaTime(timings.Isha) : 'N/A' },
        { id: 'gregorian-date', value: readableDate },
        { id: 'islamic-date', value: hijriDate },
        { id: 'current-city', value: settings.city },
    ];
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            let cleanValue = field.value ? String(field.value) : '';
            
            // Format times as 12-hour strings if applicable
            const isTimeField = field.id.endsWith('-begins') || 
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
    console.log("UI updated with:", { timings, readableDate, hijriDate });
}

async function fetchHadith(day, prayer) {
    const cachedHadiths = JSON.parse(localStorage.getItem('cachedHadiths')) || {};
    const hadithCacheKey = `hadith-${day}-${prayer}`;
    const cachedHadith = cachedHadiths[hadithCacheKey];

    if (cachedHadith) {
        return cachedHadith;
    }

    if (!isOnline()) {
        toggleOfflineIndicator(true);
        return { Day: String(day), Prayer: prayer, English: 'Offline: No cached Hadith', Source: 'N/A' };
    }

    try {
        // FIXED TYPO: Changed load_hadiths.php to load_hadith.php
        const response = await fetch(`${BASE_URL}/load_hadith.php?prayer=${prayer}&day=${day}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const hadith = await response.json();
        cachedHadiths[hadithCacheKey] = hadith;
        localStorage.setItem('cachedHadiths', JSON.stringify(cachedHadiths));
        toggleOfflineIndicator(false);
        return hadith;
    } catch (error) {
        console.error(`Error fetching Hadith: ${error.message}`);
        try {
            const fallbackResponse = await fetch('hadiths.json');
            if (!fallbackResponse.ok) throw new Error(`HTTP error! Status: ${fallbackResponse.status}`);
            const hadiths = await fallbackResponse.json();
            const hadith = hadiths.find(h => h.Day === String(day) && h.Prayer === prayer);
            if (hadith) {
                cachedHadiths[hadithCacheKey] = hadith;
                localStorage.setItem('cachedHadiths', JSON.stringify(cachedHadiths));
                return hadith;
            }
            throw new Error('No Hadith found');
        } catch (fallbackError) {
            console.error("Error fetching fallback Hadith:", fallbackError);
            return { Day: String(day), Prayer: prayer, English: 'Unable to load Hadith', Source: 'N/A' };
        }
    }
}

// FIXED: This function is called every second. We fetch and compile hadiths and holidays
// ONLY if the prayer or date has changed, instead of spawning infinitely many intervals!
async function displayHadithAndHolidays(timings) {
    if (!timings) return;

    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    const jsonDay = ((dayOfYear - 1) % 360) + 1;

    const prayerTimes = [
        { name: 'Fajr', time: timings.Fajr },
        { name: 'Dhuhr', time: timings.Dhuhr },
        { name: 'Asr', time: timings.Asr },
        { name: 'Maghrib', time: timings.Maghrib },
        { name: 'Isha', time: timings.Isha },
    ];

    let mostRecentPrayer = 'Isha';
    let mostRecentPrayerSeconds = 0;

    for (const prayer of prayerTimes) {
        const prayerSeconds = timeToSeconds(prayer.time);
        if (prayerSeconds !== -1 && currentSeconds >= prayerSeconds && prayerSeconds > mostRecentPrayerSeconds) {
            mostRecentPrayer = prayer.name;
            mostRecentPrayerSeconds = prayerSeconds;
        }
    }

    // Only update cache and compile holidays if prayer changed or first time
    const cacheKey = `${jsonDay}-${mostRecentPrayer}`;
    if (cacheKey !== lastHadithUpdate) {
        lastHadithUpdate = cacheKey;
        currentHadithData = await fetchHadith(jsonDay, mostRecentPrayer);

        // Compile upcoming holidays
        currentHolidays = [];
        for (let i = 0; i < 30; i++) {
            const date = getTodayDate(i);
            const cachedDay = prayerTimes30Days[date];
            if (cachedDay && cachedDay.holidays && cachedDay.holidays.length > 0) {
                currentHolidays.push(...cachedDay.holidays.map(h => `${h} on ${cachedDay.readableDate}`));
            }
        }
        holidayIndex = 0;
    }

    // Now simply update the DOM elements based on the current second tick
    const title = document.getElementById('hadith-title');
    const content = document.getElementById('hadith-english');
    const source = document.getElementById('hadith-source');

    if (title && content && source && currentHadithData) {
        const hadithBox = document.getElementById('hadith-box');
        // Toggle view: 20 seconds Hadith, 10 seconds Holidays
        if (Date.now() % 30000 < 20000) {
            if (hadithBox) hadithBox.classList.remove('holiday-active');
            title.textContent = 'HADITH';
            content.textContent = currentHadithData.English || 'Not available';
            source.textContent = currentHadithData.Source ? `Source: ${currentHadithData.Source}` : 'Source: Not available';
        } else {
            if (hadithBox) hadithBox.classList.add('holiday-active');
            title.textContent = 'HOLIDAY';
            if (currentHolidays.length === 0) {
                content.textContent = 'No upcoming holidays';
            } else {
                // Change holiday display index every 10 seconds
                const currentHolidayText = currentHolidays[holidayIndex % currentHolidays.length];
                content.textContent = currentHolidayText;
                
                // Increment index once when we enter the holiday phase
                if (Math.floor((Date.now() % 30000) / 1000) === 20) {
                    holidayIndex = (holidayIndex + 1) % currentHolidays.length;
                }
            }
            source.textContent = '';
        }
    }
}

function resetPlayedFlags() {
    const now = new Date();
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
    const nextPrayerElement = document.getElementById('next-prayer');
    if (nextPrayerElement) {
        nextPrayerElement.textContent = `Reminder ${reminderIndex + 1} Ready - Click to Play`;
        nextPrayerElement.classList.add('play-prompt');
        nextPrayerElement.onclick = () => {
            audioPlayer.src = audio;
            audioPlayer.play().then(() => {
                currentlyPlayingReminder = reminderIndex;
                updateTimeAndNextPrayer(currentTimings);
            }).catch(error => console.error(`Error playing Reminder ${reminderIndex}:`, error));
        };
    }
}

async function updateTimeAndNextPrayer(timings) {
    const now = new Date();
    
    // 1. Always update live clock time first in 12-hour format (guaranteeing hour12: true)
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const timeDisplay = document.getElementById('current-time');
    if (timeDisplay) {
        timeDisplay.textContent = currentTime;
    }

    // 2. Populate English gregorian date dynamically from system if not populated yet
    const gregorianElement = document.getElementById('gregorian-date');
    if (gregorianElement && (gregorianElement.textContent === 'Loading...' || !gregorianElement.textContent || gregorianElement.textContent === 'N/A')) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        gregorianElement.textContent = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }

    // 3. Attempt to load Hijri date from 30-day cache if available and currently loading
    const islamicElement = document.getElementById('islamic-date');
    if (islamicElement && (islamicElement.textContent === 'Loading...' || !islamicElement.textContent || islamicElement.textContent === 'N/A')) {
        const todayDate = getTodayDate();
        if (prayerTimes30Days[todayDate]?.hijriDate) {
            islamicElement.textContent = prayerTimes30Days[todayDate].hijriDate;
        }
    }

    if (!timings || typeof timings !== 'object') {
        const nextPrayerElement = document.getElementById('next-prayer');
        if (nextPrayerElement) {
            nextPrayerElement.textContent = "Loading prayer times...";
        }
        return;
    }

    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // Calculate Makruh Waqt early to prevent audio playing during these times
    const imsakSeconds = timeToSeconds(timings.Imsak);
    const sunriseSeconds = timeToSeconds(timings.Sunrise);
    const dhuhrSeconds = timeToSeconds(timings.Dhuhr);
    const asrSeconds = timeToSeconds(timings.Asr);
    const sunsetSeconds = timeToSeconds(timings.Sunset);

    let isMakruh = false;
    let makruhEndSeconds = 0;

    if (sunriseSeconds !== -1 && currentSeconds >= sunriseSeconds && currentSeconds < (sunriseSeconds + 900)) {
        isMakruh = true;
        makruhEndSeconds = sunriseSeconds + 900;
    } else if (dhuhrSeconds !== -1 && currentSeconds >= (dhuhrSeconds - 600) && currentSeconds < dhuhrSeconds) {
        isMakruh = true;
        makruhEndSeconds = dhuhrSeconds;
    } else if (sunsetSeconds !== -1 && currentSeconds >= (sunsetSeconds - 1200) && currentSeconds < sunsetSeconds) {
        isMakruh = true;
        makruhEndSeconds = sunsetSeconds;
    }

    resetPlayedFlags();

    if (!userInteracted && !isKiosk) showInteractionPopup();

    if (currentHour !== lastHour && currentMinute === 0 && currentSecond <= 6) {
        console.log(`[Hourly Buzzer Check] Triggered! hour=${currentHour}, minute=${currentMinute}, second=${currentSecond}, audioEnabled=${audioEnabled}, isMakruh=${isMakruh}`);
        if (audioEnabled && !isMakruh) {
            console.log(`[Hourly Buzzer Check] Playing hourly buzzer from ${azaanFiles.HourlyBuzzer}...`);
            audioPlayer.src = azaanFiles.HourlyBuzzer;
            audioPlayer.play().then(() => {
                console.log(`[Hourly Buzzer Check] Hourly buzzer started successfully.`);
            }).catch(error => {
                console.error("[Hourly Buzzer Check] Error playing hourly buzzer:", error);
            });
        } else {
            console.warn(`[Hourly Buzzer Check] Audio not played. Reason: audioEnabled=${audioEnabled}, isMakruh=${isMakruh}`);
        }
        lastHour = currentHour;
    }

    const prayers = [
        { name: 'Fajr', time: timings.Fajr, audio: azaanFiles.Fajr },
        { name: 'Dhuhr', time: timings.Dhuhr, audio: azaanFiles.Dhuhr },
        { name: 'Asr', time: timings.Asr, audio: azaanFiles.Asr },
        { name: 'Maghrib', time: timings.Maghrib, audio: azaanFiles.Maghrib },
        { name: 'Isha', time: timings.Isha, audio: azaanFiles.Isha },
    ];

    const timeWindow = 60;
    for (const prayer of prayers) {
        const prayerSeconds = timeToSeconds(prayer.time);
        if (prayerSeconds === -1) continue;
        const diff = currentSeconds - prayerSeconds;
        if (diff >= 0 && diff <= timeWindow && !playedAzans[prayer.name]) {
            if (audioEnabled && !isMakruh) {
                audioPlayer.src = prayer.audio;
                audioPlayer.play().then(() => {
                    playedAzans[prayer.name] = true;
                }).catch(error => console.error(`Error playing Azan for ${prayer.name}:`, error));
            } else if (!userInteracted && !isMakruh) {
                console.log(`Azan for ${prayer.name} skipped due to no user interaction.`);
            }
        }
    }

    const alarmTime = settings?.alarmTime || '00:00';
    const alarmAudio = settings?.alarmAudio || '';
    const alarmSeconds = timeToSeconds(alarmTime);
    if (alarmSeconds !== -1) {
        const alarmDiff = currentSeconds - alarmSeconds;
        if (alarmDiff >= 0 && alarmDiff <= timeWindow && !playedAlarm && alarmAudio) {
            if (audioEnabled && !isMakruh) {
                audioPlayer.src = alarmAudio;
                audioPlayer.play().then(() => {
                    playedAlarm = true;
                }).catch(error => console.error("Error playing Alarm:", error));
            }
        }
    }

    const reminders = settings?.reminders || [];
    reminders.forEach((reminder, index) => {
        const time = reminder?.time;
        let audio = reminder?.audio;
        const repeat = reminder?.repeat || false;
        if (!time) return;
        if (audio && !audio.startsWith('azan/')) audio = `azan/${audio}`;
        const reminderSeconds = timeToSeconds(time);
        if (reminderSeconds === -1) return;
        const diff = currentSeconds - reminderSeconds;

        if (diff >= 0 && diff <= timeWindow && (!playedReminders[index] || repeat) && audio) {
            if (audioEnabled && !isMakruh) {
                audioPlayer.src = audio;
                audioPlayer.play().then(() => {
                    currentlyPlayingReminder = index;
                    if (!repeat) playedReminders[index] = true;
                }).catch(error => console.error(`Error playing Reminder ${index}:`, error));
            } else if (!userInteracted && !isMakruh) {
                showPlayPrompt(index, audio);
                if (!repeat) playedReminders[index] = true;
            }
        }
    });

    let currentPrayer = null;
    let mostRecentPrayerSeconds = -Infinity;
    let nextPrayer = null;
    let nextPrayerSeconds = Infinity;
    let nextPrayerDate = null;

    for (const prayer of prayers) {
        const prayerSeconds = timeToSeconds(prayer.time);
        if (prayerSeconds === -1) continue;
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

    if (!currentPrayer) currentPrayer = 'Isha';

    if (!nextPrayer) {
        nextPrayer = prayers[0];
        nextPrayerSeconds = timeToSeconds(nextPrayer.time) + 24 * 3600;
        nextPrayerDate = getTodayDate(1); // Tomorrow
    }

    if (isMakruh && !lastMakruhState && !playedMakruhBuzzer) {
        if (audioEnabled) {
            audioPlayer.src = azaanFiles.MakruhBuzzer;
            audioPlayer.play().then(() => {
                playedMakruhBuzzer = true;
            }).catch(error => console.error("Error playing Makruh buzzer:", error));
        }
    } else if (!isMakruh && lastMakruhState) {
        playedMakruhBuzzer = false;
    }
    lastMakruhState = isMakruh;

    const nextPrayerElement = document.getElementById('next-prayer');
    if (nextPrayerElement) {
        if (isMakruh) {
            const remainingSeconds = makruhEndSeconds - currentSeconds;
            const remainingTime = secondsToHHMM(remainingSeconds);
            nextPrayerElement.innerHTML = `<strong style="color: #FFFFFF; background-color: #FF0000; padding: 2px 5px; font-weight: bold;">Makruh Waqt ends at ${remainingTime}</strong>`;
            nextPrayerElement.classList.add('makruh-warning');
            nextPrayerElement.classList.remove('play-prompt');
            nextPrayerElement.onclick = null;
        } else if (currentlyPlayingReminder !== null) {
            const reminderData = settings?.reminders?.[currentlyPlayingReminder];
            const reminderAudio = reminderData ? reminderData.audio.split('/').pop().replace(/\.[^/.]+$/, '') : "Reminder";
            
            const timeElapsed = Date.now() % 25000;
            if (timeElapsed < 10000) { // 10s audio name
                nextPrayerElement.textContent = `${reminderAudio} Playing`;
            } else { // 15s next prayer
                const remainingSeconds = nextPrayerSeconds - currentSeconds;
                const remainingTime = secondsToHHMM(remainingSeconds);
                nextPrayerElement.textContent = `Next Prayer: ${nextPrayer.name} in ${remainingTime}`;
            }
            
            nextPrayerElement.classList.remove('makruh-warning', 'play-prompt');
            nextPrayerElement.onclick = () => {
                audioPlayer.pause();
                currentlyPlayingReminder = null;
                updateTimeAndNextPrayer(timings);
            };
        } else {
            nextPrayerElement.classList.remove('makruh-warning');
            if (!nextPrayerElement.classList.contains('play-prompt')) {
                nextPrayerElement.onclick = null;
                const remainingSeconds = nextPrayerSeconds - currentSeconds;
                const remainingTime = secondsToHHMM(remainingSeconds);
                nextPrayerElement.textContent = `Next Prayer: ${nextPrayer.name} in ${remainingTime}`;
            }
        }
    }

    const prayerBoxes = ['fajr-box', 'dhuhr-box', 'asr-box', 'maghrib-box', 'isha-box'];
    const highlightClasses = ['fajr-highlight', 'dhuhr-highlight', 'asr-highlight', 'maghrib-highlight', 'isha-highlight'];

    prayerBoxes.forEach(box => {
        const element = document.getElementById(box);
        if (element) {
            highlightClasses.forEach(cls => element.classList.remove(cls));
            element.classList.remove('makruh-highlight');
        }
    });

    const currentBoxId = `${currentPrayer.toLowerCase()}-box`;
    const currentBox = document.getElementById(currentBoxId);
    if (currentBox) {
        if (isMakruh) {
            currentBox.classList.add('makruh-highlight');
        } else {
            currentBox.classList.add(`${currentPrayer.toLowerCase()}-highlight`);
        }
    }

    await displayHadithAndHolidays(timings);
}

window.addEventListener('storage', async (event) => {
    if (event.key === 'settings' || event.key === null) {
        settings = await loadSettings();
        playedAzans = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
        playedAlarm = false;
        playedReminders = {};
        playedMakruhBuzzer = false;
        lastHour = -1;
        currentTimings = await fetchPrayerTimes();
        if (currentTimings) updateTimeAndNextPrayer(currentTimings);
    }
});

async function init() {
    settings = await loadSettings();
    if (!settings) return;

    // Apply theme from settings
    document.body.classList.remove('theme-blue', 'theme-dark', 'theme-light');
    if (settings.theme && settings.theme !== 'default') {
        document.body.classList.add(`theme-${settings.theme}`);
    }

    // Apply layout from settings
    const prayerGrid = document.querySelector('.prayer-grid');
    if (prayerGrid) {
        prayerGrid.classList.remove('layout-default', 'layout-compact', 'layout-modern');
        if (settings.layout) {
            prayerGrid.classList.add(`layout-${settings.layout}`);
        }
    }

    currentTimings = await fetchPrayerTimes();
    
    if (isKiosk) {
        const popup = document.getElementById('interaction-popup');
        if (popup) popup.remove();
    }

    if (isKiosk) {
        autoEnableAudio();
    } else {
        showInteractionPopup();
    }
    updateTimeAndNextPrayer(currentTimings);
    fetchPrayerTimes30Days();

    // Poll for settings changes every 5 seconds
    setInterval(pollSettings, 5000);

    // Update time every second (always run, even if prayer times aren't returned yet)
    setInterval(() => {
        updateTimeAndNextPrayer(currentTimings);
    }, 1000);

    // Automatically refresh the page every 1 hour and 5 minutes (3900000 ms) to keep the app highly stable and fetch fresh data
    setInterval(() => {
        console.log("[Auto Reload] Refreshing page for kiosk stability and fresh data fetch...");
        window.location.reload();
    }, 65 * 60 * 1000);

    // Request screen wake lock so Android screens never sleep
    requestScreenWakeLock();
}

// --- Android & Mobile Kiosk Enhancements ---
// 1. Screen Wake Lock (Prevents Android screen from dimming/sleeping)
let wakeLock = null;
async function requestScreenWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('[WakeLock] Screen Wake Lock active - display will stay on.');
        } catch (err) {
            console.warn('[WakeLock] Could not acquire screen wake lock:', err);
        }
    }
}

// Re-acquire wake lock if tab/app becomes visible again
document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestScreenWakeLock();
    }
});

// 2. Double-click or double-tap anywhere to toggle fullscreen
document.addEventListener('dblclick', () => {
    if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    }
});

// 3. Register Service Worker for PWA / offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            console.log('[PWA] Service Worker registered:', reg.scope);
        }).catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
}

window.onload = init;

