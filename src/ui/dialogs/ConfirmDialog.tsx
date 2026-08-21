import { Dialog } from "./Dialog";

import "./ConfirmDialog.css";

export type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog title={title} closeDialog={onCancel} className="confirm-dialog">
      <p>{message}</p>
      <div className="confirm-dialog-actions">
        <button className="btn-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className={danger ? "danger" : undefined} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
};
