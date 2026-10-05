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
export interface AskCitation { n: number; source: string; page: number | null; url: string | null; quote: string }
export interface AskResponse {
  answer: string;                  // plain text; [1], [2] refer to citations
  citations: AskCitation[];
  engineFacts: string[];           // eligibility facts computed by ZedPath's own rule engine for this student
  answeredAt: string;
}

export const QUESTION_MAX = 500;
export const EMBED_MODEL = '@cf/baai/bge-m3';     // multilingual: Sinhala/Tamil questions find English passages
export const EMBED_DIMS = 1024;
export const ASK_INDEX_NAME = 'zedpath-ask';
