// ZedPath for Android, native shell (Capacitor 8). Replaces the Trusted Web Activity: the app has its own window (no
// "Running in Chrome", no address bar) and posts its own native notifications, while still loading the LIVE site, so
// every web deploy updates the app without a new APK. Same package and signing key as the TWA, so it installs over it.
import type { CapacitorConfig } from '@capacitor/cli';

// The live site's address comes from the environment, not the repo: set ZEDPATH_APP_URL (https://...) for the build.
const appUrl = process.env.ZEDPATH_APP_URL;
if (!appUrl || !/^https:\/\/[^/\s]+\/?$/.test(appUrl)) throw new Error('Set ZEDPATH_APP_URL to the live site (https://host) before cap sync');

const config: CapacitorConfig = {
  appId: 'com.teamkestrel.zedpath',
  appName: 'ZedPath',
  webDir: 'www',                                   // only the offline page and a fallback start page live in the APK
  server: {
    url: `${appUrl.replace(/\/$/, '')}/?source=android-app`,
    errorPath: 'offline.html',                     // shown when the phone is offline on first open
  },
  android: {
    backgroundColor: '#F4F6FB',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 900, backgroundColor: '#24478C', showSpinner: false, androidScaleType: 'CENTER_CROP' },
    StatusBar: { style: 'LIGHT', backgroundColor: '#F4F6FB', overlaysWebView: false },
    LocalNotifications: { smallIcon: 'ic_stat_zedpath', iconColor: '#24478C' },
  },
};

export default config;
