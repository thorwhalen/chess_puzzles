import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Deployed under /<app>/ (deploy.py sets VITE_PUBLIC_BASE); built into frontend/ for enlace.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_PUBLIC_BASE ?? '/',
  build: { outDir: 'frontend', emptyOutDir: true },
  server: { proxy: { '/api/chess_puzzles': { target: 'http://127.0.0.1:8123', rewrite: (p) => p.replace('/api/chess_puzzles', '') } } },
  test: { include: ['src/**/*.test.ts'] },
})
