    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import path from 'path'
    import { fileURLToPath } from 'url'
    // Removed PostCSS plugin imports

    const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
        },
        // Add base URL configuration
        base: '/',
        // Ensure assets are properly handled
        assetsDir: 'assets',
        // Enable minification
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        },
        // Ensure proper chunking
        chunkSizeWarningLimit: 1000
      },

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
      }
    })
    