import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// GitHub Pages serwuje stronę pod https://wojciechmankowski.github.io/epicroll/
const BASE = '/epicroll/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    // Strona zapisana w telefonie po pierwszym wejściu: ekran z ID otwiera się bez internetu (SPEC.md F10).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'EPIC ROLL, rejestracja',
        short_name: 'EPIC ROLL',
        description: 'Rejestracja uczestników EPIC ROLL po numerze zamówienia',
        lang: 'pl',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#f4f6f9',
        theme_color: '#f4f6f9',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tylko pliki strony; fonty w podzbiorach łacińskich (polskie znaki), bez cyrylicy i wietnamskiego.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-*.woff2', '**/*-latin-ext-*.woff2'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'apps-script/**/*.test.js'],
  },
})
