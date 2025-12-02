import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // ✅ Allows access from external IP (not just localhost)
    port: 8001,      // ✅ Runs on port 8001
    proxy: {
      '/api': {
        target: 'http://122.186.76.102:8002', // ✅ Backend server IP and port
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://122.186.76.102:8002', // ✅ Proxy /uploads to backend
        changeOrigin: true,
      },
    },
  },
})
