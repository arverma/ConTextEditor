import { describe, expect, it } from "vitest";
import { derivePreview, deriveTitle } from "../src/editor/storage";

describe("note titles", () => {
  it("shows the first line without Markdown syntax", () => {
    expect(deriveTitle("> **Hello** *today*")).toBe("Hello today");
    expect(deriveTitle("## A [link](https://x.y) and `code`")).toBe("A link and code");
    expect(deriveTitle("- [x] ~~done~~ __task__")).toBe("done task");
    expect(deriveTitle("1. ![logo](a.png) <b>Bold</b>")).toBe("logo Bold");
  });

  it("keeps ordinary punctuation and intraword underscores", () => {
    expect(deriveTitle("snake_case_name * 2")).toBe("snake_case_name * 2");
    expect(deriveTitle("\\*literal\\*")).toBe("*literal*");
  });

  it("falls back to Untitled when the first line has no text", () => {
    expect(deriveTitle("")).toBe("Untitled");
    expect(deriveTitle("**")).toBe("**");
    expect(deriveTitle(">")).toBe("Untitled");
  });

  it("previews the next line with text, without Markdown syntax", () => {
    expect(derivePreview("Title\n\n> *quoted* line")).toBe("quoted line");
    expect(derivePreview("Title\n>\n")).toBe("");
  });
});
