import { defineConfig } from "vite";
import { resolve } from "node:path";

// Production is served at https://editor.arverma.dev/.
// Preserve the existing local development URL without prefixing production assets.
export default defineConfig(({ command, isPreview }) => ({
  root: "src/editor",
  base: command === "serve" && !isPreview ? "/ConTextEditor/" : "/",
  build: {
    outDir: resolve(__dirname, "dist-editor"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/editor/index.html"),
        privacy: resolve(__dirname, "src/editor/privacy.html"),
      },
    },
  },
  // public/ copies as-is — used for the legacy /editor.html redirect page.
  worker: {
    format: "es",
  },
}));
