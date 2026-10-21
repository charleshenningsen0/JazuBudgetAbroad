import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built site works on any host path:
  // Vercel, Netlify, Cloudflare Pages, or a GitHub Pages subdirectory.
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
