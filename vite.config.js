import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Stock Veterinaria",
        short_name: "Stock",
        description: "Control de stock del pet-shop con lector de códigos de barras",
        lang: "es",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#1d4a3c",
        background_color: "#f2f5f3",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  server: {
    proxy: { "/api": "http://localhost:8787" }
  }
});
