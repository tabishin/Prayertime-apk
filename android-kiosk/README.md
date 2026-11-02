# Prayer Times Wall Clock — Android Kiosk App

This folder contains the complete native Android Kiosk project for the Prayer Times Wall Clock. It is optimized for wall-mounted Android tablets and Android TV boxes (TX3, Mi Box, Fire TV, etc.).

## Features
- **24/7 Screen On (WakeLock):** The display never dims, sleeps, or locks while running.
- **True Immersive Sticky Fullscreen:** System navigation buttons and notification status bars are hidden.
- **Auto-Boot on Power On:** When the TV box or tablet powers on, the prayer clock launches automatically (`BOOT_COMPLETED`).
- **100% Offline Capability:** All HTML, CSS, JavaScript, and Hadiths are bundled in `assets/`, so it operates without requiring internet access (prayer times are cached offline).
- **Auto Audio Playback:** Bypasses Android's "user gesture required" restriction so the Azan audio plays automatically on schedule.

---

## 3 Easy Ways to Get Your APK

### Method 1: Instant 1-Click APK via PWABuilder (No Tools Required)
1. Visit **[PWABuilder.com](https://www.pwabuilder.com/)**.
2. Enter your deployed app URL:
   `https://ais-pre-uol6emoz6x4khobfqv23hi-975131113273.asia-east1.run.app`
3. Click **Start** -> PWABuilder checks the `manifest.json` and `sw.js` configured in this project.
4. Click **Package for Android** -> Download your ready-to-install `.apk`.
5. Copy to a USB drive or download onto your Android TV / Tablet and install!

---

### Method 2: Automatic Free APK Build on GitHub Actions
1. Push this repository to GitHub.
2. Go to the **Actions** tab on your GitHub repository.
3. The **"Build Android APK"** workflow will run automatically.
4. Once completed (approx. 2 minutes), download the **`PrayerClock-Debug-APK`** artifact directly from the GitHub page.

---

### Method 3: Build Locally in Android Studio
1. Open **Android Studio**.
2. Click **Open** and select the `/android-kiosk` folder.
3. Ensure you sync web assets by running:
   ```bash
   ./package-assets.sh
   ```
4. Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Your `.apk` will be in:
   `android-kiosk/app/build/outputs/apk/debug/app-debug.apk`
