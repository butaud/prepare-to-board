import React from "react";

type ReactNode = React.ReactNode;

export type InlineMarkdownToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "link"; text: string; url: string };

// Splits a single line into inline tokens for **bold**, *italic*, _italic_,
// and [text](url). Shared by the on-screen renderer and the Word export so
// both interpret note text identically.
export function parseInlineMarkdown(text: string): InlineMarkdownToken[] {
  const tokens: InlineMarkdownToken[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Try bold: **text**
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*(.+?)\*\*/);
    // Try italic: *text* (not **)
    const italicStarMatch = remaining.match(/^([\s\S]*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Try italic: _text_
    const italicUnderMatch = remaining.match(/^([\s\S]*?)_(.+?)_/);
    // Try link: [text](url)
    const linkMatch = remaining.match(/^([\s\S]*?)\[(.+?)\]\((https?:\/\/[^)]+)\)/);

    const candidates: Array<{ prefixLen: number; type: string; match: RegExpMatchArray }> = [];
    if (boldMatch) candidates.push({ prefixLen: boldMatch[1].length, type: "bold", match: boldMatch });
    if (italicStarMatch) candidates.push({ prefixLen: italicStarMatch[1].length, type: "italic-star", match: italicStarMatch });
    if (italicUnderMatch) candidates.push({ prefixLen: italicUnderMatch[1].length, type: "italic-under", match: italicUnderMatch });
    if (linkMatch) candidates.push({ prefixLen: linkMatch[1].length, type: "link", match: linkMatch });

    if (candidates.length === 0) {
      tokens.push({ type: "text", text: remaining });
      break;
    }

    candidates.sort((a, b) => a.prefixLen - b.prefixLen);
    const winner = candidates[0];
    const { prefixLen, type, match } = winner;

    if (prefixLen > 0) {
      tokens.push({ type: "text", text: match[1] });
    }

    if (type === "bold") {
      tokens.push({ type: "bold", text: match[2] });
      remaining = remaining.slice(prefixLen + match[2].length + 4);
    } else if (type === "italic-star") {
      tokens.push({ type: "italic", text: match[2] });
      remaining = remaining.slice(prefixLen + match[2].length + 2);
    } else if (type === "italic-under") {
      tokens.push({ type: "italic", text: match[2] });
      remaining = remaining.slice(prefixLen + match[2].length + 2);
    } else if (type === "link") {
      const url = match[3];
      const linkText = match[2];
      tokens.push({ type: "link", text: linkText, url });
      remaining = remaining.slice(prefixLen + 1 + linkText.length + 2 + url.length + 1);
    }
  }

  return tokens;
}

export function renderMarkdown(text: string): ReactNode[] {
  return parseInlineMarkdown(text).map((token, keyIdx) => {
    switch (token.type) {
      case "text":
        return token.text;
      case "bold":
        return <strong key={keyIdx}>{token.text}</strong>;
      case "italic":
        return <em key={keyIdx}>{token.text}</em>;
      case "link":
        return (
          <a key={keyIdx} href={token.url} target="_blank" rel="noopener noreferrer">
            {token.text}
          </a>
        );
    }
  });
}

const bulletListItemPattern = /^\s*[-*]\s+(.+)$/;

export type MarkdownBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] };

/**
 * Splits multi-line markdown text into blocks: consecutive lines starting
 * with "- " or "* " become a bulleted list, blank lines separate blocks,
 * and other consecutive lines are grouped into a paragraph (one entry per
 * line, so callers can put line breaks between them). Not a full markdown
 * parser — just enough structure for prep notes. Shared by the on-screen
 * renderer and the Word export.
 */
export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({ type: "paragraph", lines: paragraphLines });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: "list", items: listItems });
    listItems = [];
  };

  for (const line of text.split("\n")) {
    const listMatch = line.match(bulletListItemPattern);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
    } else if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushList();

  return blocks;
}

/**
 * Renders multi-line markdown text (see parseMarkdownBlocks), with each
 * line's inline styles handled by renderMarkdown.
 */
export function renderMarkdownBlocks(text: string): ReactNode[] {
  return parseMarkdownBlocks(text).map((block, blockKey) =>
    block.type === "paragraph" ? (
      <p key={`p-${blockKey}`}>
        {block.lines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {renderMarkdown(line)}
          </React.Fragment>
        ))}
      </p>
    ) : (
      <ul key={`ul-${blockKey}`}>
        {block.items.map((item, i) => (
          <li key={i}>{renderMarkdown(item)}</li>
        ))}
      </ul>
    )
  );
}
