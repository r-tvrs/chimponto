/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // O manifest já existe em public/; o plugin só gera o service worker.
      manifest: false,
      // A outbox e o cache de leitura vivem no IndexedDB, fora do service worker: atualizar não os apaga.
      registerType: "autoUpdate",
      injectRegister: "script",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Worker e core do Tesseract (OCR, docs/06), baixados na primeira leitura; o idioma `por`
            // fica no IndexedDB do próprio Tesseract.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js(-core)?@.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "tesseract",
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
