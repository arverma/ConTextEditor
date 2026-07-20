import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
// Monarch tokenizer only — no language-server worker needed for Markdown.
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
// Find / Replace widget + Cmd/Ctrl+F (slim editor.api does not include contribs).
import "monaco-editor/esm/vs/editor/contrib/find/browser/findController";
// Suggest widget for emoji shortcodes (and any other completion providers).
import "monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController";
// Codicon font — without this, find-widget buttons render as garbled “line stacks”.
import "monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css";

// Vite's `?worker` import resolves to a locally bundled worker file at build time —
// no CDN fetch, so the editor stays fully self-contained (no remote script loads).
self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
