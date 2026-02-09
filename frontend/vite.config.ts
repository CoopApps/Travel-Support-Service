import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: true, // Listen on all network interfaces
    hmr: {
      // Accept WebSocket connections from any subdomain
      clientPort: 5174,
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // Modern backend port
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable source maps for production debugging
    sourcemap: true,
    // Use esbuild for fast minification (TDZ error is fixed)
    minify: 'esbuild',
    // Merged homecareApiClient back into homecareApi.ts to match dashboardApi pattern
    // No manual chunking needed - all initialization happens in one module
  },
});
