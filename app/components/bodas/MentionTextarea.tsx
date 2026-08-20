"use client";

import { useMemo, useRef, useState } from "react";
import { NotaMarkdownToolbar } from "@/app/components/bodas/NotaMarkdownToolbar";
import type { EquipoUsuarioMencion } from "@/lib/notas-menciones";
import { filterEquipoForMentionQuery } from "@/lib/notas-menciones";

type MentionTextareaProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  equipo: EquipoUsuarioMencion[];
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
};

type MentionState = {
  start: number;
  query: string;
};

export function MentionTextarea({
  id,
  value,
  onChange,
  equipo,
  placeholder,
  rows = 3,
  disabled = false,
  className,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const suggestions = useMemo(() => {
    if (!mention) return [];
    return filterEquipoForMentionQuery(equipo, mention.query).slice(0, 8);
  }, [equipo, mention]);

  function detectMention(text: string, cursor: number) {
    const before = text.slice(0, cursor);
    const atIndex = before.lastIndexOf("@");
    if (atIndex === -1) {
      setMention(null);
      return;
    }

    const charBefore = atIndex > 0 ? before[atIndex - 1] : " ";
    if (charBefore !== " " && charBefore !== "\n" && atIndex !== 0) {
      setMention(null);
      return;
    }

    const query = before.slice(atIndex + 1);
    if (query.includes("\n")) {
      setMention(null);
      return;
    }

    setMention({ start: atIndex, query });
    setHighlightIndex(0);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next);
    const cursor = e.target.selectionStart ?? next.length;
    detectMention(next, cursor);
  }

  function handleSelect(user: EquipoUsuarioMencion) {
    const textarea = textareaRef.current;
    if (!mention || !textarea) return;

    const cursor = textarea.selectionStart ?? value.length;
    const before = value.slice(0, mention.start);
    const after = value.slice(cursor);
    const insertion = `@${user.nombre} `;
    const next = before + insertion + after;
    onChange(next);
    setMention(null);

    const newCursor = before.length + insertion.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && mention) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setMention(null);
    }
  }

  return (
    <div className="relative">
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
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) =>
          detectMention(
            e.currentTarget.value,
            e.currentTarget.selectionStart ?? 0,
          )
        }
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />

      {mention && suggestions.length > 0 && (
        <ul
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-bloom-border bg-bloom-surface py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((user, index) => (
            <li key={user.id} role="option" aria-selected={index === highlightIndex}>
              <button
                type="button"
                className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors ${
                  index === highlightIndex
                    ? "bg-bloom-accent/10 text-bloom-ink"
                    : "text-bloom-ink hover:bg-bloom-canvas"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(user);
                }}
              >
                <span className="font-medium">{user.nombre}</span>
                <span className="text-xs text-bloom-muted">@{user.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {mention && suggestions.length === 0 && mention.query.length > 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-xl border border-bloom-border bg-bloom-surface px-3 py-2 text-xs text-bloom-muted shadow-lg">
          Sin coincidencias
        </p>
      )}
    </div>
  );
}
