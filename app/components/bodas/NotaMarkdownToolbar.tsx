"use client";

import type { RefObject } from "react";
import {
  applyNotaMarkdownFormat,
  type NotaMarkdownFormat,
} from "@/lib/nota-markdown";

type NotaMarkdownToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const BUTTONS: Array<{
  format: NotaMarkdownFormat;
  label: string;
  title: string;
  className?: string;
}> = [
  { format: "bold", label: "B", title: "Negrita", className: "font-bold" },
  { format: "italic", label: "I", title: "Cursiva", className: "italic" },
  { format: "heading", label: "H", title: "Título" },
  { format: "list", label: "•", title: "Lista" },
];

export function NotaMarkdownToolbar({
  textareaRef,
  value,
  onChange,
  disabled = false,
}: NotaMarkdownToolbarProps) {
  function applyFormat(format: NotaMarkdownFormat) {
    if (disabled) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const next = applyNotaMarkdownFormat(value, start, end, format);
    onChange(next.value);

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }

  return (
    <div
      className="mb-1.5 flex items-center gap-0.5"
      role="toolbar"
      aria-label="Formato de nota"
    >
      {BUTTONS.map((button) => (
        <button
          key={button.format}
          type="button"
          title={button.title}
          aria-label={button.title}
          disabled={disabled}
          onMouseDown={(e) => {
            // Evita que el textarea pierda la selección al hacer clic.
            e.preventDefault();
          }}
          onClick={() => applyFormat(button.format)}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-xs text-bloom-muted transition-colors hover:border-bloom-border/80 hover:bg-bloom-canvas hover:text-bloom-ink disabled:opacity-50 ${button.className ?? ""}`}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
