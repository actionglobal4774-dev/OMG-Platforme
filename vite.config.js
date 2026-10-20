import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  optimizeDeps: { entries: ["index.html"] },
  plugins: [react()],
  server: {
    port: 5180,
    host: "127.0.0.1",
    strictPort: false,
    hmr: {
      host: "127.0.0.1",
      protocol: "ws",
      clientPort: 5180
    }
  },
  build: {
    sourcemap: false,
    minify: true,
    // The question bank is intentionally isolated and loaded only after a
    // University session is unlocked. Its raw JSON-like content compresses
    // from ~1.5 MB to well below 100 KB, so use a dataset-aware threshold.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          i18n: ["i18next", "react-i18next"],
          icons: ["react-icons/fa"]
        }
      }
    }
  }
});
