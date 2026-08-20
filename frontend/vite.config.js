import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forwards relative /api/* fetches from the dev server (5173) to the
      // backend (4000) — without this, fetch("/api/prices") just 404s
      // against Vite's own dev server instead of reaching Express.
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});