import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiHost = process.env.VITE_API_HOST || '127.0.0.1'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',      // listen on all interfaces — required for Mac access
    port: 5176,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://${apiHost}:8002`,
        changeOrigin: true,
        ws: true,
      },
      '/health': {
        target: `http://${apiHost}:8002`,
        changeOrigin: true,
      },
    },
  },
  preview: { port: 5177, host: '0.0.0.0' },
})
