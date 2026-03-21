import React from "react";
import { Note } from "../schema";
import { PendingNote } from "../util/data";

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

const motionStatusLabel: Record<string, string> = {
  proposed: "Proposed",
  under_discussion: "Under Discussion",
  passed: "Passed",
  failed: "Failed",
  tabled: "Tabled",
};

interface NoteDisplayProps {
  note: Note | PendingNote;
}

export const NoteDisplay = ({ note }: NoteDisplayProps) => {
  if (note.type === "text") {
    return (
      <div className="note-text">
        {renderMarkdown(note.text)}
      </div>
    );
  }
  if (note.type === "action_item") {
    return (
      <div className="note-action-item">
        <span className="note-action-checkbox">☐</span>
        {note.assignee?.name && <span className="note-action-assignee">{note.assignee.name}:</span>}
        <span>{note.text}</span>
      </div>
    );
  }
  if (note.type === "motion") {
    const status = note.status;
    return (
      <div className="note-motion">
        <span>
          {note.mover} moves {note.text}.
          {note.seconder && ` Seconded by ${note.seconder}.`}
        </span>
        {" "}
        <span className={`motion-status motion-status-${status}`}>
          Status: {motionStatusLabel[status] ?? status}
        </span>
      </div>
    );
  }
  return null;
};
