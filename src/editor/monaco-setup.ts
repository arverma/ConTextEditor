import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

// Vite's `?worker` import resolves to a locally bundled worker file at build time —
// no CDN fetch, so the editor stays fully self-contained (no remote script loads).
// Only the base editor worker is needed since this editor uses plaintext (no
// language-specific validation workers like ts/json/css/html are wired up).
self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
