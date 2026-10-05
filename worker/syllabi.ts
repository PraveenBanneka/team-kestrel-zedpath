// Degree syllabi researched from official university sources (data/degrees/syllabi-2026-10-05.json, SYLLABI_REPORT.md).
// Only FOUND entries are served. UNREADABLE/NOT_PUBLISHED entries are withheld, and so are their URLs: on 2026-10-05
// one source host returned unsafe content on that date (see BLOCKED_HOSTS), so ZedPath must never link students there.
import data from '../data/degrees/syllabi-2026-10-05.json';
import type { Syllabus } from '../shared/api.ts';

type Raw = { uniCode: string; degree: string; status: string; duration: string | null; specialisations?: string[];
  years?: { label: string; modules: string[] }[]; sourceUrls?: string[]; notes?: string | null };

const BLOCKED_HOSTS = new Set(['dental.pdn.ac.lk']);
const raw = data as { retrievedOn: string; programmes: Raw[] };

export const SYLLABI = new Map<string, Syllabus>(raw.programmes
  .filter(p => p.status === 'FOUND' && (p.years ?? []).some(y => y.modules.length > 0))
  .filter(p => !(p.sourceUrls ?? []).some(u => BLOCKED_HOSTS.has(new URL(u).hostname)))
  .map(p => [p.uniCode, { degree: p.degree, duration: p.duration ?? null, specialisations: p.specialisations ?? [],
    years: (p.years ?? []).filter(y => y.modules.length > 0), sourceUrls: p.sourceUrls ?? [], retrievedOn: raw.retrievedOn,
    notes: p.notes ?? null }]));

/** Short fingerprint of the served syllabus data, so the API's ETag changes whenever the data does. */
export const SYLLABI_VERSION = (() => {
  let h = 2166136261;
  for (const ch of JSON.stringify([...SYLLABI])) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
})();
