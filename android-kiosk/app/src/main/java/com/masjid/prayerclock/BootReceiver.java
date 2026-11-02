package com.masjid.prayerclock;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "PrayerClockBoot";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        Log.i(TAG, "Boot broadcast received: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action) ||
            Intent.ACTION_REBOOT.equals(action) ||
            "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action)) {

            try {
                Intent launchIntent = new Intent(context, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP 
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                context.startActivity(launchIntent);
                Log.i(TAG, "Launched MainActivity from BootReceiver successfully");
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch MainActivity on boot: " + e.getMessage(), e);
            }
        }
    }
}
