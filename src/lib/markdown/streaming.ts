/**
 * Normalizes incomplete Markdown during streaming so unclosed code fences
 * or partial inline markers do not flicker or leak raw syntax.
 */
export function normalizeStreamingMarkdown(raw: string, isStreaming = false): string {
  if (!raw) return "";
  let text = raw.replace(/\r\n/g, "\n");
  if (!isStreaming) return text;

  // Close unclosed fenced code block
  const fenceMatches = text.match(/^```/gm);
  if (fenceMatches && fenceMatches.length % 2 === 1) {
    text += "\n```";
    return text;
  }

  // Close unclosed inline code backtick on the final line
  const lines = text.split("\n");
  const lastIdx = lines.length - 1;
  const lastLine = lines[lastIdx] ?? "";
  const backticks = (lastLine.match(/`/g) ?? []).length;
  if (backticks % 2 === 1) {
    lines[lastIdx] = `${lastLine}\``;
  } else {
    const boldMarkers = (lastLine.match(/\*\*/g) ?? []).length;
    if (boldMarkers % 2 === 1) {
      lines[lastIdx] = `${lastLine}**`;
    }
  }

  return lines.join("\n");
}

/**
 * Validates link URLs to prevent XSS via javascript:, data:, or vbscript: URIs.
 */
export function isSafeUrl(href?: string | null): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}
