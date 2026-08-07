import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/.
  // The deploy workflow sets BASE_PATH; local dev and Netlify/Vercel use "/".
  base: process.env.BASE_PATH || "/",

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },

  root: path.resolve(import.meta.dirname, "client"),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // Split heavy visualization libs so first paint is fast
        manualChunks: {
          echarts: ["echarts"],
          visnetwork: ["vis-network/standalone"],
          xlsx: ["xlsx"],
          vendor: ["react", "react-dom", "wouter"],
        },
      },
    },
  },

  server: { port: 3000, host: true },
});
