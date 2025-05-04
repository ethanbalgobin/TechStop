// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // --- Proxy rule for authentication routes ---
      '/api/auth': {
        target: 'http://localhost:5001', // Your backend server port
        changeOrigin: true,
        configure: (proxy, options) => {
          console.log('[vite proxy] Configuring proxy for /api/auth');
          // Optional: Keep logging if needed for debugging auth routes
          proxy.on('error', (err, req, res) => { console.error('[vite proxy] /api/auth Error:', err); });
          proxy.on('proxyReq', (proxyReq, req, res) => { console.log(`[vite proxy] /api/auth Request Outgoing: ${req.method} ${req.originalUrl} -> ${options.target}${proxyReq.path}`); });
          proxy.on('proxyRes', (proxyRes, req, res) => { console.log(`[vite proxy] /api/auth Response Received: ${proxyRes.statusCode} for ${req.originalUrl}`); });
        }
      },
      // --- ADDED: Proxy rule for other API routes (like products) ---
      // Adjust '/api' if your other routes have a different prefix
      '/api': {
        target: 'http://localhost:5001', // Your backend server port
        changeOrigin: true,
        configure: (proxy, options) => {
          console.log('[vite proxy] Configuring proxy for other /api routes');
          // Optional: Keep logging if needed for debugging these routes
          proxy.on('error', (err, req, res) => { console.error('[vite proxy] /api Error:', err); });
          proxy.on('proxyReq', (proxyReq, req, res) => { console.log(`[vite proxy] /api Request Outgoing: ${req.method} ${req.originalUrl} -> ${options.target}${proxyReq.path}`); });
          proxy.on('proxyRes', (proxyRes, req, res) => { console.log(`[vite proxy] /api Response Received: ${proxyRes.statusCode} for ${req.originalUrl}`); });
        }
        // IMPORTANT: No rewrite needed here if your server expects /api/products
      }
    }
  }
})
