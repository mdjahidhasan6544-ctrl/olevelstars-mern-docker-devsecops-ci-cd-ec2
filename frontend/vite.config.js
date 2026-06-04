import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET;

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.VITE_DEV_PORT || 5173),
    ...(devProxyTarget
      ? {
          proxy: {
            "/api": {
              target: devProxyTarget,
              changeOrigin: true
            }
          }
        }
      : {})
  }
});
