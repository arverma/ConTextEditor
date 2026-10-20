import { describe, expect, it } from "vitest";
import {
  diffFormatted,
  formatDiffInput,
  FORMAT_OPTIONS,
  detectDiffLanguage,
  isSqlDiffLanguage,
  parseDiffState,
  SQL_DIALECTS,
  toDiffPaneRows,
  toDiffRows,
  type DiffState,
} from "../src/editor/diff-checker";

describe("diff checker formatting", () => {
  it("detects JSON, YAML, and SQL content for Auto Format", () => {
    expect(detectDiffLanguage('{"name":"ConText"}')).toBe("json");
    expect(detectDiffLanguage("name: ConText\nenabled: true")).toBe("yaml");
    expect(detectDiffLanguage("select id from users")).toBe("sql:postgresql");
  });

  it("returns plain text when Auto Format cannot identify structured content", () => {
    expect(detectDiffLanguage("A sentence that is not structured data.")).toBe("text");
  });

  it("orders format options for discovery", () => {
    expect(FORMAT_OPTIONS.slice(0, 5).map((option) => option.value)).toEqual([
      "auto",
      "json",
      "yaml",
      "sql:postgresql",
      "sql:mysql",
    ]);
  });

  it("recognizes only SQL format selections as SQL", () => {
    expect(isSqlDiffLanguage("sql:postgresql")).toBe(true);
    expect(isSqlDiffLanguage("json")).toBe(false);
    expect(isSqlDiffLanguage("yaml")).toBe(false);
  });

  it("includes every SQL dialect supported by DevToolBoxPro", () => {
    expect(SQL_DIALECTS.map((dialect) => dialect.value)).toEqual([
      "trino",
      "sql",
      "postgresql",
      "mysql",
      "mariadb",
      "bigquery",
      "snowflake",
      "spark",
      "hive",
      "transactsql",
      "plsql",
      "redshift",
      "db2",
      "db2i",
      "sqlite",
      "clickhouse",
      "tidb",
      "singlestoredb",
      "n1ql",
    ]);
  });

  it("pretty prints valid JSON", () => {
    expect(formatDiffInput('{"name":"ConText","enabled":true}', "json", "postgresql")).toBe(
      '{\n  "name": "ConText",\n  "enabled": true\n}',
    );
  });

  it("pretty prints valid YAML", () => {
    expect(formatDiffInput("name: ConText\nenabled: true", "yaml", "postgresql")).toBe(
      "name: ConText\nenabled: true\n",
    );
  });

  it("uses the selected SQL dialect", () => {
    expect(formatDiffInput("select * from users where id=1", "sql", "mysql")).toContain("SELECT");
  });

  it("returns raw text when formatting is not possible", () => {
    const raw = '{"name":';
    expect(formatDiffInput(raw, "json", "postgresql")).toBe(raw);
  });

  it("creates line-level diff hunks", () => {
    expect(diffFormatted("one\ntwo", "one\nthree")).toEqual([
      { type: "equal", lines: ["one"] },
      { type: "remove", lines: ["two"] },
      { type: "add", lines: ["three"] },
    ]);
  });

  it("aligns removed and added lines into two numbered columns", () => {
    expect(toDiffRows(diffFormatted("{\n  \"enabled\": true\n}", "{\n  \"enabled\": false\n}"))).toEqual([
      { left: "{", right: "{", leftNumber: 1, rightNumber: 1, kind: "equal" },
      { left: '  "enabled": true', right: '  "enabled": false', leftNumber: 2, rightNumber: 2, kind: "changed" },
      { left: "}", right: "}", leftNumber: 3, rightNumber: 3, kind: "equal" },
    ]);
  });

  it("projects aligned rows into the two editable panes", () => {
    expect(toDiffPaneRows(toDiffRows(diffFormatted("one\ntwo", "one\nthree")), "left")).toEqual([
      { line: "one", number: 1, kind: "equal" },
      { line: "two", number: 2, kind: "changed" },
    ]);
    expect(toDiffPaneRows(toDiffRows(diffFormatted("one\ntwo", "one\nthree")), "right")).toEqual([
      { line: "one", number: 1, kind: "equal" },
      { line: "three", number: 2, kind: "changed" },
    ]);
  });

  it("restores only the current diff checker state", () => {
    const state: DiffState = {
      original: "one",
      modified: "two",
      language: "text",
      dialect: "postgresql",
      open: true,
    };
    expect(parseDiffState(JSON.stringify(state))).toEqual(state);
  });

  it("ignores malformed or historical diff state", () => {
    expect(parseDiffState('{"history":[{"original":"old"}]}')).toBeNull();
    expect(parseDiffState("{not json")).toBeNull();
  });
});
