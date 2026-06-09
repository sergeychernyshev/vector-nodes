import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Resolve the workspace libraries from their TypeScript source so the editor
// build (and its worker sub-build) is self-contained and does not require the
// packages' `dist/` to be built first. Their package `exports` point at `dist/`,
// which only exists after `tsc -b`; aliasing to `src` avoids that build-order
// coupling (e.g. on Cloudflare, which only runs the editor build).
const pkgSrc = (name: string) => fileURLToPath(new URL(`../${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vector-nodes/core': pkgSrc('core'),
      '@vector-nodes/runtime': pkgSrc('runtime'),
      '@vector-nodes/engine': pkgSrc('engine'),
      '@vector-nodes/codegen': pkgSrc('codegen'),
    },
  },
  server: { port: 5173 },
});
