import { defineConfig } from "vite";
import { resolve } from "node:path";

// Builds the editor page as a standalone static site (dist-editor/), deployed to
// GitHub Pages at https://arverma.github.io/ConTextEditor/ — NOT bundled into
// the extension. This is what makes the tab shareable with Gemini in Chrome's
// "@" tab picker, which excludes chrome-extension:// pages by URL scheme.
// Entry is index.html so the bare Pages root URL serves the editor natively.
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
