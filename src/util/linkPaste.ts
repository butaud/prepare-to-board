import type { ClipboardEvent } from "react";

const isSafeHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const sanitizeLinkText = (text: string): string =>
  text
    .replace(/[[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Block-level elements introduce a line break so paragraph/list structure
// survives being flattened to plain text; everything else (inline elements
// like <b>/<span>) just contributes its own children in place.
const BLOCK_TAGS = new Set(["P", "DIV", "LI", "BR", "TR", "H1", "H2", "H3", "H4"]);

type FlattenResult = { text: string; hasLink: boolean };

// Walks a parsed HTML fragment, converting every anchor it finds into
// [text](url) markdown in place while passing everything else through as
// plain text - so a link embedded in a sentence or paragraph gets
// linkified without losing the surrounding words. Anchors with an unsafe
// or missing href fall back to their own plain text instead of being
// dropped.
const flattenNodeToMarkdown = (node: Node): FlattenResult => {
  if (node.nodeType === Node.TEXT_NODE) {
    return { text: (node.textContent ?? "").replace(/[[\]]/g, ""), hasLink: false };
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return { text: "", hasLink: false };
  }
  const element = node as Element;
  if (element.tagName === "A") {
    const href = element.getAttribute("href");
    const text = sanitizeLinkText(element.textContent ?? "");
    if (href && text && isSafeHttpUrl(href)) {
      return { text: `[${text}](${href})`, hasLink: true };
    }
    return { text: sanitizeLinkText(element.textContent ?? ""), hasLink: false };
  }
  const children = Array.from(element.childNodes).reduce<FlattenResult>(
    (acc, child) => {
      const childResult = flattenNodeToMarkdown(child);
      return {
        text: acc.text + childResult.text,
        hasLink: acc.hasLink || childResult.hasLink,
      };
    },
    { text: "", hasLink: false }
  );
  return {
    text: children.text + (BLOCK_TAGS.has(element.tagName) ? "\n" : ""),
    hasLink: children.hasLink,
  };
};

const normalizeFlattenedWhitespace = (text: string): string =>
  text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Only converts if at least one anchor with a usable href was actually
// found - if the HTML has no links at all, there's nothing to gain by
// overriding the browser's own (usually better) HTML-to-plain-text paste.
const buildMarkdownFromHtmlClipboard = (html: string): string | null => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const { text, hasLink } = flattenNodeToMarkdown(doc.body);
  if (!hasLink) return null;
  const normalized = normalizeFlattenedWhitespace(text);
  return normalized || null;
};

const SOLE_URL_PATTERN = /^https?:\/\/\S+$/i;
const EMBEDDED_URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g;

// A bare URL on the clipboard never carries display text on its own (it's
// what a "Copy Link" action puts there, as plain text, not a real
// hyperlink) - so when the whole clipboard is just a URL, the field's
// current selection (if any) becomes the display text, matching how most
// rich editors handle "paste a link over a selection." A URL embedded in
// more text is converted in place, leaving the rest of the text untouched.
const buildMarkdownFromPlainTextClipboard = (
  plainText: string,
  selectedText: string
): string | null => {
  const trimmed = plainText.trim();
  if (!trimmed) return null;

  if (SOLE_URL_PATTERN.test(trimmed) && isSafeHttpUrl(trimmed)) {
    const text = sanitizeLinkText(selectedText) || trimmed;
    return `[${text}](${trimmed})`;
  }

  let convertedAny = false;
  const converted = plainText.replace(EMBEDDED_URL_PATTERN, (match) => {
    // Trailing punctuation is almost always part of the surrounding
    // sentence, not the URL itself (e.g. "see example.com." or "(...)").
    const trailingMatch = match.match(/[.,;:!?)\]]+$/);
    const url = trailingMatch ? match.slice(0, -trailingMatch[0].length) : match;
    const trailing = trailingMatch ? trailingMatch[0] : "";
    if (!url || !isSafeHttpUrl(url)) return match;
    convertedAny = true;
    return `[${url}](${url})${trailing}`;
  });
  return convertedAny ? converted : null;
};

/**
 * Builds markdown from a paste event's clipboard data with any link(s) it
 * contains converted to `[text](url)`, or null if the clipboard doesn't
 * contain a usable link at all - so the caller can fall back to the
 * browser's normal paste behavior. Surrounding text (a sentence, a
 * paragraph) is preserved as plain text around the converted link(s)
 * rather than being discarded.
 */
export const buildMarkdownLinkFromClipboard = (
  clipboardData: DataTransfer,
  selectedText: string
): string | null => {
  const html = clipboardData.getData("text/html");
  if (html) {
    const fromHtml = buildMarkdownFromHtmlClipboard(html);
    if (fromHtml) return fromHtml;
  }

  const plainText = clipboardData.getData("text/plain");
  return buildMarkdownFromPlainTextClipboard(plainText, selectedText);
};

/**
 * A ready-to-use onPaste handler for a controlled <textarea>: replaces the
 * current selection with markdown that has any link(s) in the pasted
 * content converted to `[text](url)`, and otherwise does nothing, leaving
 * the default paste behavior in place.
 */
export const handleMarkdownLinkPaste = (
  event: ClipboardEvent<HTMLTextAreaElement>,
  value: string,
  setValue: (next: string) => void
): void => {
  const target = event.currentTarget;
  const selectionStart = target.selectionStart;
  const selectionEnd = target.selectionEnd;
  const selectedText = value.slice(selectionStart, selectionEnd);

  const markdown = buildMarkdownLinkFromClipboard(event.clipboardData, selectedText);
  if (!markdown) return;

  event.preventDefault();
  setValue(value.slice(0, selectionStart) + markdown + value.slice(selectionEnd));

  const cursorPos = selectionStart + markdown.length;
  requestAnimationFrame(() => {
    target.setSelectionRange(cursorPos, cursorPos);
  });
};
