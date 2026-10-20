import { diffLines } from "diff";
import { format as formatSql, type SqlLanguage } from "sql-formatter";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export type SqlDialect =
  | "trino"
  | "sql"
  | "postgresql"
  | "mysql"
  | "mariadb"
  | "bigquery"
  | "snowflake"
  | "spark"
  | "hive"
  | "transactsql"
  | "plsql"
  | "redshift"
  | "db2"
  | "db2i"
  | "sqlite"
  | "clickhouse"
  | "tidb"
  | "singlestoredb"
  | "n1ql";
export type DiffLanguage = "auto" | "json" | "yaml" | "sql" | "text" | `sql:${SqlDialect}`;
export type DiffHunkType = "equal" | "remove" | "add";
export const DIFF_STATE_KEY = "context-editor.diffChecker";

export const SQL_DIALECTS: ReadonlyArray<{ label: string; value: SqlDialect }> = [
  { label: "Trino / Presto", value: "trino" },
  { label: "Standard SQL", value: "sql" },
  { label: "PostgreSQL", value: "postgresql" },
  { label: "MySQL", value: "mysql" },
  { label: "MariaDB", value: "mariadb" },
  { label: "BigQuery", value: "bigquery" },
  { label: "Snowflake", value: "snowflake" },
  { label: "Spark SQL", value: "spark" },
  { label: "Apache Hive", value: "hive" },
  { label: "SQL Server / T-SQL", value: "transactsql" },
  { label: "Oracle PL/SQL", value: "plsql" },
  { label: "Amazon Redshift", value: "redshift" },
  { label: "IBM DB2", value: "db2" },
  { label: "IBM DB2i", value: "db2i" },
  { label: "SQLite", value: "sqlite" },
  { label: "ClickHouse", value: "clickhouse" },
  { label: "TiDB", value: "tidb" },
  { label: "SingleStoreDB", value: "singlestoredb" },
  { label: "Couchbase N1QL", value: "n1ql" },
];

export const FORMAT_OPTIONS: ReadonlyArray<{ label: string; value: DiffLanguage }> = [
  { label: "Auto Format", value: "auto" },
  { label: "JSON", value: "json" },
  { label: "YAML", value: "yaml" },
  { label: "PostgreSQL", value: "sql:postgresql" },
  { label: "MySQL", value: "sql:mysql" },
  { label: "SQL Server / T-SQL", value: "sql:transactsql" },
  { label: "SQLite", value: "sql:sqlite" },
  { label: "MariaDB", value: "sql:mariadb" },
  { label: "BigQuery", value: "sql:bigquery" },
  { label: "Snowflake", value: "sql:snowflake" },
  { label: "Trino / Presto", value: "sql:trino" },
  { label: "Standard SQL", value: "sql" },
  { label: "Amazon Redshift", value: "sql:redshift" },
  { label: "Spark SQL", value: "sql:spark" },
  { label: "Apache Hive", value: "sql:hive" },
  { label: "ClickHouse", value: "sql:clickhouse" },
  { label: "TiDB", value: "sql:tidb" },
  { label: "SingleStoreDB", value: "sql:singlestoredb" },
  { label: "Oracle PL/SQL", value: "sql:plsql" },
  { label: "IBM DB2", value: "sql:db2" },
  { label: "IBM DB2i", value: "sql:db2i" },
  { label: "Couchbase N1QL", value: "sql:n1ql" },
  { label: "Plain text", value: "text" },
];

export function isSqlDiffLanguage(language: DiffLanguage): boolean {
  return language === "sql" || language.startsWith("sql:");
}

export function detectDiffLanguage(raw: string): DiffLanguage {
  const value = raw.trim();
  if (!value) return "text";

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && typeof parsed === "object") return "json";
  } catch {
    // Continue with YAML and SQL detection.
  }

  if (/^(?:---\s*$|[-\w"'][^:\n]*:\s*.+$|[-*]\s+\S)/m.test(value)) {
    try {
      const parsed: unknown = parseYaml(value);
      if (parsed !== null && typeof parsed === "object") return "yaml";
    } catch {
      // Continue with SQL detection.
    }
  }

  if (/^(?:with\b|select\b|insert\s+into\b|update\b|delete\s+from\b|create\s+(?:table|view|index)\b|alter\s+table\b|drop\s+(?:table|view|index)\b|merge\s+into\b|begin\b|commit\b|rollback\b)/i.test(value)) {
    return "sql:postgresql";
  }

  return "text";
}

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

export type DiffPane = "left" | "right";
export interface DiffPaneRow {
  line: string;
  number: number | null;
  kind: DiffRow["kind"];
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
      !FORMAT_OPTIONS.some(({ value }) => value === state.language) ||
      !SQL_DIALECTS.some(({ value }) => value === state.dialect) ||
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
  if (!raw.trim() || language === "auto" || language === "text") return raw;

  try {
    if (language === "json") return JSON.stringify(JSON.parse(raw), null, 2);
    if (language === "yaml") return stringifyYaml(parseYaml(raw));
    const selectedDialect = language.startsWith("sql:") ? language.slice(4) as SqlDialect : dialect;
    return formatSql(raw, {
      language: selectedDialect as SqlLanguage,
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

export function toDiffPaneRows(rows: DiffRow[], pane: DiffPane): DiffPaneRow[] {
  return rows.map((row) => ({
    line: row[pane],
    number: row[`${pane}Number`],
    kind: row.kind,
  }));
}

export function initDiffChecker(options: {
  isDesktop: () => boolean;
  onOpenChange?: (open: boolean) => void;
}): void {
  const button = document.getElementById("diff-checker-btn") as HTMLButtonElement | null;
  const formatButton = document.getElementById("diff-checker-format") as HTMLButtonElement | null;
  const section = document.getElementById("diff-checker");
  const language = document.getElementById("diff-language") as HTMLSelectElement | null;
  const dialect = document.getElementById("diff-sql-dialect") as HTMLSelectElement | null;
  const original = document.getElementById("diff-original") as HTMLTextAreaElement | null;
  const modified = document.getElementById("diff-modified") as HTMLTextAreaElement | null;
  const summary = document.getElementById("diff-summary");
  const leftDisplay = document.getElementById("diff-left-display");
  const rightDisplay = document.getElementById("diff-right-display");
  if (!button || !formatButton || !section || !language || !dialect || !original || !modified || !summary || !leftDisplay || !rightDisplay) return;
  const checkerSection = section;
  const openButton = button;
  const languageSelect = language;
  const dialectSelect = dialect;
  const originalEditor = original;
  const modifiedEditor = modified;
  const diffSummary = summary;
  const leftDiffDisplay = leftDisplay;
  const rightDiffDisplay = rightDisplay;
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
    for (const pane of ["left", "right"] as const) {
      const display = pane === "left" ? leftDiffDisplay : rightDiffDisplay;
      display.replaceChildren();
      for (const paneRow of toDiffPaneRows(rows, pane)) {
        const line = document.createElement("div");
        line.className = `diff-line diff-line-${paneRow.kind}`;
        const number = document.createElement("span");
        number.className = "diff-line-number";
        number.textContent = paneRow.number === null ? "" : String(paneRow.number);
        const text = document.createElement("span");
        text.className = "diff-line-text";
        text.textContent = paneRow.line;
        line.append(number, text);
        display.append(line);
      }
    }
  }

  function formatTextarea(textarea: HTMLTextAreaElement, selectedLanguage = languageSelect.value as DiffLanguage): void {
    textarea.value = formatDiffInput(
      textarea.value,
      selectedLanguage,
      dialectSelect.value as SqlDialect,
    );
    render();
    persist(!checkerSection.hidden);
  }

  function formatBoth(): void {
    const selectedLanguage = languageSelect.value as DiffLanguage;
    const detectedLanguage = selectedLanguage === "auto"
      ? detectDiffLanguage(originalEditor.value.trim() ? originalEditor.value : modifiedEditor.value)
      : selectedLanguage;
    if (selectedLanguage === "auto") languageSelect.value = detectedLanguage;
    formatTextarea(originalEditor, detectedLanguage);
    formatTextarea(modifiedEditor, detectedLanguage);
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
  formatButton.addEventListener("click", formatBoth);
  for (const textarea of [originalEditor, modifiedEditor]) {
    textarea.addEventListener("input", () => {
      render();
      persist(!checkerSection.hidden);
    });
    textarea.addEventListener("paste", () => requestAnimationFrame(() => formatTextarea(textarea)));
  }
  originalEditor.addEventListener("scroll", () => {
    leftDiffDisplay.style.transform = `translate(${-originalEditor.scrollLeft}px, ${-originalEditor.scrollTop}px)`;
  });
  modifiedEditor.addEventListener("scroll", () => {
    rightDiffDisplay.style.transform = `translate(${-modifiedEditor.scrollLeft}px, ${-modifiedEditor.scrollTop}px)`;
  });
  languageSelect.addEventListener("change", () => {
    formatTextarea(originalEditor);
    formatTextarea(modifiedEditor);
    dialectSelect.hidden = true;
    persist(!checkerSection.hidden);
  });
  dialectSelect.addEventListener("change", () => {
    formatTextarea(originalEditor);
    formatTextarea(modifiedEditor);
    persist(!checkerSection.hidden);
  });
  dialectSelect.hidden = true;
  render();
  setOpen(storedState?.open ?? false, false);
  window.addEventListener("resize", () => {
    if (!options.isDesktop() && !checkerSection.hidden) setOpen(false);
  });
}
