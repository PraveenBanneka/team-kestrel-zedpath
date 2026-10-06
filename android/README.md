# ZedPath for Android (Trusted Web Activity)

The Android app is a **Trusted Web Activity (TWA)**: a small signed shell that opens
the live ZedPath site full screen inside the phone's Chrome. It is built with Google's
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

## How updates work

| Change | What ships it |
|---|---|
| Screens, features, data, fixes (almost everything) | A normal web deploy. The app shows it on next open; no new APK |
| App name, icon, package, Android permissions (e.g. notifications) | A new APK with a higher `appVersionCode`, installed over the old one (or auto-updated by Google Play) |

## Verification (no browser bar)

Android shows the site without an address bar only when the site vouches for the app:
`public/.well-known/assetlinks.json` lists the package `com.teamkestrel.zedpath` and the SHA-256 fingerprint of the
signing certificate. If the app is ever signed by Google Play App Signing, add Play's fingerprint there too.

## Build (Windows)

Prerequisites (outside the repo, in `%USERPROFILE%\.bubblewrap`): JDK 17, Android command-line tools with
`build-tools/36.1.0` and `platforms/android-36`, and `config.json` pointing at both. `npm i -g @bubblewrap/cli`.

```
node android/make-twa-manifest.mjs        # twa-manifest.json from the live web manifest (not committed)
cd android && bubblewrap update --skipVersionUpgrade
bubblewrap build --skipPwaValidation      # passwords via BUBBLEWRAP_KEYSTORE_PASSWORD / BUBBLEWRAP_KEY_PASSWORD
```

Outputs: `app-release-signed.apk` (install directly) and `app-release-bundle.aab` (Google Play).

## Signing key

`%USERPROFILE%\.zedpath-signing\zedpath-release.jks`, alias `zedpath`, outside the repo and OneDrive. Its password
is stored only DPAPI-encrypted (`keystore-pass.dpapi`, readable by the owner's Windows account alone).
**Back up both files somewhere safe.** If the key is lost, installed apps can no longer be updated with the same
identity. Never commit them (the `.gitignore` and the pre-push leak scanner both block keystores).
