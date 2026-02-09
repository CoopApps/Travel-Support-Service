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
    // Enable source maps temporarily to debug circular dependency issue
    sourcemap: true,
    // DISABLE minification to debug TDZ error with readable code
    minify: false,
    // Merged homecareApiClient back into homecareApi.ts to match dashboardApi pattern
    // No manual chunking needed - all initialization happens in one module
  },
});
