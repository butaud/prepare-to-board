import { useEffect, useRef, useState } from "react";
import { LuLock, LuPencil } from "react-icons/lu";
import "./PrivateNoteEditor.css";

interface PrivateNoteEditorProps {
  initialText: string;
  onSave: (text: string) => void;
}

const SAVE_DEBOUNCE_MS = 600;

export const PrivateNoteEditor = ({ initialText, onSave }: PrivateNoteEditorProps) => {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");
  // Starts collapsed when there's nothing to show yet, so a long list of
  // topics with no notes doesn't turn into a wall of empty textareas.
  const [isExpanded, setIsExpanded] = useState(initialText !== "");
  const lastSavedRef = useRef(initialText);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusOnExpandRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isExpanded && focusOnExpandRef.current) {
      textareaRef.current?.focus();
      focusOnExpandRef.current = false;
    }
  }, [isExpanded]);

  const flush = (value: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (value !== lastSavedRef.current) {
      lastSavedRef.current = value;
      onSave(value);
    }
    setStatus("saved");
  };

  const handleChange = (value: string) => {
    setText(value);
    setStatus("pending");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => flush(value), SAVE_DEBOUNCE_MS);
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        className="btn-small btn-secondary private-note-add-button"
        onClick={() => {
          focusOnExpandRef.current = true;
          setIsExpanded(true);
        }}
      >
        <LuPencil aria-hidden="true" /> Add private note
      </button>
    );
  }

  return (
    <div className="private-note-editor">
      <div className="private-note-header">
        <span className="private-note-label">
          <LuLock aria-hidden="true" /> My Notes
        </span>
        <span className="private-note-status">
          {status === "pending" && "Saving…"}
          {status === "saved" && "Saved"}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        className="private-note-textarea"
        placeholder="Private notes only you can see..."
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => flush(text)}
        rows={2}
      />
    </div>
  );
};
