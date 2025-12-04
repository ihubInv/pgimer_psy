import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8001,
    proxy: {
      '/api': {
        target: 'http://122.186.76.102:8002',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://122.186.76.102:8002',
        changeOrigin: true,
      },
    },
    hmr: { 
      overlay: false,   // 🔥 turns off the red error screen
    }
  },
})
