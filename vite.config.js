import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Manifest 파일 설정
      manifest: {
        name: "또박한글 미니 포털",
        short_name: "또박한글",
        description: "또박한글 미니 포털",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#317EFB",
        icons: [
          {
            src: "192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      // Service Worker 설정
      registerType: "autoUpdate",
      workbox: {
        // 정적파일 캐싱
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],

        // Runtime caching
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1년 동안 유지
              },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
      includeAssets: ["favicon.ico", "180.png", "192.png", "512.png"],

      // devOptions: {
      //   enabled: true,
      // },
    }),
  ],
  server: {
    open: false,
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
