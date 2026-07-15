import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8"));

// Builds the editor page as a standalone static site (dist-editor/), deployed to
// GitHub Pages at https://arverma.github.io/ConTextEditor/ — NOT bundled into
// the extension. This is what makes the tab shareable with Gemini in Chrome's
// "@" tab picker, which excludes chrome-extension:// pages by URL scheme.
export default defineConfig({
  root: "src/editor",
  base: "/ConTextEditor/",
  define: {
    __MONACO_VERSION__: JSON.stringify(pkg.dependencies["monaco-editor"] ?? "unknown"),
  },
  build: {
    outDir: resolve(__dirname, "dist-editor"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        editor: resolve(__dirname, "src/editor/editor.html"),
        privacy: resolve(__dirname, "src/editor/privacy.html"),
      },
    },
  },
  worker: {
    format: "es",
  },
});
