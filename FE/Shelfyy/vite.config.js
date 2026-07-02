import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FE dev: http://localhost:5173
// BE dev: http://localhost:8080
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
