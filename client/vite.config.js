    // client/vite.config.js

    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import path from 'path'
    // Removed PostCSS plugin imports

    // https://vitejs.dev/config/
    export default defineConfig({
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          'src': path.resolve(__dirname, './src')
        },
        extensions: ['.js', '.jsx', '.json']
      },
      build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          }
        }
      },

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
        watch: {
          usePolling: true,
        }
        // --- End Added Watch Config ---
      }
    })
    