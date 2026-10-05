import { defineConfig } from 'vitest/config';

// Unit tests for the pure TypeScript engines (shared/) and tools; no Workers runtime needed.
export default defineConfig({
  test: { include: ['shared/**/*.test.ts', 'tools/**/*.test.ts', 'worker/**/*.test.ts', 'src/**/*.test.ts'] },
});
