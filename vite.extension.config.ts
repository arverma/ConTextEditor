import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

// Builds only the extension shell (manifest + background service worker +
// icons). The editor page itself is a separate site — see vite.editor.config.ts —
// served over https (GitHub Pages) so Gemini in Chrome's tab-context picker can
// select it (extension pages are excluded from that picker by URL scheme).
export default defineConfig({
  plugins: [crx({ manifest: manifest as any })],
});
