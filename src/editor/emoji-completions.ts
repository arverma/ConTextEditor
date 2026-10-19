import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import { EMOJI_SHORTCODES } from "./emoji-shortcodes";

// Incomplete shortcode at the cursor: ":roc", ":apple", ":+1".
const SHORTCODE = /:[a-z0-9_+-]*$/i;
const BEFORE = /[\s([{"'`*_~>,.!?/\\-]/;

export function emojiCompletionSource(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(SHORTCODE);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  if (word.from > 0 && !BEFORE.test(context.state.sliceDoc(word.from - 1, word.from))) return null;
  const prefix = word.text.slice(1).toLowerCase();
  const options = EMOJI_SHORTCODES.filter((item) => item.id.toLowerCase().startsWith(prefix)).map((item) => ({
    label: `${item.emoji}  ${item.id}`,
    apply: item.emoji,
  }));
  return options.length ? { from: word.from, options } : null;
}

export function emojiCompletions(): Extension {
  return autocompletion({ override: [emojiCompletionSource], activateOnTyping: true });
}
