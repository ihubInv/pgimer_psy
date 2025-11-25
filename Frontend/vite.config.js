import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // ✅ Allows access from external IP (not just localhost)
    port: 2026,      // ✅ Runs on port 2026
    proxy: {
      '/api': {
        target: 'http://31.97.60.2:2025', // ✅ Backend server IP and port
        changeOrigin: true,
      },
    },
  },
})
