import { completionKeymap } from "@codemirror/autocomplete";
import {
  copyLineDown,
  copyLineUp,
  cursorDocEnd,
  cursorDocStart,
  cursorGroupLeft,
  cursorGroupRight,
  cursorLineBoundaryLeft,
  cursorLineBoundaryRight,
  defaultKeymap,
  historyKeymap,
  indentWithTab,
  moveLineDown,
  moveLineUp,
  selectDocEnd,
  selectDocStart,
  selectGroupLeft,
  selectGroupRight,
  selectLineBoundaryLeft,
  selectLineBoundaryRight,
} from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { openSearchPanel, search, searchKeymap } from "@codemirror/search";
import { Compartment, EditorSelection, Prec, Transaction } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { emojiCompletions } from "./emoji-completions";
import { getFormattingEdit, type FormattingKind } from "./formatting";
import { createSourceState, normalizedText, rawSource, replaceSource, sourceOffset } from "./source-state";

export interface SourceEditor {
  getValue(): string;
  setValue(raw: string): void;
  replace(raw: string): void;
  focus(): void;
  hasFocus(): boolean;
  scrollTop(): number;
  setScrollTop(top: number): void;
  setCompact(compact: boolean): void;
  format(kind: FormattingKind): void;
  openReplace(): void;
  destroy(): void;
}

/** Documented Mac writing keys. CodeMirror's defaults already bind these; the list is the contract. */
export const writingKeys = [
  { mac: "Cmd-ArrowLeft", run: cursorLineBoundaryLeft, shift: selectLineBoundaryLeft },
  { mac: "Cmd-ArrowRight", run: cursorLineBoundaryRight, shift: selectLineBoundaryRight },
  { mac: "Cmd-ArrowUp", run: cursorDocStart, shift: selectDocStart },
  { mac: "Cmd-ArrowDown", run: cursorDocEnd, shift: selectDocEnd },
  { mac: "Alt-ArrowLeft", run: cursorGroupLeft, shift: selectGroupLeft },
  { mac: "Alt-ArrowRight", run: cursorGroupRight, shift: selectGroupRight },
  { key: "Alt-ArrowUp", run: moveLineUp },
  { key: "Alt-ArrowDown", run: moveLineDown },
  { key: "Shift-Alt-ArrowUp", run: copyLineUp },
  { key: "Shift-Alt-ArrowDown", run: copyLineDown },
] as const;

function metricsTheme(compact: boolean) {
  return EditorView.theme({
    ".cm-content, .cm-gutter": { fontSize: compact ? "16px" : "14px", lineHeight: compact ? "24px" : "22px" },
  });
}

function openReplace(view: EditorView): boolean {
  openSearchPanel(view);
  view.dom.querySelector<HTMLInputElement>('.cm-search input[name="replace"]')?.focus();
  return true;
}

export function createSourceEditor(parent: HTMLElement, options: { onChange: () => void; compact: boolean }): SourceEditor {
  const metrics = new Compartment();
  let view: EditorView;
  function format(kind: FormattingKind): void {
    const raw = view.state.field(rawSource);
    const selection = view.state.selection.main;
    const edit = getFormattingEdit(raw, sourceOffset(raw, selection.from), sourceOffset(raw, selection.to), kind);
    const next = raw.slice(0, edit.start) + edit.text + raw.slice(edit.end);
    const spec = replaceSource(view.state, next);
    spec.selection = EditorSelection.range(
      normalizedText(next.slice(0, edit.selectionStart)).length,
      normalizedText(next.slice(0, edit.selectionEnd)).length,
    );
    spec.annotations = [Transaction.userEvent.of("input.format")];
    view.dispatch(spec);
    view.focus();
  }
  const extensions = [
    lineNumbers(),
    drawSelection(),
    highlightActiveLine(),
    rectangularSelection(),
    crosshairCursor(),
    markdown(),
    search({ top: true }),
    emojiCompletions(),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ "aria-label": "Markdown source" }),
    metrics.of(metricsTheme(options.compact)),
    EditorView.theme({
      "&": { color: "var(--text)", backgroundColor: "var(--editor-bg)", height: "100%" },
      "&.cm-focused": { outline: "none" },
      ".cm-scroller": { fontFamily: "var(--font-mono)", overflow: "auto" },
      ".cm-gutters": {
        backgroundColor: "var(--editor-bg)",
        color: "color-mix(in srgb, var(--text) 50%, transparent)",
        border: "none",
      },
      ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent) 5%, transparent)" },
      ".cm-activeLineGutter": { backgroundColor: "transparent" },
      ".cm-cursor": { borderLeftColor: "var(--text)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, &.cm-focused .cm-content ::selection": {
        backgroundColor: "var(--source-selection)",
      },
    }),
    Prec.high(keymap.of([
      { key: "Mod-b", run: () => { format("bold"); return true; } },
      { key: "Mod-i", run: () => { format("italic"); return true; } },
      { key: "Mod-r", run: openReplace, preventDefault: true },
    ])),
    keymap.of([...searchKeymap, ...completionKeymap, ...historyKeymap, ...defaultKeymap, indentWithTab]),
    EditorView.updateListener.of((update) => {
      if (update.startState.field(rawSource, false) !== update.state.field(rawSource)) options.onChange();
    }),
  ];
  view = new EditorView({ parent, state: createSourceState("", extensions) });
  return {
    getValue: () => view.state.field(rawSource),
    setValue(raw) {
      if (view.state.field(rawSource) === raw) return;
      view.setState(createSourceState(raw, extensions));
    },
    replace(raw) {
      if (view.state.field(rawSource) === raw) return;
      view.dispatch(replaceSource(view.state, raw));
    },
    focus: () => view.focus(),
    hasFocus: () => view.hasFocus || parent.contains(document.activeElement),
    scrollTop: () => view.scrollDOM.scrollTop,
    setScrollTop: (top) => { view.scrollDOM.scrollTop = top; },
    setCompact: (compact) => { view.dispatch({ effects: metrics.reconfigure(metricsTheme(compact)) }); },
    format,
    openReplace: () => openReplace(view),
    destroy: () => view.destroy(),
  };
}

export function writingKeymapMatchesDefaults(): boolean {
  return writingKeys.every((expected) => defaultKeymap.some((binding) => {
    const key = "key" in expected ? binding.key === expected.key : binding.mac === expected.mac;
    return key && binding.run === expected.run && (!("shift" in expected) || binding.shift === expected.shift);
  }));
}
