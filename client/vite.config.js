import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    strictPort: false,
    proxy: {
      '/socket.io': {
        target: `http://localhost:${process.env.SERVER_PORT || process.env.PORT || 5000}`,
        ws: true,
        changeOrigin: true
      },
      '/api': {
        // Read backend port from env when available for flexibility during dev
        target: `http://localhost:${process.env.SERVER_PORT || process.env.PORT || 5000}`,
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
