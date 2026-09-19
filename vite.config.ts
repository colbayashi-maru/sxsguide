import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SINGLE_FILE=1 emits one JS chunk with every dynamic import inlined, which
// scripts/bundle-single-file.mjs then folds into a self-contained page. The
// hosted copy uses it because a sandboxed host may not resolve the extra chunk
// requests that code splitting depends on. Normal builds keep the splitting.
const singleFile = globalThis.process?.env?.SINGLE_FILE === '1';

export default defineConfig(({ command }) => ({
  // The dev server serves from the root so `npm run dev` opens at
  // localhost:5173 with no path suffix. Builds default to the GitHub Pages
  // project-site prefix; set BASE_PATH to deploy anywhere else.
  base: command === 'build' ? (globalThis.process?.env?.BASE_PATH ?? '/sxsguide/') : '/',
  plugins: [react()],
  build: singleFile
    ? {
        cssCodeSplit: false,
        assetsInlineLimit: Number.MAX_SAFE_INTEGER,
        rollupOptions: { output: { inlineDynamicImports: true } },
      }
    : {},
}));
