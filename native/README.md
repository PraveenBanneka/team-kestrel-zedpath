# ZedPath for Android (native, Capacitor 8)

Replaces the earlier Trusted Web Activity (`android/`). The app has its **own window** (no "Running in Chrome" notice,
no address bar) and posts **native notifications** itself, while still loading the **live site**
(`https://zedpath.teamkestrel.workers.dev/?source=android-app`), so every web deploy updates the app without a new APK.

| | |
|---|---|
| Package | `com.teamkestrel.zedpath` (same as the TWA, same signing key, so it installs over it) |
| Version | 1.1.0 (versionCode 3) — raise both for every new APK |
| Android | min API 24, target/compile API 36 |
| Plugins | LocalNotifications (small icon `ic_stat_zedpath`), App, SplashScreen, StatusBar |
| Offline | `www/offline.html` is shown when the phone is offline on first open |
| Icons/splash | `assets/` → `npx capacitor-assets generate --android` |

## How the website talks to the app
The native app injects `window.Capacitor` into the live page. `src/notify.ts` checks for it: inside the app it calls the
LocalNotifications plugin; in a browser it uses the service worker. No app code is bundled into the website.

## Build (Windows)
Needs JDK 21 and the Android SDK (both in `%USERPROFILE%\.bubblewrap`, outside the repo) and the signing key in
`%USERPROFILE%\.zedpath-signing` (password DPAPI-encrypted). Gradle reads the key only from the environment
variables `ZP_KS_FILE` / `ZP_KS_PASS`, set for the build process only.

```
cd native
npm install
npx cap sync android
# then, with JAVA_HOME = JDK 21, ANDROID_HOME = the SDK, ZP_KS_FILE / ZP_KS_PASS set:
cd android && gradlew.bat assembleRelease bundleRelease
```
Outputs: `android/app/build/outputs/apk/release/app-release.apk` (install directly) and
`android/app/build/outputs/bundle/release/app-release.aab` (Google Play).
