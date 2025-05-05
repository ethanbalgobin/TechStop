// client/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Removed PostCSS plugin imports

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // --- REMOVED inline CSS/PostCSS configuration ---

  // Server proxy config remains
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://localhost:5001', // Verify backend port
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5001', // Verify backend port
        changeOrigin: true,
      }
    }
  }
})
