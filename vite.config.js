import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8081
  },
  build: {
    sourcemap: true
  },
  // Enable source maps in development mode
  css: {
    devSourcemap: true
  }
})
