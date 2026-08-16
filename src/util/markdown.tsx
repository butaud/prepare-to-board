import React from "react";

type ReactNode = React.ReactNode;

export function renderMarkdown(text: string): ReactNode[] {
  // Parse the string into React nodes handling **bold**, *italic*, _italic_, [text](url)
  const nodes: ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

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
      nodes.push(remaining);
      break;
    }

    candidates.sort((a, b) => a.prefixLen - b.prefixLen);
    const winner = candidates[0];
    const { prefixLen, type, match } = winner;

    if (prefixLen > 0) {
      nodes.push(match[1]);
    }

    if (type === "bold") {
      nodes.push(<strong key={keyIdx++}>{match[2]}</strong>);
      remaining = remaining.slice(prefixLen + match[2].length + 4);
    } else if (type === "italic-star") {
      nodes.push(<em key={keyIdx++}>{match[2]}</em>);
      remaining = remaining.slice(prefixLen + match[2].length + 2);
    } else if (type === "italic-under") {
      nodes.push(<em key={keyIdx++}>{match[2]}</em>);
      remaining = remaining.slice(prefixLen + match[2].length + 2);
    } else if (type === "link") {
      const url = match[3];
      const linkText = match[2];
      nodes.push(
        <a key={keyIdx++} href={url} target="_blank" rel="noopener noreferrer">
          {linkText}
        </a>
      );
      remaining = remaining.slice(prefixLen + 1 + linkText.length + 2 + url.length + 1);
    }
  }

  return nodes;
}

const bulletListItemPattern = /^\s*[-*]\s+(.+)$/;

/**
 * Renders multi-line markdown text, in addition to the inline styles
 * handled by renderMarkdown: consecutive lines starting with "- " or "* "
 * become a bulleted list, blank lines separate blocks, and other
 * consecutive lines are joined into a paragraph with line breaks between
 * them. Not a full markdown parser — just enough structure for prep notes.
 */
export function renderMarkdownBlocks(text: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let blockKey = 0;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push(
      <p key={`p-${blockKey++}`}>
        {paragraphLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {renderMarkdown(line)}
          </React.Fragment>
        ))}
      </p>
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blockKey++}`}>
        {listItems.map((item, i) => (
          <li key={i}>{renderMarkdown(item)}</li>
        ))}
      </ul>
    );
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
