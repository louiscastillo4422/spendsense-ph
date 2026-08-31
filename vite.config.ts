import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Relative asset paths so the build works whether it is served from a
  // domain root (Netlify/Vercel) or a repo subpath (GitHub Pages,
  // e.g. /spendsense-ph/). Safe here because the app uses no URL router.
  base: './',
  plugins: [react()],
})
