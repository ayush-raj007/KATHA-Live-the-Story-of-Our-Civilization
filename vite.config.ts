import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The 3D toy viewer chunk is essentially three.js (~540 kB) and is only
    // loaded on demand, so allow it without a warning.
    chunkSizeWarningLimit: 600,
  },
})
