"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

type ActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  eyebrow?: string;
  children?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
};

export function ActionDialog({
  open,
  title,
  description,
  eyebrow,
  children,
  actions,
  onClose
}: ActionDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="关闭弹窗"
        className="absolute inset-0 bg-[rgba(8,19,34,0.22)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl rounded-[2rem] border border-line bg-panel px-6 py-6 shadow-[0_40px_120px_rgba(15,37,62,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 className="mt-2 text-2xl font-semibold text-ink">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
          </div>
          <button
            type="button"
            className="button-ghost"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
        {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
