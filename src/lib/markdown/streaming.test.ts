import { describe, expect, it } from "vitest";
import { isSafeUrl, normalizeStreamingMarkdown } from "./streaming";
import { parseInlineTokens, parseMarkdownBlocks } from "../../../mobile/src/lib/markdown-parser";

describe("Rich Text Markdown & Streaming Sanitizer", () => {
  it("closes unclosed fenced code blocks during streaming", () => {
    const partial = "Here is code:\n```ts\nconst x = 1;";
    const normalized = normalizeStreamingMarkdown(partial, true);
    expect(normalized.endsWith("\n```")).toBe(true);
  });

  it("closes unclosed bold or inline code markers on the last line during streaming", () => {
    expect(normalizeStreamingMarkdown("This is **bold", true)).toBe("This is **bold**");
    expect(normalizeStreamingMarkdown("Use `npm run", true)).toBe("Use `npm run`");
  });

  it("blocks javascript: and data: URLs against XSS", () => {
    expect(isSafeUrl("https://remotechat.ai")).toBe(true);
    expect(isSafeUrl("mailto:team@remotechat.ai")).toBe(true);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("parses headings, lists, blockquotes, code blocks, and tables into structured blocks", () => {
    const md = [
      "# Title",
      "## Subtitle",
      "- Item A",
      "- Item B",
      "1. First",
      "> Note here",
      "| Col1 | Col2 |",
      "| --- | --- |",
      "| Val1 | Val2 |",
      "```ts",
      "const a = 1;",
      "```",
    ].join("\n");

    const blocks = parseMarkdownBlocks(md);
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "heading",
      "list",
      "list",
      "blockquote",
      "table",
      "code",
    ]);
  });

  it("parses inline bold, italic, code, and links without leaving raw syntax", () => {
    const tokens = parseInlineTokens("Hello **world**, *italic*, `code`, [docs](https://example.com)");
    expect(tokens.some((t) => t.type === "bold" && t.value === "world")).toBe(true);
    expect(tokens.some((t) => t.type === "italic" && t.value === "italic")).toBe(true);
    expect(tokens.some((t) => t.type === "code" && t.value === "code")).toBe(true);
    expect(tokens.some((t) => t.type === "link" && t.label === "docs")).toBe(true);
  });
});
