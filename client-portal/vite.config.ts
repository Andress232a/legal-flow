import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiHost = process.env.LEGALFLOW_API_HOST ?? 'localhost'
const gatewayPort = process.env.LEGALFLOW_GATEWAY_PORT ?? '8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: `http://${apiHost}:${gatewayPort}`,
        changeOrigin: true,
      },
    },
  },
})
