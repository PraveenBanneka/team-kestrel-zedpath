// Ask ZedPath: types shared by the corpus tools, the API and the app. The assistant is always "Ask ZedPath";
// the underlying model provider is never named to students (Praveen, 2026-10-05).

/** A passage an answer may use, with where it came from. Stored as Vectorize metadata. */
export interface CorpusPassage {
  id: string;                      // hb-<printed page>-<n> | route-<route id>
  kind: 'HANDBOOK' | 'ROUTE';
  source: string;                  // e.g. "UGC handbook 2025/26"
  page: number | null;             // printed handbook page
  url: string | null;              // official source URL (routes)
  text: string;
}

export interface AskRequest { question: string; lang?: 'en' | 'si' | 'ta' }
/** source: a short readable name (never internal file notes); url: the official document; routeId: the same route's page in ZedPath. */
export interface AskCitation { n: number; source: string; page: number | null; url: string | null; routeId: string | null; quote: string }
/** The official UGC handbook 2025/26 (English), the document every handbook page number refers to. */
export const HANDBOOK_URL = 'https://www.ugc.ac.lk/downloads/admissions/Handbook_2025_26/student_handbook_english.pdf';
/** CR-004: the one-word answer shown as a chip above the text. null when the model gave none (no chip, never a guess). */
export type Verdict = 'YES' | 'NO' | 'DEPENDS' | 'NOT_FOUND';
/** CR-004: next steps under an answer, built by ZedPath from its own matches (never written by the model). */
export type AskAction =
  | { kind: 'COURSE'; uniCode: string; course: string; institution: string; band: 'SAFE' | 'LIKELY' | 'REACH' | 'OUT_OF_RANGE' | 'NOT_ENOUGH_DATA' | null }
  | { kind: 'NOTICE'; routeId: string; title: string; closesOn: string };
export interface AskResponse {
  answer: string;                  // plain text; [1], [2] refer to citations
  citations: AskCitation[];
  engineFacts: string[];           // eligibility facts computed by ZedPath's own rule engine for this student
  verdict: Verdict | null;
  actions: AskAction[];
  answeredAt: string;
}
export interface AskFeedback { question: string; answer: string; pages: number[]; rating: 'HELPFUL' | 'WRONG'; note?: string; lang: 'en' | 'si' | 'ta' }

/** Reads and removes the model's first line "VERDICT: YES|NO|DEPENDS|NOT_FOUND". Anything else: no verdict. */
export function takeVerdict(raw: string): { verdict: Verdict | null; text: string } {
  const m = raw.match(/^\s*\**\s*VERDICT\s*:\s*\**\s*(YES|NO|DEPENDS|NOT_FOUND)\b\**[ \t]*\r?\n?/i);
  if (!m) return { verdict: null, text: raw.trim() };
  return { verdict: m[1].toUpperCase() as Verdict, text: raw.slice(m[0].length).trim() };
}

export const QUESTION_MAX = 500;
export const EMBED_MODEL = '@cf/baai/bge-m3';     // multilingual: Sinhala/Tamil questions find English passages
export const EMBED_DIMS = 1024;
export const ASK_INDEX_NAME = 'zedpath-ask';
