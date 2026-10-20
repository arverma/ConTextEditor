import { describe, expect, it } from "vitest";
import {
  diffFormatted,
  formatDiffInput,
  parseDiffState,
  toDiffRows,
  type DiffState,
} from "../src/editor/diff-checker";

describe("diff checker formatting", () => {
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
