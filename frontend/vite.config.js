import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost',  // Added this
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // Changed to localhost
        changeOrigin: true,
        secure: false,
      },
      '/accounts': {
        target: 'http://localhost:8000',  // Changed to localhost
        changeOrigin: true,
        secure: false,
      },
    },
  },
})