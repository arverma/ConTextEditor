import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { EMOJI_SHORTCODES } from "./emoji-shortcodes";

// Incomplete shortcode at cursor: ":roc", ":apple", ":+1"
const SHORTCODE_AT_CURSOR = /(^|[\s([{"'`*_~>,.!?/\\-]):([a-z0-9_+-]*)$/i;

export function registerEmojiCompletions(): void {
  monaco.languages.registerCompletionItemProvider("markdown", {
    triggerCharacters: [":"],
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const textUntil = line.slice(0, position.column - 1);
      const match = SHORTCODE_AT_CURSOR.exec(textUntil);
      if (!match) {
        return { suggestions: [] };
      }

      const prefix = match[2].toLowerCase();
      const startColumn = position.column - prefix.length - 1; // include leading ":"
      const range = new monaco.Range(
        position.lineNumber,
        startColumn,
        position.lineNumber,
        position.column
      );

      const suggestions = EMOJI_SHORTCODES.filter((item) =>
        item.id.toLowerCase().startsWith(prefix)
      ).map((item) => ({
        label: `${item.emoji}  ${item.id}`,
        kind: monaco.languages.CompletionItemKind.Text,
        insertText: item.emoji,
        range,
        filterText: `:${item.id}`,
        sortText: item.id,
      }));

      return { suggestions };
    },
  });
}
