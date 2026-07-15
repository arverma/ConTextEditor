import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
// Monarch tokenizer only — no language-server worker needed for Markdown.
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
// Find / Replace widget + Cmd/Ctrl+F (slim editor.api does not include contribs).
import "monaco-editor/esm/vs/editor/contrib/find/browser/findController";

// Vite's `?worker` import resolves to a locally bundled worker file at build time —
// no CDN fetch, so the editor stays fully self-contained (no remote script loads).
self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
