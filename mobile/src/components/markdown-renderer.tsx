import React from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  isSafeUrl,
  parseInlineTokens,
  parseMarkdownBlocks,
} from "@/lib/markdown-parser";
import { COLORS } from "@/theme/colors";

function InlineText({
  text,
  baseStyle,
}: {
  text: string;
  baseStyle?: object;
}) {
  const tokens = parseInlineTokens(text);

  return (
    <Text style={[styles.paragraph, baseStyle]}>
      {tokens.map((tok, idx) => {
        if (tok.type === "bold") {
          return (
            <Text key={idx} style={styles.bold}>
              {tok.value}
            </Text>
          );
        }
        if (tok.type === "italic") {
          return (
            <Text key={idx} style={styles.italic}>
              {tok.value}
            </Text>
          );
        }
        if (tok.type === "code") {
          return (
            <Text key={idx} style={styles.inlineCode}>
              {` ${tok.value} `}
            </Text>
          );
        }
        if (tok.type === "link") {
          if (isSafeUrl(tok.url)) {
            return (
              <Text
                key={idx}
                style={styles.link}
                onPress={() => Linking.openURL(tok.url)}
              >
                {tok.label}
              </Text>
            );
          }
          return <Text key={idx}>{tok.label}</Text>;
        }
        return <Text key={idx}>{tok.value}</Text>;
      })}
    </Text>
  );
}

const CODE_KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|type|interface|class|new|try|catch|true|false|null|undefined)\b/g;

function HighlightedCodeLine({ line }: { line: string }) {
  const commentIdx = line.indexOf("//");
  const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : "";

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(CODE_KEYWORDS.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(codePart)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(codePart.slice(lastIndex, match.index));
    }
    nodes.push(
      <Text key={`kw-${match.index}`} style={{ color: "#C084FC" }}>
        {match[0]}
      </Text>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < codePart.length) {
    nodes.push(codePart.slice(lastIndex));
  }
  if (commentPart) {
    nodes.push(
      <Text key="cmt" style={{ color: "#71717A", fontStyle: "italic" }}>
        {commentPart}
      </Text>
    );
  }
  return <Text style={styles.codeLine}>{nodes.length > 0 ? nodes : " "}</Text>;
}

export function MobileMarkdownRenderer({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const blocks = parseMarkdownBlocks(content, isStreaming);

  return (
    <View style={styles.root}>
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          const hStyle =
            block.level === 1
              ? styles.h1
              : block.level === 2
              ? styles.h2
              : styles.h3;
          return <InlineText key={idx} text={block.text} baseStyle={hStyle} />;
        }

        if (block.type === "paragraph") {
          return <InlineText key={idx} text={block.text} />;
        }

        if (block.type === "blockquote") {
          return (
            <View key={idx} style={styles.blockquote}>
              <InlineText text={block.text} baseStyle={styles.blockquoteText} />
            </View>
          );
        }

        if (block.type === "list") {
          return (
            <View key={idx} style={styles.list}>
              {block.items.map((item, itemIdx) => (
                <View key={itemIdx} style={styles.listRow}>
                  <Text style={styles.listMarker}>
                    {block.ordered ? `${itemIdx + 1}.` : "•"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <InlineText text={item} />
                  </View>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === "code") {
          const codeLines = block.code.split("\n");
          return (
            <View key={idx} style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeLang}>{block.language.toUpperCase()}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.codeBody}>
                  {codeLines.map((line, lIdx) => (
                    <HighlightedCodeLine key={lIdx} line={line} />
                  ))}
                </View>
              </ScrollView>
            </View>
          );
        }

        if (block.type === "table") {
          return (
            <ScrollView
              key={idx}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tableScroll}
            >
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  {block.headers.map((h, hIdx) => (
                    <Text key={hIdx} style={styles.tableHeaderCell}>
                      {h}
                    </Text>
                  ))}
                </View>
                {block.rows.map((row, rIdx) => (
                  <View key={rIdx} style={styles.tableRow}>
                    {row.map((cell, cIdx) => (
                      <Text key={cIdx} style={styles.tableCell}>
                        {cell}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }

        if (block.type === "hr") {
          return <View key={idx} style={styles.hr} />;
        }

        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  paragraph: { color: COLORS.fg, fontSize: 13.5, lineHeight: 21 },
  bold: { fontWeight: "700", color: "#FFFFFF" },
  italic: { fontStyle: "italic", color: "#D4D4D8" },
  inlineCode: {
    fontFamily: "monospace",
    fontSize: 12,
    color: COLORS.accent,
    backgroundColor: COLORS.surface2,
  },
  link: { color: COLORS.accent, textDecorationLine: "underline" },
  h1: { fontSize: 17, fontWeight: "700", color: "#FFFFFF", marginTop: 6, lineHeight: 24 },
  h2: { fontSize: 15.5, fontWeight: "700", color: "#FFFFFF", marginTop: 4, lineHeight: 22 },
  h3: { fontSize: 14, fontWeight: "700", color: "#E4E4E7", marginTop: 2, lineHeight: 20 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    backgroundColor: "rgba(139,92,246,0.08)",
    paddingLeft: 10,
    paddingVertical: 6,
    paddingRight: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  blockquoteText: { color: COLORS.fgMuted, fontStyle: "italic" },
  list: { gap: 4, paddingLeft: 4 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  listMarker: { color: COLORS.primary, fontSize: 13.5, lineHeight: 21, fontWeight: "700" },
  codeCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#09090B",
    overflow: "hidden",
    marginVertical: 4,
  },
  codeHeader: {
    backgroundColor: "#141418",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  codeLang: { color: COLORS.fgMuted, fontSize: 10, fontFamily: "monospace", fontWeight: "600" },
  codeBody: { padding: 10, gap: 2 },
  codeLine: { color: "#E4E4E7", fontSize: 12, fontFamily: "monospace", lineHeight: 18 },
  tableScroll: { marginVertical: 4 },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    color: COLORS.fg,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 110,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableCell: {
    color: COLORS.fgMuted,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 110,
  },
  hr: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
});
