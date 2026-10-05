import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// The Cloudflare plugin runs the Worker in the real Workers runtime during `npm run dev`.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
