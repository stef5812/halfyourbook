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
        "/api": {
          target: "http://localhost:3004",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:3004",
          changeOrigin: true,
        },
        "/auth": {
          target: "http://localhost:3001",
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