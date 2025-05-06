    // client/vite.config.js

    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    // Removed PostCSS plugin imports

    // https://vitejs.dev/config/
    export default defineConfig({
      plugins: [react()],

      // Removed inline CSS/PostCSS configuration

      // Server configuration
      server: {
        // Proxy config remains the same
        proxy: {
          '/api/auth': {
            target: 'http://localhost:5001', // Verify backend port
            changeOrigin: true,
          },
          '/api': {
            target: 'http://localhost:5001', // Verify backend port
            changeOrigin: true,
          }
        },
        // --- ADDED: Force polling for file watching ---
        // This can help in some environments (like Docker, WSL, or network drives)
        // where native file system events might not work reliably.
        // It might consume slightly more CPU.
        watch: {
          usePolling: true,
        }
        // --- End Added Watch Config ---
      }
    })
    