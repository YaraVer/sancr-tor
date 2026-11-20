import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base works both locally and on GitHub Pages project sites
  // (https://<user>.github.io/<repo>/), so no per-environment config is needed.
  base: './',
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
