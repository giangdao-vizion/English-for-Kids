import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'app-icon.png'],
      manifest: {
        name: 'English for Kids',
        short_name: 'English Kids',
        description: 'Ứng dụng luyện nghe và học từ vựng tiếng Anh cho bé.',
        theme_color: '#fffdf7',
        background_color: '#fffdf7',
        display: 'standalone',
        orientation: 'portrait',
        id: '/',
        start_url: '/',
        lang: 'vi',
        icons: [
          {
            src: '/app-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
