"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { isSafeUrl, normalizeStreamingMarkdown } from "@/lib/markdown/streaming";

const KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|type|interface|class|extends|new|try|catch|throw|default|switch|case|break|true|false|null|undefined)\b/g;

function highlightCodeLine(line: string, keyPrefix: string): React.ReactNode {
  const commentIdx = line.indexOf("//");
  const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : "";

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(KEYWORDS.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(codePart)) !== null) {
    if (match.index > lastIndex) {
      parts.push(codePart.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={`${keyPrefix}-kw-${match.index}`} className="text-[#C084FC]">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < codePart.length) {
    parts.push(codePart.slice(lastIndex));
  }
  if (commentPart) {
    parts.push(
      <span key={`${keyPrefix}-cmt`} className="text-zinc-500 italic">
        {commentPart}
      </span>
    );
  }
  return parts.length > 0 ? parts : " ";
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable
    }
  }

  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[#09090B]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[#141418] px-3 py-1.5 text-[11px] text-[var(--fg-muted)]">
        <span className="font-mono uppercase tracking-wider">{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-[var(--fg)] cursor-pointer"
        >
          {copied ? <Check className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-xs font-mono leading-relaxed text-zinc-200">
        <code>
          {lines.map((line, i) => (
            <div key={i}>{highlightCodeLine(line, `l-${i}`)}</div>
          ))}
        </code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const normalized = normalizeStreamingMarkdown(content, isStreaming);

  return (
    <div className="text-[13px] leading-[1.65] text-[var(--fg)] space-y-2.5 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 text-lg font-semibold tracking-tight text-[var(--fg)] border-b border-[var(--border)] pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3.5 mb-1.5 text-base font-semibold tracking-tight text-[var(--fg)]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1 text-sm font-semibold text-[var(--fg)]">{children}</h3>
          ),
          p: ({ children }) => <p className="my-1.5 leading-[1.65]">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-2 ml-5 list-disc space-y-1 marker:text-[#8B5CF6]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-5 list-decimal space-y-1 marker:text-[#06B6D4]">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1 leading-[1.6]">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 border-l-2 border-[#8B5CF6] bg-[#8B5CF6]/5 pl-3.5 py-1.5 pr-2 rounded-r-lg text-[var(--fg-muted)] italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) =>
            isSafeUrl(href) ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#06B6D4] underline decoration-[#06B6D4]/40 underline-offset-2 hover:decoration-[#06B6D4]"
              >
                {children}
              </a>
            ) : (
              <span className="text-[var(--fg-muted)]">{children}</span>
            ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const text = String(children ?? "");
            const isBlock = Boolean(match) || text.includes("\n");
            if (isBlock) {
              return <CodeBlock language={match?.[1]} code={text} />;
            }
            return (
              <code
                className="rounded bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 font-mono text-[12px] text-[#06B6D4]"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--surface-2)] text-[var(--fg)] border-b border-[var(--border)]">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
          td: ({ children }) => (
            <td className="px-3 py-2 border-t border-[var(--border)] text-[var(--fg-muted)]">
              {children}
            </td>
          ),
          hr: () => <hr className="my-3 border-[var(--border)]" />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
