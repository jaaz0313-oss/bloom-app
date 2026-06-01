"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ResponsiveModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  size?: "md" | "lg";
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeDisabled?: boolean;
};

export function ResponsiveModal({
  open,
  onClose,
  title,
  subtitle,
  ariaLabel,
  size = "lg",
  children,
  footer,
  closeDisabled = false,
}: ResponsiveModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const panelMaxWidth = size === "md" ? "max-w-md" : "max-w-lg";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
      onClick={(e) => {
        if (e.target === e.currentTarget && !closeDisabled) onClose();
      }}
    >
      <div
        className={`mx-4 max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${panelMaxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl text-bloom-ink">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-bloom-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="shrink-0 rounded-full p-2 text-bloom-muted hover:bg-bloom-border"
            aria-label="Cerrar"
          >
            <XIcon />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
