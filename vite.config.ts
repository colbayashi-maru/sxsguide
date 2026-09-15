import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base suits GitHub Pages project-site hosting; set BASE_PATH to deploy the app
// anywhere else (a custom domain wants '/').
export default defineConfig(() => ({
  base: loadBase(),
  plugins: [react()],
}));

function loadBase(): string {
  return globalThis.process?.env?.BASE_PATH ?? '/sxsguide/';
}
