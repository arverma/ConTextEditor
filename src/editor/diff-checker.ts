import { diffLines } from "diff";
import { format as formatSql, type SqlLanguage } from "sql-formatter";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export type DiffLanguage = "json" | "yaml" | "sql" | "text";
export type SqlDialect = "postgresql" | "mysql";
export type DiffHunkType = "equal" | "remove" | "add";
export const DIFF_STATE_KEY = "context-editor.diffChecker";

export interface DiffState {
  original: string;
  modified: string;
  language: DiffLanguage;
  dialect: SqlDialect;
  open: boolean;
}

export interface DiffHunk {
  type: DiffHunkType;
  lines: string[];
}

export interface DiffRow {
  left: string;
  right: string;
  leftNumber: number | null;
  rightNumber: number | null;
  kind: "equal" | "changed" | "removed" | "added";
}

export function parseDiffState(raw: string | null): DiffState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const state = value as Partial<DiffState>;
    if (
      typeof state.original !== "string" ||
      typeof state.modified !== "string" ||
      !["json", "yaml", "sql", "text"].includes(state.language ?? "") ||
      !["postgresql", "mysql"].includes(state.dialect ?? "") ||
      typeof state.open !== "boolean"
    ) return null;
    return state as DiffState;
  } catch {
    return null;
  }
}

function splitLines(value: string): string[] {
  const lines = value.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

export function formatDiffInput(raw: string, language: DiffLanguage, dialect: SqlDialect): string {
  if (!raw.trim() || language === "text") return raw;

  try {
    if (language === "json") return JSON.stringify(JSON.parse(raw), null, 2);
    if (language === "yaml") return stringifyYaml(parseYaml(raw));
    return formatSql(raw, {
      language: dialect as SqlLanguage,
      keywordCase: "upper",
      tabWidth: 2,
    });
  } catch {
    return raw;
  }
}

export function diffFormatted(original: string, modified: string): DiffHunk[] {
  return diffLines(original, modified)
    .map((part) => ({
      type: part.added ? "add" : part.removed ? "remove" : "equal",
      lines: splitLines(part.value),
    }) satisfies DiffHunk)
    .filter((hunk) => hunk.lines.length > 0);
}

export function toDiffRows(hunks: DiffHunk[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let leftNumber = 1;
  let rightNumber = 1;

  for (let index = 0; index < hunks.length; index += 1) {
    const hunk = hunks[index];
    const next = hunks[index + 1];
    if (hunk.type === "equal") {
      for (const line of hunk.lines) {
        rows.push({ left: line, right: line, leftNumber, rightNumber, kind: "equal" });
        leftNumber += 1;
        rightNumber += 1;
      }
      continue;
    }

    if (hunk.type === "remove" && next?.type === "add") {
      const count = Math.max(hunk.lines.length, next.lines.length);
      for (let lineIndex = 0; lineIndex < count; lineIndex += 1) {
        const left = hunk.lines[lineIndex] ?? "";
        const right = next.lines[lineIndex] ?? "";
        rows.push({
          left,
          right,
          leftNumber: left ? leftNumber : null,
          rightNumber: right ? rightNumber : null,
          kind: left && right ? "changed" : left ? "removed" : "added",
        });
        if (left) leftNumber += 1;
        if (right) rightNumber += 1;
      }
      index += 1;
      continue;
    }

    for (const line of hunk.lines) {
      rows.push({
        left: hunk.type === "remove" ? line : "",
        right: hunk.type === "add" ? line : "",
        leftNumber: hunk.type === "remove" ? leftNumber : null,
        rightNumber: hunk.type === "add" ? rightNumber : null,
        kind: hunk.type === "remove" ? "removed" : "added",
      });
      if (hunk.type === "remove") leftNumber += 1;
      else rightNumber += 1;
    }
  }
  return rows;
}

export function initDiffChecker(options: {
  isDesktop: () => boolean;
  onOpenChange?: (open: boolean) => void;
}): void {
  const button = document.getElementById("diff-checker-btn") as HTMLButtonElement | null;
  const closeButton = document.getElementById("diff-checker-close") as HTMLButtonElement | null;
  const section = document.getElementById("diff-checker");
  const language = document.getElementById("diff-language") as HTMLSelectElement | null;
  const dialect = document.getElementById("diff-sql-dialect") as HTMLSelectElement | null;
  const original = document.getElementById("diff-original") as HTMLTextAreaElement | null;
  const modified = document.getElementById("diff-modified") as HTMLTextAreaElement | null;
  const result = document.getElementById("diff-result");
  const summary = document.getElementById("diff-summary");
  if (!button || !closeButton || !section || !language || !dialect || !original || !modified || !result || !summary) return;
  const checkerSection = section;
  const openButton = button;
  const dismissButton = closeButton;
  const languageSelect = language;
  const dialectSelect = dialect;
  const originalEditor = original;
  const modifiedEditor = modified;
  const diffResult = result;
  const diffSummary = summary;
  let storedState: DiffState | null = null;
  try {
    storedState = parseDiffState(localStorage.getItem(DIFF_STATE_KEY));
  } catch {
    storedState = null;
  }
  if (storedState) {
    originalEditor.value = storedState.original;
    modifiedEditor.value = storedState.modified;
    languageSelect.value = storedState.language;
    dialectSelect.value = storedState.dialect;
  }

  function persist(open: boolean): void {
    const state: DiffState = {
      original: originalEditor.value,
      modified: modifiedEditor.value,
      language: languageSelect.value as DiffLanguage,
      dialect: dialectSelect.value as SqlDialect,
      open,
    };
    try {
      localStorage.setItem(DIFF_STATE_KEY, JSON.stringify(state));
    } catch {
      // Diff work remains available for this tab when storage is unavailable.
    }
  }

  function render(): void {
    const hunks = diffFormatted(originalEditor.value, modifiedEditor.value);
    const rows = toDiffRows(hunks);
    const changedLines = hunks
      .filter((hunk) => hunk.type !== "equal")
      .reduce((count, hunk) => count + hunk.lines.length, 0);
    const removedLines = rows.filter((row) => row.kind === "removed" || row.kind === "changed").length;
    const addedLines = rows.filter((row) => row.kind === "added" || row.kind === "changed").length;
    diffSummary.textContent = changedLines === 0 ? "No changes" : `${removedLines} removal${removedLines === 1 ? "" : "s"} · ${addedLines} addition${addedLines === 1 ? "" : "s"}`;
    diffResult.replaceChildren();
    const header = document.createElement("div");
    header.className = "diff-result-header";
    header.innerHTML = `
      <div class="diff-result-side diff-result-side-left"><span>− ${removedLines} removal${removedLines === 1 ? "" : "s"}</span><span>${originalEditor.value ? `${originalEditor.value.split("\n").length} lines` : "0 lines"}</span></div>
      <div class="diff-result-side diff-result-side-right"><span>＋ ${addedLines} addition${addedLines === 1 ? "" : "s"}</span><span>${modifiedEditor.value ? `${modifiedEditor.value.split("\n").length} lines` : "0 lines"}</span></div>
    `;
    diffResult.append(header);
    for (const row of rows) {
      const line = document.createElement("div");
      line.className = `diff-line diff-line-${row.kind}`;
      for (const side of ["left", "right"] as const) {
        const cell = document.createElement("span");
        cell.className = `diff-cell diff-cell-${side}`;
        const number = document.createElement("span");
        number.className = "diff-line-number";
        number.textContent = row[`${side}Number`] === null ? "" : String(row[`${side}Number`]);
        const text = document.createElement("span");
        text.className = "diff-line-text";
        text.textContent = row[side];
        cell.append(number, text);
        line.append(cell);
      }
      diffResult.append(line);
    }
  }

  function formatTextarea(textarea: HTMLTextAreaElement): void {
    textarea.value = formatDiffInput(
      textarea.value,
      languageSelect.value as DiffLanguage,
      dialectSelect.value as SqlDialect,
    );
    render();
    persist(!checkerSection.hidden);
  }

  function setOpen(open: boolean, save = true): void {
    const nextOpen = open && options.isDesktop();
    checkerSection.hidden = !nextOpen;
    openButton.setAttribute("aria-pressed", String(nextOpen));
    openButton.setAttribute("aria-label", nextOpen ? "Close diff checker" : "Open diff checker");
    document.getElementById("main")?.classList.toggle("diff-mode", nextOpen);
    options.onOpenChange?.(nextOpen);
    if (save) persist(nextOpen);
    if (nextOpen) originalEditor.focus();
  }

  openButton.addEventListener("click", () => setOpen(checkerSection.hidden));
  dismissButton.addEventListener("click", () => setOpen(false));
  for (const textarea of [originalEditor, modifiedEditor]) {
    textarea.addEventListener("input", () => {
      render();
      persist(!checkerSection.hidden);
    });
    textarea.addEventListener("paste", () => requestAnimationFrame(() => formatTextarea(textarea)));
  }
  languageSelect.addEventListener("change", () => {
    formatTextarea(originalEditor);
    formatTextarea(modifiedEditor);
    dialectSelect.hidden = languageSelect.value !== "sql";
    dialectSelect.previousElementSibling?.toggleAttribute("hidden", languageSelect.value !== "sql");
    persist(!checkerSection.hidden);
  });
  dialectSelect.addEventListener("change", () => {
    formatTextarea(originalEditor);
    formatTextarea(modifiedEditor);
    persist(!checkerSection.hidden);
  });
  dialectSelect.hidden = languageSelect.value !== "sql";
  dialectSelect.previousElementSibling?.toggleAttribute("hidden", languageSelect.value !== "sql");
  render();
  setOpen(storedState?.open ?? false, false);
  window.addEventListener("resize", () => {
    if (!options.isDesktop() && !checkerSection.hidden) setOpen(false);
  });
}
