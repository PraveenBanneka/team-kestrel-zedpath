// Writes www/app-url.js (gitignored) from ZEDPATH_APP_URL, so the offline page's "Try again" knows where the live site
// is without the address being committed to the public repo. Runs before every cap sync (npm run sync).
import { writeFileSync } from 'node:fs';

const url = process.env.ZEDPATH_APP_URL;
if (!url || !/^https:\/\/[^/\s]+\/?$/.test(url)) {
  console.error('Set ZEDPATH_APP_URL to the live site (https://host) before building the app.');
  process.exit(1);
}
const start = `${url.replace(/\/$/, '')}/?source=android-app`;
writeFileSync(new URL('./www/app-url.js', import.meta.url), `window.ZEDPATH_START = ${JSON.stringify(start)};\n`);
console.log('www/app-url.js written');
