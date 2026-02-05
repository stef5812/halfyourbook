import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";

  return {
    plugins: [react()],
    base: "/halfyourbook/",
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3004",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://127.0.0.1:3004",
          changeOrigin: true,
        },
      },
    },
    build: isBuild
      ? {
          outDir: "/var/www/stefandodds.ie/halfyourbook",
          emptyOutDir: true,
        }
      : undefined,
  };
});
