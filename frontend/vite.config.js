// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    plugins: [react()],
    base: "/halfyourbook/",

    server: {
      port: 5174,
      host: true,
      proxy: {
        // HalfYourBook backend API
        "/api": {
          target: "http://127.0.0.1:3004",
          changeOrigin: true,
        },
        // File uploads
        "/uploads": {
          target: "http://127.0.0.1:3004",
          changeOrigin: true,
        },
        // Central auth backend
        "/auth": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: "localhost",
        },
      },
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});