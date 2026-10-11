import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for the pure TypeScript engines (shared/) and tools; no Workers runtime needed.
export default defineConfig({
  // The Worker exports a Durable Object class from `cloudflare:workers`, a module that exists only in the Workers runtime.
  resolve: { alias: { 'cloudflare:workers': fileURLToPath(new URL('./worker/testing/cloudflare-workers-stub.ts', import.meta.url)) } },
  test: { include: ['shared/**/*.test.ts', 'tools/**/*.test.ts', 'worker/**/*.test.ts', 'src/**/*.test.ts'] },
});
