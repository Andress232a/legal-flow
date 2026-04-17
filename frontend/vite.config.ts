import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** En Docker (Windows/Mac): host.docker.internal. En local: localhost. */
const apiHost = process.env.LEGALFLOW_API_HOST ?? 'localhost'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/iam': {
        target: `http://${apiHost}:8001`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/iam/, '/api'),
      },
      '/api/docs-service': {
        target: `http://${apiHost}:8002`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/docs-service/, '/api'),
      },
      '/api/matters-service': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/matters-service/, '/api'),
      },
      '/api/time-service': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/time-service/, '/api'),
      },
      '/api/billing-service': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/billing-service/, '/api'),
      },
      '/api/calendar-service': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/calendar-service/, '/api'),
      },
    },
  },
})
