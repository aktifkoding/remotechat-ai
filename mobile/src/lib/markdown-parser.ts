export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; url: string };

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "code"; language: string; code: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" }
  | { type: "paragraph"; text: string };

export function isSafeUrl(href?: string | null): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  return /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed);
}

export function normalizeStreamingMarkdown(raw: string, isStreaming = false): string {
  if (!raw) return "";
  let text = raw.replace(/\r\n/g, "\n");
  if (!isStreaming) return text;

  const fenceMatches = text.match(/^```/gm);
  if (fenceMatches && fenceMatches.length % 2 === 1) {
    return `${text}\n\`\`\``;
  }

  const lines = text.split("\n");
  const lastIdx = lines.length - 1;
  const lastLine = lines[lastIdx] ?? "";
  if ((lastLine.match(/`/g) ?? []).length % 2 === 1) {
    lines[lastIdx] = `${lastLine}\``;
  } else if ((lastLine.match(/\*\*/g) ?? []).length % 2 === 1) {
    lines[lastIdx] = `${lastLine}**`;
  }
  return lines.join("\n");
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line.trim());
}

export function parseMarkdownBlocks(raw: string, isStreaming = false): MarkdownBlock[] {
  const text = normalizeStreamingMarkdown(raw, isStreaming);
  const lines = text.split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block
    const fenceMatch = trimmed.match(/^```(\w*)/);
    if (fenceMatch) {
      const language = fenceMatch[1] || "code";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // skip closing ```
      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    // Heading H1-H3 (also map H4-H6 to H3)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: headingMatch[2] });
      i += 1;
      continue;
    }

    // Table
    if (trimmed.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes("|") && !lines[i].trim().startsWith("```")) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur.startsWith("```") ||
        /^#{1,6}\s+/.test(cur) ||
        cur.startsWith(">") ||
        /^[-*+]\s+/.test(cur) ||
        /^\d+\.\s+/.test(cur) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(cur)
      ) {
        break;
      }
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

export function parseInlineTokens(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ type: "text", value: input.slice(lastIdx, match.index) });
    }
    if (match[2] !== undefined && match[3] !== undefined) {
      tokens.push({ type: "link", label: match[2], url: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ type: "code", value: match[4] });
    } else if (match[5] !== undefined || match[6] !== undefined) {
      tokens.push({ type: "bold", value: match[5] ?? match[6] });
    } else if (match[7] !== undefined || match[8] !== undefined) {
      tokens.push({ type: "italic", value: match[7] ?? match[8] });
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < input.length) {
    tokens.push({ type: "text", value: input.slice(lastIdx) });
  }

  return tokens;
}
