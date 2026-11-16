import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8081,
    // macOS file-event streams can miss external/editor writes. Poll metadata
    // so Vite invalidates changed modules and delivers normal HMR reliably.
    watch: { usePolling: true, interval: 150 }
  },
  build: {
    sourcemap: true
  },
  // Enable source maps in development mode
  css: {
    devSourcemap: true
  }
})
