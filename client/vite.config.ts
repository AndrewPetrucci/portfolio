import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const docker = process.env.DOCKER === '1'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: docker ? { usePolling: true, interval: 300 } : undefined,
    hmr: docker ? { host: 'localhost', clientPort: 5173 } : undefined,
    proxy: {
      '/api': {
        target: process.env.API_PROXY || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
