// 

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import debugUriPlugin from './vite-debug-plugin.js';

export default defineConfig({
  plugins: [
    debugUriPlugin(),
    react()
  ],
  server: {
    port: 8001,  // Frontend port
    host: '0.0.0.0',
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://122.186.76.102:8002',  // Backend port
        changeOrigin: true,
        secure: false
      }
    }
  }
});