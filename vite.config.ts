import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __PICKTICK_VERSION__: JSON.stringify(version),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
