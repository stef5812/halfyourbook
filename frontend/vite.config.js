import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/halfyourbook/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3004",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3004",
        changeOrigin: true,
      },
    },
  },
});
