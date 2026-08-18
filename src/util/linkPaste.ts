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

// If the clipboard's HTML representation is *just* a single link (not a
// link embedded in a larger selection - we don't want to silently drop
// surrounding text the user meant to paste), returns its href/text.
const extractSoleAnchorFromHtml = (
  html: string
): { href: string; text: string } | null => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchor = doc.body.querySelector("a[href]");
  if (!anchor) return null;
  const href = anchor.getAttribute("href");
  if (!href) return null;
  const bodyText = (doc.body.textContent ?? "").trim();
  const anchorText = (anchor.textContent ?? "").trim();
  if (bodyText !== anchorText) return null;
  return { href, text: anchorText };
};

/**
 * Builds `[text](url)` markdown from a paste event's clipboard data, if (and
 * only if) the clipboard contains nothing but a single link - either a real
 * hyperlink (from copying rendered content that included one, e.g. a link
 * on a webpage or in a Google Doc) or a bare URL (from a "Copy Link"
 * action, which never carries display text). In the bare-URL case,
 * `selectedText` - whatever's currently selected in the target field - is
 * used as the display text if there is any, matching how most rich editors
 * handle "paste a link over a selection."
 *
 * Returns null when the clipboard doesn't look like just a link, so the
 * caller can fall back to the browser's normal paste behavior.
 */
export const buildMarkdownLinkFromClipboard = (
  clipboardData: DataTransfer,
  selectedText: string
): string | null => {
  const html = clipboardData.getData("text/html");
  if (html) {
    const anchor = extractSoleAnchorFromHtml(html);
    if (anchor && isSafeHttpUrl(anchor.href)) {
      const text = sanitizeLinkText(anchor.text) || anchor.href;
      return `[${text}](${anchor.href})`;
    }
  }

  const plainText = clipboardData.getData("text/plain").trim();
  if (plainText && isSafeHttpUrl(plainText)) {
    const text = sanitizeLinkText(selectedText) || plainText;
    return `[${text}](${plainText})`;
  }

  return null;
};

/**
 * A ready-to-use onPaste handler for a controlled <textarea>: replaces the
 * current selection with `[text](url)` markdown when the paste looks like
 * just a link, and otherwise does nothing, leaving the default paste
 * behavior in place.
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

  const markdownLink = buildMarkdownLinkFromClipboard(
    event.clipboardData,
    selectedText
  );
  if (!markdownLink) return;

  event.preventDefault();
  setValue(value.slice(0, selectionStart) + markdownLink + value.slice(selectionEnd));

  const cursorPos = selectionStart + markdownLink.length;
  requestAnimationFrame(() => {
    target.setSelectionRange(cursorPos, cursorPos);
  });
};
