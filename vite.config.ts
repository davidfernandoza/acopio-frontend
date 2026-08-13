import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        name: 'Acopio',
        short_name: 'Acopio',
        description: 'Encuentra y gestiona puntos de acopio de ayuda',
        theme_color: '#1f6f5b',
        background_color: '#f3efe6',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'es',
        categories: ['social', 'lifestyle'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.port === '3000' ||
              url.pathname.startsWith('/acopios') ||
              url.pathname.startsWith('/countries') ||
              url.pathname.startsWith('/auth') ||
              url.pathname.startsWith('/departments') ||
              url.pathname.startsWith('/cities'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'acopio-api-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 30,
              },
              networkTimeoutSeconds: 8,
            },
          },
        ],
      },
      // Avoid vite-plugin-pwa generating/reading missing dev-dist/sw.js on Vite 8.
      // Local installability uses public/sw-dev.js instead (see main.ts).
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
