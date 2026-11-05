"use client";

import { useId } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const id = useId();

  return (
    <Dialog open={open} onClose={onCancel} labelledBy={`${id}-title`} describedBy={`${id}-desc`}>
      <h2 id={`${id}-title`} className="f2-title">
        {title}
      </h2>
      <p id={`${id}-desc`} className="f2-body mt-2 text-f2-muted">
        {description}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </Dialog>
  );
}
