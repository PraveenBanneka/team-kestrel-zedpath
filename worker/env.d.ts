// Secrets and vars that `wrangler types` cannot see (they are set with `wrangler secret put`, not in .dev.vars).
// `declare global` because TypeScript treats every file as a module, so a bare interface here would not merge.
export {};
declare global {
  interface Env {
    /** Google AI Studio key, set by Praveen with `wrangler secret put GEMINI_API_KEY`. Never sent to the browser. */
    GEMINI_API_KEY?: string;
    /** Local-only switch for developer tools (corpus embedding). Set in .dev.vars; never set in production. */
    DEV_TOOLS?: string;
  }
}
