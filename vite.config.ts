import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages serwuje stronę pod https://wojciechmankowski.github.io/epicroll/
export default defineConfig({
  base: '/epicroll/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'apps-script/**/*.test.js'],
  },
})
