import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is set for GitHub Pages project-site hosting; override with BASE_PATH if
// deploying somewhere else.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/sxsguide/',
  plugins: [react()],
});
