import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/theme/colors";

const TOKEN_REGEX =
  /(\/\/.*$|#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|export|from|default|const|let|var|function|return|if|else|for|while|switch|case|break|async|await|try|catch|throw|new|class|extends|interface|type|enum|true|false|null|undefined|SELECT|FROM|WHERE|CREATE|TABLE|INSERT|UPDATE|DELETE|ALTER|PRIMARY|KEY|NOT|NULL)\b|\b\d+(?:\.\d+)?\b)/gm;

function colorizeLine(line: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(TOKEN_REGEX.source, "gm");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    let color = COLORS.fg;
    let fontStyle: "normal" | "italic" = "normal";

    if (token.startsWith("//") || token.startsWith("#")) {
      color = "#71717A";
      fontStyle = "italic";
    } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
      color = "#4ADE80";
    } else if (/^\d/.test(token)) {
      color = "#F59E0B";
    } else {
      color = "#C084FC";
    }

    nodes.push(
      <Text key={`t-${match.index}`} style={{ color, fontStyle }}>
        {token}
      </Text>
    );
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : " ";
}

export function CodeViewer({ content }: { content: string }) {
  const lines = content.split("\n").slice(0, 400);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={styles.wrapper}>
      <View style={styles.inner}>
        {lines.map((line, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.lineNum}>{idx + 1}</Text>
            <Text style={styles.codeText}>{colorizeLine(line)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#09090B",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  inner: { gap: 2, paddingRight: 16 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  lineNum: {
    width: 32,
    textAlign: "right",
    color: "#52525B",
    fontSize: 11,
    fontFamily: "monospace",
    lineHeight: 17,
  },
  codeText: {
    color: "#E4E4E7",
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 17,
  },
});
