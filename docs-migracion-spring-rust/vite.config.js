import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Three.js se entrega como chunk diferido exclusivo del capítulo 18.
    chunkSizeWarningLimit: 600,
  },
});
