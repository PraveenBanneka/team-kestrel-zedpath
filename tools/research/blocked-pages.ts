// Pages that returned unsafe content during research (CLAUDE.md, web research rule 5). Never fetched, opened or linked
// again. Stored as SHA-256 fingerprints of the normalised URL so this public repo never shows the address (rule 6); the
// whole host stays usable when its other pages are fine (Praveen 2026-10-15: "block that page only").
// Hosts blocked outright stay in BLOCKED_HOSTS (worker/syllabi.ts). Check a URL: node tools/research/check-url.ts <url>
import { createHash } from 'node:crypto';

export const BLOCKED_PAGE_SHA256 = new Set([
  '0795cbe70004603f95fdf7ee6892895a9ce54905158961c2fdabd79ac0ef01aa',   // 2026-10-15: practical-test page with hidden third-party spam links (aptitude research)
]);

/** host + path, lower-case, no scheme, query, fragment or trailing slash: one page, however it is written. */
export const normalisePage = (url: string) => { const u = new URL(url); return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '').toLowerCase()}`; };
export const pageFingerprint = (url: string) => createHash('sha256').update(normalisePage(url)).digest('hex');
export const isBlockedPage = (url: string) => BLOCKED_PAGE_SHA256.has(pageFingerprint(url));
