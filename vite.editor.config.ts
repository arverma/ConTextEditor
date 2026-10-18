import { defineConfig } from "vite";
import { resolve } from "node:path";

// Standalone static website, deployed to GitHub Pages at
// https://arverma.github.io/ConTextEditor/. The root URL serves the editor.
export default defineConfig({
  root: "src/editor",
  base: "/ConTextEditor/",
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
});
