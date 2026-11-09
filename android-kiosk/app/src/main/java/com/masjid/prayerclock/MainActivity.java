package com.masjid.prayerclock;

import android.annotation.SuppressLint;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.content.res.AssetFileDescriptor;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.webkit.JavascriptInterface;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.FileInputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.NetworkInterface;
import java.net.InetAddress;
import java.net.Inet4Address;
import java.util.Collections;
import java.util.List;
import java.util.Calendar;
import org.json.JSONObject;
import org.json.JSONArray;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "PrayerClock";
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private KioskAudioBridge audioBridge;
    private LocalSettingsServer localServer;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // Lock into Wall Clock Landscape Display (supports 180 flip for charging cables)
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);

            // Keep Screen On 24/7 (Never dim or turn off)
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

            setContentView(R.layout.activity_main);
            webView = findViewById(R.id.kiosk_webview);

            // Enable Immersive Fullscreen after layout inflation
            hideSystemUI();

            configureWebView();

            // Start Local Wi-Fi Settings Server on port 8080 so phones on same Wi-Fi can configure
            try {
                localServer = new LocalSettingsServer(8080);
                localServer.start();
            } catch (Exception e) {
                Log.w(TAG, "Could not start local settings server: " + e.getMessage());
            }

            // Load via WebViewAssetLoader using secure appassets origin
            // This guarantees full compatibility on Android 10/11/12+ (like Redmi K20 Pro)
            // avoiding file:/// CORS and null origin restrictions
            webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
        } catch (Exception e) {
            Log.e(TAG, "Error initializing MainActivity", e);
        }
    }

    private void configureWebView() {
        if (webView == null) return;

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);

        // Viewport settings for smooth auto-resizing across all screen sizes
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Allow mixed content so API requests to Aladhan succeed seamlessly
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Allow Azan audio to play automatically at prayer time without requiring user tap
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Cache mode for reliable offline kiosk operation
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Native Hardware Audio Bridge (Plays directly from APK assets, zero webview restrictions)
        audioBridge = new KioskAudioBridge();
        webView.addJavascriptInterface(audioBridge, "AndroidAudio");

        // Configure WebViewAssetLoader
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (assetLoader != null) {
                    WebResourceResponse response = assetLoader.shouldInterceptRequest(request.getUrl());
                    if (response != null) {
                        return response;
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.getUrl() != null) {
                    Log.w(TAG, "WebView error loading: " + request.getUrl());
                    // If appassets failed for any reason, fallback to file URL
                    if (request.getUrl().toString().contains("index.html") && !request.getUrl().toString().startsWith("file:")) {
                        view.loadUrl("file:///android_asset/index.html");
                    }
                }
            }

            @SuppressWarnings("deprecation")
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                Log.w(TAG, "WebView error loading: " + failingUrl + " - " + description);
                if (failingUrl != null && failingUrl.contains("index.html") && !failingUrl.startsWith("file:")) {
                    view.loadUrl("file:///android_asset/index.html");
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("PrayerClockJS", consoleMessage.message() + " -- From line "
                        + consoleMessage.lineNumber() + " of "
                        + consoleMessage.sourceId());
                return true;
            }
        });
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                final WindowInsetsController insetsController = getWindow().getInsetsController();
                if (insetsController != null) {
                    insetsController.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    insetsController.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                View decorView = getWindow().getDecorView();
                if (decorView != null) {
                    decorView.setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                    );
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error hiding system UI", e);
        }
    }

    @Override
    public void onBackPressed() {
        // In Kiosk mode, do not exit on accidental back press
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (localServer != null) {
            localServer.stopServer();
        }
        if (audioBridge != null) {
            audioBridge.stopAudio();
        }
    }

    public class KioskAudioBridge {
        private MediaPlayer mediaPlayer;
        private float currentVolume = 1.0f;

        @JavascriptInterface
        public void playAudio(final String rawPath) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        stopAudioInternal();

                        String clean = rawPath != null ? rawPath.trim() : "";
                        if (clean.startsWith("http")) {
                            int idx = clean.indexOf("azan/");
                            if (idx != -1) clean = clean.substring(idx);
                        }
                        clean = clean.replace("https://appassets.androidplatform.net/assets/", "")
                                     .replace("file:///android_asset/", "")
                                     .replaceAll("^/+", "");
                        if (!clean.startsWith("azan/")) {
                            clean = "azan/" + clean;
                        }

                        mediaPlayer = new MediaPlayer();
                        mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);

                        // Check if file exists in internal storage (uploaded by user)
                        String fileNameOnly = clean.replace("azan/", "");
                        File internalFile = new File(getFilesDir(), fileNameOnly);

                        if (internalFile.exists() && internalFile.length() > 0) {
                            Log.d(TAG, "Opening internal storage file for native playback: " + internalFile.getAbsolutePath());
                            mediaPlayer.setDataSource(internalFile.getAbsolutePath());
                        } else {
                            Log.d(TAG, "Opening APK asset for native playback: " + clean);
                            AssetFileDescriptor afd = getAssets().openFd(clean);
                            mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                            afd.close();
                        }

                        mediaPlayer.setVolume(currentVolume, currentVolume);
                        mediaPlayer.prepare();
                        mediaPlayer.start();
                        Log.d(TAG, "Native MediaPlayer playing successfully: " + clean);
                    } catch (Exception e) {
                        Log.e(TAG, "Error in native playAudio for " + rawPath, e);
                    }
                }
            });
        }

        @JavascriptInterface
        public void stopAudio() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    stopAudioInternal();
                }
            });
        }

        @JavascriptInterface
        public void setVolume(final float vol) {
            currentVolume = Math.max(0.0f, Math.min(1.0f, vol));
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (mediaPlayer != null) {
                        try {
                            mediaPlayer.setVolume(currentVolume, currentVolume);
                        } catch (Exception ignored) {}
                    }
                }
            });
        }

        @JavascriptInterface
        public boolean saveCustomAudio(final String fileName, final String base64Data) {
            try {
                String safeName = fileName != null ? fileName.replaceAll("[^a-zA-Z0-9_\\-\\.]", "_") : "custom.mp3";
                if (!safeName.toLowerCase().endsWith(".mp3")) safeName += ".mp3";

                String cleanBase64 = base64Data;
                if (cleanBase64.contains(",")) cleanBase64 = cleanBase64.split(",")[1];
                byte[] decoded = Base64.decode(cleanBase64, Base64.DEFAULT);

                File target = new File(getFilesDir(), safeName);
                FileOutputStream fos = new FileOutputStream(target);
                fos.write(decoded);
                fos.flush();
                fos.close();
                Log.i(TAG, "Saved custom audio file to: " + target.getAbsolutePath() + " (" + target.length() + " bytes)");
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Failed to save custom audio in Android internal storage: " + e.getMessage(), e);
                return false;
            }
        }

        @JavascriptInterface
        public String getLatestSettingsJson() {
            File settingsFile = new File(getFilesDir(), "settings.json");
            if (!settingsFile.exists()) return "{}";
            try {
                FileInputStream fis = new FileInputStream(settingsFile);
                byte[] data = new byte[(int) settingsFile.length()];
                fis.read(data);
                fis.close();
                return new String(data, "UTF-8");
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public void scheduleNativeAlarm(final String alarmId, final int hour, final int minute, final int dayOfWeek, final String audioPath, final String label) {
            try {
                AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (am == null) return;

                int reqCode = Math.abs((alarmId != null ? alarmId.hashCode() : (hour * 100 + minute)));

                Intent intent = new Intent(MainActivity.this, AlarmReceiver.class);
                intent.putExtra("alarmId", alarmId);
                intent.putExtra("audioPath", audioPath);
                intent.putExtra("alarmName", label);

                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pi = PendingIntent.getBroadcast(MainActivity.this, reqCode, intent, flags);

                Calendar cal = Calendar.getInstance();
                cal.set(Calendar.HOUR_OF_DAY, hour);
                cal.set(Calendar.MINUTE, minute);
                cal.set(Calendar.SECOND, 0);
                cal.set(Calendar.MILLISECOND, 0);

                if (dayOfWeek > 0) {
                    cal.set(Calendar.DAY_OF_WEEK, dayOfWeek);
                }

                if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
                    if (dayOfWeek > 0) {
                        cal.add(Calendar.WEEK_OF_YEAR, 1);
                    } else {
                        cal.add(Calendar.DAY_OF_YEAR, 1);
                    }
                }

                long triggerMs = cal.getTimeInMillis();

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    Intent showIntent = new Intent(MainActivity.this, MainActivity.class);
                    PendingIntent showPi = PendingIntent.getActivity(MainActivity.this, reqCode + 1, showIntent, flags);
                    AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerMs, showPi);
                    am.setAlarmClock(clockInfo, pi);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerMs, pi);
                }

                Log.i(TAG, "Native Alarm scheduled: " + label + " at " + cal.getTime() + " (reqCode=" + reqCode + ")");
            } catch (Exception e) {
                Log.e(TAG, "Error scheduling native alarm: " + e.getMessage(), e);
            }
        }

        @JavascriptInterface
        public void cancelNativeAlarm(final String alarmId) {
            try {
                AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (am == null) return;

                int reqCode = Math.abs(alarmId != null ? alarmId.hashCode() : 0);
                Intent intent = new Intent(MainActivity.this, AlarmReceiver.class);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent pi = PendingIntent.getBroadcast(MainActivity.this, reqCode, intent, flags);
                am.cancel(pi);
                Log.i(TAG, "Native Alarm canceled for id: " + alarmId);
            } catch (Exception e) {
                Log.w(TAG, "Error canceling native alarm: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public String getLocalIpAddress() {
            return getDeviceIpAddress();
        }

        @JavascriptInterface
        public String getAdminUrl() {
            String ip = getDeviceIpAddress();
            return "http://" + ip + ":8080/admin.html";
        }

        private void stopAudioInternal() {
            if (mediaPlayer != null) {
                try {
                    if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                    mediaPlayer.reset();
                    mediaPlayer.release();
                } catch (Exception ignored) {}
                mediaPlayer = null;
            }
        }
    }

    public static String getDeviceIpAddress() {
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface intf : interfaces) {
                List<InetAddress> addrs = Collections.list(intf.getInetAddresses());
                for (InetAddress addr : addrs) {
                    if (!addr.isLoopbackAddress() && addr instanceof Inet4Address) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {}
        return "127.0.0.1";
    }

    public class LocalSettingsServer {
        private ServerSocket serverSocket;
        private boolean isRunning = false;
        private final int port;
        private Thread serverThread;

        public LocalSettingsServer(int port) {
            this.port = port;
        }

        public void start() {
            serverThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        serverSocket = new ServerSocket(port);
                        isRunning = true;
                        Log.i(TAG, "Local Wi-Fi Admin Server running on port " + port);
                        while (isRunning) {
                            try {
                                Socket client = serverSocket.accept();
                                handleClient(client);
                            } catch (Exception e) {
                                if (!isRunning) break;
                            }
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Could not start local HTTP server on port " + port + ": " + e.getMessage());
                    }
                }
            });
            serverThread.start();
        }

        public void stopServer() {
            isRunning = false;
            try {
                if (serverSocket != null) serverSocket.close();
            } catch (Exception ignored) {}
        }

        private void handleClient(final Socket client) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        InputStream in = client.getInputStream();
                        OutputStream out = client.getOutputStream();
                        BufferedReader reader = new BufferedReader(new InputStreamReader(in));

                        String line = reader.readLine();
                        if (line == null) {
                            client.close();
                            return;
                        }

                        String[] parts = line.split(" ");
                        if (parts.length < 2) {
                            client.close();
                            return;
                        }

                        String method = parts[0];
                        String path = parts[1];
                        if (path.contains("?")) path = path.split("\\?")[0];

                        int contentLength = 0;
                        while ((line = reader.readLine()) != null && !line.isEmpty()) {
                            if (line.toLowerCase().startsWith("content-length:")) {
                                contentLength = Integer.parseInt(line.substring(15).trim());
                            }
                        }

                        if ("OPTIONS".equalsIgnoreCase(method)) {
                            sendResponse(out, 200, "text/plain", "OK");
                            client.close();
                            return;
                        }

                        if ("/save_settings.php".equals(path)) {
                            if ("POST".equalsIgnoreCase(method) && contentLength > 0) {
                                char[] bodyChars = new char[contentLength];
                                int read = 0;
                                while (read < contentLength) {
                                    int r = reader.read(bodyChars, read, contentLength - read);
                                    if (r == -1) break;
                                    read += r;
                                }
                                final String bodyStr = new String(bodyChars);
                                File settingsFile = new File(getFilesDir(), "settings.json");
                                FileOutputStream fos = new FileOutputStream(settingsFile);
                                fos.write(bodyStr.getBytes("UTF-8"));
                                fos.flush();
                                fos.close();

                                // Notify WebView to reload/update instantly
                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        if (webView != null) {
                                            String js = "if (typeof window.applyRemoteSettings === 'function') { window.applyRemoteSettings(" + bodyStr + "); } else if (typeof applyRemoteSettings === 'function') { applyRemoteSettings(" + bodyStr + "); } try { localStorage.setItem('settings', " + JSONObject.quote(bodyStr) + "); } catch(e){}";
                                            webView.evaluateJavascript(js, null);
                                        }
                                    }
                                });

                                sendResponse(out, 200, "application/json", "{\"status\":\"success\"}");
                            } else {
                                File settingsFile = new File(getFilesDir(), "settings.json");
                                String content = "{}";
                                if (settingsFile.exists()) {
                                    FileInputStream fis = new FileInputStream(settingsFile);
                                    byte[] data = new byte[(int) settingsFile.length()];
                                    fis.read(data);
                                    fis.close();
                                    content = new String(data, "UTF-8");
                                }
                                sendResponse(out, 200, "application/json", content);
                            }
                            client.close();
                            return;
                        }

                        if ("/upload_audio.php".equals(path) || "/upload_audio".equals(path)) {
                            if ("POST".equalsIgnoreCase(method) && contentLength > 0) {
                                char[] bodyChars = new char[contentLength];
                                int read = 0;
                                while (read < contentLength) {
                                    int r = reader.read(bodyChars, read, contentLength - read);
                                    if (r == -1) break;
                                    read += r;
                                }
                                try {
                                    final String bodyStr = new String(bodyChars);
                                    JSONObject parsed = new JSONObject(bodyStr);
                                    String rawName = parsed.optString("fileName", parsed.optString("name", "custom_alert.mp3")).trim();
                                    String safeName = rawName.replaceAll("[^a-zA-Z0-9_\\-\\.]", "_");
                                    if (!safeName.toLowerCase().endsWith(".mp3")) safeName += ".mp3";
                                    String base64Data = parsed.optString("base64", parsed.optString("data", ""));
                                    if (base64Data.contains(",")) base64Data = base64Data.split(",")[1];
                                    byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);

                                    File target = new File(getFilesDir(), safeName);
                                    FileOutputStream fos = new FileOutputStream(target);
                                    fos.write(decoded);
                                    fos.flush();
                                    fos.close();
                                    Log.i(TAG, "Uploaded MP3 file saved successfully: " + target.getAbsolutePath() + " (" + target.length() + " bytes)");

                                    sendResponse(out, 200, "application/json", "{\"status\":\"success\",\"fileName\":\"" + safeName + "\",\"audioPath\":\"azan/" + safeName + "\"}");
                                } catch (Exception err) {
                                    Log.e(TAG, "Error in HTTP upload_audio", err);
                                    sendResponse(out, 500, "application/json", "{\"status\":\"error\",\"message\":\"" + err.getMessage() + "\"}");
                                }
                            } else {
                                sendResponse(out, 405, "application/json", "{\"status\":\"error\",\"message\":\"Method Not Allowed\"}");
                            }
                            client.close();
                            return;
                        }

                        if ("/list_mp3.php".equals(path) || "/list_mp3".equals(path)) {
                            try {
                                JSONArray arr = new JSONArray();
                                String[] defaults = new String[]{"fajr.mp3", "dhuhr.mp3", "asr.mp3", "maghrib.mp3", "isha.mp3", "Alhamd.mp3", "buzzer.mp3", "silent.mp3"};
                                for (String d : defaults) arr.put(d);

                                File[] files = getFilesDir().listFiles();
                                if (files != null) {
                                    for (File f : files) {
                                        if (f.isFile() && f.getName().toLowerCase().endsWith(".mp3")) {
                                            boolean exists = false;
                                            for (int i = 0; i < arr.length(); i++) {
                                                if (f.getName().equalsIgnoreCase(arr.optString(i))) {
                                                    exists = true;
                                                    break;
                                                }
                                            }
                                            if (!exists) arr.put(f.getName());
                                        }
                                    }
                                }
                                sendResponse(out, 200, "application/json", arr.toString());
                            } catch (Exception err) {
                                sendResponse(out, 200, "application/json", "[\"fajr.mp3\",\"dhuhr.mp3\",\"asr.mp3\",\"maghrib.mp3\",\"isha.mp3\",\"Alhamd.mp3\",\"buzzer.mp3\",\"silent.mp3\"]");
                            }
                            client.close();
                            return;
                        }

                        if ("/get_network_info.php".equals(path) || "/get_network_info".equals(path)) {
                            String ip = getDeviceIpAddress();
                            sendResponse(out, 200, "application/json", "{\"lanIp\":\"" + ip + "\",\"port\":8080,\"adminUrl\":\"http://" + ip + ":8080/admin.html\",\"hostUrl\":\"http://" + ip + ":8080/admin.html\"}");
                            client.close();
                            return;
                        }

                        // Serve custom uploaded audio files from internal storage
                        if (path.startsWith("/azan/") || path.startsWith("/public/azan/")) {
                            String fileNameOnly = path.replace("/public/azan/", "").replace("/azan/", "");
                            File internalFile = new File(getFilesDir(), fileNameOnly);
                            if (internalFile.exists() && internalFile.length() > 0) {
                                try {
                                    FileInputStream fis = new FileInputStream(internalFile);
                                    byte[] fBytes = new byte[(int) internalFile.length()];
                                    fis.read(fBytes);
                                    fis.close();
                                    sendByteResponse(out, 200, "audio/mpeg", fBytes);
                                    client.close();
                                    return;
                                } catch (Exception ignored) {}
                            }
                        }

                        // Serve static assets (admin.html, admin.js, styles.css, etc.)
                        String assetPath = path.startsWith("/") ? path.substring(1) : path;
                        if (assetPath.isEmpty() || assetPath.equals("admin")) assetPath = "admin.html";

                        try {
                            InputStream assetIn = getAssets().open(assetPath);
                            byte[] assetBytes = new byte[assetIn.available()];
                            assetIn.read(assetBytes);
                            assetIn.close();

                            String mime = "text/plain";
                            if (assetPath.endsWith(".html")) mime = "text/html; charset=UTF-8";
                            else if (assetPath.endsWith(".css")) mime = "text/css; charset=UTF-8";
                            else if (assetPath.endsWith(".js")) mime = "application/javascript; charset=UTF-8";
                            else if (assetPath.endsWith(".json")) mime = "application/json; charset=UTF-8";
                            else if (assetPath.endsWith(".mp3")) mime = "audio/mpeg";

                            sendByteResponse(out, 200, mime, assetBytes);
                        } catch (Exception e) {
                            sendResponse(out, 404, "text/plain", "Not Found");
                        }
                        client.close();
                    } catch (Exception ignored) {}
                }
            }).start();
        }

        private void sendResponse(OutputStream out, int code, String mime, String content) {
            try {
                byte[] bytes = content.getBytes("UTF-8");
                sendByteResponse(out, code, mime, bytes);
            } catch (Exception ignored) {}
        }

        private void sendByteResponse(OutputStream out, int code, String mime, byte[] bytes) {
            try {
                String header = "HTTP/1.1 " + code + " OK\r\n" +
                        "Content-Type: " + mime + "\r\n" +
                        "Content-Length: " + bytes.length + "\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                        "Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With\r\n" +
                        "Connection: close\r\n\r\n";
                out.write(header.getBytes("UTF-8"));
                out.write(bytes);
                out.flush();
            } catch (Exception ignored) {}
        }
    }
}
