package com.masjid.prayerclock;

import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import java.io.File;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "PrayerClockAlarm";
    private static MediaPlayer alarmPlayer;

    @SuppressLint("WakelockTimeout")
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        final String alarmId = intent.getStringExtra("alarmId");
        final String audioPath = intent.getStringExtra("audioPath");
        final String alarmName = intent.getStringExtra("alarmName");
        Log.i(TAG, "Alarm triggered! ID: " + alarmId + ", Name: " + alarmName + ", Audio: " + audioPath);

        // 1. Acquire WakeLock to keep CPU alive and wake screen if sleeping
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            try {
                wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                    "PrayerClock:AlarmWakeLock"
                );
                wakeLock.acquire(90000); // Hold for up to 90 seconds
            } catch (Exception e) {
                Log.w(TAG, "WakeLock acquisition warning: " + e.getMessage());
            }
        }

        // 2. Play Audio via native MediaPlayer
        try {
            if (alarmPlayer != null) {
                try {
                    if (alarmPlayer.isPlaying()) alarmPlayer.stop();
                    alarmPlayer.release();
                } catch (Exception ignored) {}
                alarmPlayer = null;
            }

            alarmPlayer = new MediaPlayer();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                alarmPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                );
            } else {
                alarmPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }

            String clean = audioPath != null ? audioPath.trim() : "azan/fajr.mp3";
            clean = clean.replaceAll("^/+", "");
            if (!clean.startsWith("azan/")) {
                clean = "azan/" + clean;
            }

            // Check if it's an uploaded file in internal storage
            String fileNameOnly = clean.replace("azan/", "");
            File internalFile = new File(context.getFilesDir(), fileNameOnly);

            if (internalFile.exists() && internalFile.length() > 0) {
                alarmPlayer.setDataSource(internalFile.getAbsolutePath());
                Log.i(TAG, "Playing alarm from internal storage: " + internalFile.getAbsolutePath());
            } else {
                // Play from assets
                AssetFileDescriptor afd = context.getAssets().openFd(clean);
                alarmPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
                Log.i(TAG, "Playing alarm from APK asset: " + clean);
            }

            final PowerManager.WakeLock finalWakeLock = wakeLock;
            alarmPlayer.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    try {
                        mp.release();
                        alarmPlayer = null;
                        if (finalWakeLock != null && finalWakeLock.isHeld()) {
                            finalWakeLock.release();
                        }
                    } catch (Exception ignored) {}
                }
            });

            alarmPlayer.prepare();
            alarmPlayer.start();
        } catch (Exception e) {
            Log.e(TAG, "Failed to play alarm audio: " + e.getMessage(), e);
        }

        // 3. Bring MainActivity to foreground if not active
        try {
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            );
            launchIntent.putExtra("alarmRinging", true);
            launchIntent.putExtra("alarmName", alarmName != null ? alarmName : "Scheduled Alarm");
            context.startActivity(launchIntent);
        } catch (Exception e) {
            Log.w(TAG, "Could not bring MainActivity to front: " + e.getMessage());
        }
    }
}
