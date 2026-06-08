import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    // Default include globbing, resolved relative to the working directory, so
    // both root (`vitest run`) and per-package (`npm test --workspaces`) runs
    // discover the right test files.
    include: ['**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
