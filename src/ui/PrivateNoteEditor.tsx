import { useEffect, useRef, useState } from "react";
import { LuLock } from "react-icons/lu";
import "./PrivateNoteEditor.css";

interface PrivateNoteEditorProps {
  initialText: string;
  onSave: (text: string) => void;
}

const SAVE_DEBOUNCE_MS = 600;

export const PrivateNoteEditor = ({ initialText, onSave }: PrivateNoteEditorProps) => {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");
  const lastSavedRef = useRef(initialText);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
