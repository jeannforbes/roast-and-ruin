import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from a GitHub Pages project path.
  base: './',
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
