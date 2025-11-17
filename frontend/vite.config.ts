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
    // Disable source maps in production to protect source code
    sourcemap: process.env.NODE_ENV !== 'production',
    // Use terser for better minification and code protection
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true, // Remove debugger statements
      },
      mangle: {
        safari10: true, // Safari 10 compatibility
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'state-management': ['zustand', '@tanstack/react-query'],
        },
      },
    },
  },
});
