import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // The dev server serves from the root so `npm run dev` opens at
  // localhost:5173 with no path suffix. Builds default to the GitHub Pages
  // project-site prefix; set BASE_PATH to deploy anywhere else.
  base: command === 'build' ? (globalThis.process?.env?.BASE_PATH ?? '/sxsguide/') : '/',
  plugins: [react()],
}));
