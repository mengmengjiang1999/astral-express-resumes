import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BASE_PATH || '/astral-express-resumes/',
  worker: { format: 'es' },
  server: { port: 5173 },
  preview: { port: 4173 },
});
