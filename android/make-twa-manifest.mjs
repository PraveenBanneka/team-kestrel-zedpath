// Generates android/twa-manifest.json from the LIVE web app manifest using Bubblewrap's own library, then applies
// ZedPath's fixed choices. Run from the repo root:  node android/make-twa-manifest.mjs
// The Android app is a Trusted Web Activity: a thin, signed shell that opens https://zedpath.teamkestrel.workers.dev
// full screen in the phone's Chrome. Content updates ship with every web deploy; the APK changes only for the shell
// (name, icon, package, permissions).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const { TwaManifest } = require(path.join(globalRoot, '@bubblewrap', 'cli', 'node_modules', '@bubblewrap', 'core'));

const HOST = 'zedpath.teamkestrel.workers.dev';
const manifestUrl = new URL(`https://${HOST}/manifest.webmanifest`);
const webManifest = await (await fetch(manifestUrl)).json();
const twa = TwaManifest.fromWebManifestJson(manifestUrl, webManifest);

twa.packageId = 'com.teamkestrel.zedpath';           // permanent once published on Google Play
twa.name = 'ZedPath';
twa.launcherName = 'ZedPath';
twa.startUrl = '/?source=android';
twa.signingKey = { path: path.join(os.homedir(), '.zedpath-signing', 'zedpath-release.jks'), alias: 'zedpath' };
twa.appVersionName = '1.0.1';
twa.appVersionCode = 2;                           // must rise with every APK so it installs over the last
twa.enableNotifications = true;                      // notification delegation: site notifications appear as native ZedPath ones
twa.fallbackType = 'customtabs';
twa.orientation = 'portrait';

await twa.saveToFile(path.join(import.meta.dirname, 'twa-manifest.json'));
console.log(`wrote android/twa-manifest.json for ${twa.packageId} -> ${twa.host}${twa.startUrl}`);
