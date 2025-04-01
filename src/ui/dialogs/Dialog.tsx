import { useEffect, useRef } from "react";

import "./Dialog.css";

export type DialogProps = {
  closeDialog: () => void;
  title: string;
  className?: string;
  children: React.ReactNode;
};

export const Dialog: React.FC<DialogProps> = ({
  closeDialog,
  title,
  className,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);

  return (
    <dialog ref={dialogRef} className={className} onCancel={closeDialog}>
      <div className="dialog-header">
        <h3>{title}</h3>
        <button className="subtle close" onClick={closeDialog} title="Close">
          X
        </button>
      </div>
      <div className="dialog-content">{children}</div>
    </dialog>
  );
};
