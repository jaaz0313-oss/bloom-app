"use client";

import { useRef } from "react";
import { NotaMarkdownToolbar } from "@/app/components/bodas/NotaMarkdownToolbar";

type FormattedNotaTextareaProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
  "aria-label"?: string;
};

export function FormattedNotaTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  className,
  autoFocus,
  required,
  "aria-label": ariaLabel,
}: FormattedNotaTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
      <NotaMarkdownToolbar
        textareaRef={textareaRef}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        required={required}
        aria-label={ariaLabel}
        autoComplete="off"
      />
    </div>
  );
}
