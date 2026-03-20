import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Root deploy on Vercel; set VITE_BASE or `base` in env if hosting under a subpath
  base: process.env.VITE_BASE ?? '/',
  build: {
    // Avoid surprises on older browsers in production
    target: 'es2022',
    sourcemap: false,
  },
})
