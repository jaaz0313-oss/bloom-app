"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  ariaLabel?: string;
  autoFocus?: boolean;
  showToolbar?: boolean;
  onBlur?: (value: string) => void;
};

type MentionState = {
  start: number;
  query: string;
};

type MenuBox = {
  top: number;
  left: number;
  width: number;
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
  ariaLabel,
  autoFocus = false,
  showToolbar = true,
  onBlur,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectingRef = useRef(false);
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

    selectingRef.current = true;
    const cursor = textarea.selectionStart ?? value.length;
    const before = value.slice(0, mention.start);
    const after = value.slice(cursor);
    const insertion = `@${user.nombre} `;
    const next = before + insertion + after;
    textarea.value = next;
    onChange(next);
    setMention(null);

    const newCursor = before.length + insertion.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
      selectingRef.current = false;
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

  const menuOpen = Boolean(mention);

  return (
    <div className="relative">
      {showToolbar ? (
        <NotaMarkdownToolbar
          textareaRef={textareaRef}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}
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
        onBlur={(e) => {
          if (selectingRef.current) return;
          const currentValue = e.currentTarget.value;
          setMention(null);
          onBlur?.(currentValue);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label={ariaLabel}
      />

      {menuOpen && textareaRef.current ? (
        <MentionMenu
          anchor={textareaRef.current}
          suggestions={suggestions}
          highlightIndex={highlightIndex}
          query={mention?.query ?? ""}
          onSelect={handleSelect}
        />
      ) : null}
    </div>
  );
}

function MentionMenu({
  anchor,
  suggestions,
  highlightIndex,
  query,
  onSelect,
}: {
  anchor: HTMLTextAreaElement;
  suggestions: EquipoUsuarioMencion[];
  highlightIndex: number;
  query: string;
  onSelect: (user: EquipoUsuarioMencion) => void;
}) {
  const [box, setBox] = useState<MenuBox | null>(null);

  useEffect(() => {
    function update() {
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - width - 8),
      );
      const estimatedHeight = suggestions.length > 0 ? 220 : 44;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;
      const top = openAbove
        ? Math.max(8, rect.top - estimatedHeight - 4)
        : rect.bottom + 4;
      setBox({ top, left, width });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchor, query, suggestions.length]);

  if (!box || typeof document === "undefined") return null;

  const menu =
    suggestions.length > 0 ? (
      <ul
        className="max-h-48 overflow-y-auto rounded-xl border border-bloom-border bg-bloom-surface py-1 shadow-lg"
        style={{
          position: "fixed",
          top: box.top,
          left: box.left,
          width: box.width,
          zIndex: 80,
        }}
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
                onSelect(user);
              }}
            >
              <span className="font-medium">{user.nombre}</span>
              <span className="text-xs text-bloom-muted">@{user.username}</span>
            </button>
          </li>
        ))}
      </ul>
    ) : query.length > 0 ? (
      <p
        className="rounded-xl border border-bloom-border bg-bloom-surface px-3 py-2 text-xs text-bloom-muted shadow-lg"
        style={{
          position: "fixed",
          top: box.top,
          left: box.left,
          width: box.width,
          zIndex: 80,
        }}
      >
        Sin coincidencias
      </p>
    ) : null;

  if (!menu) return null;
  return createPortal(menu, document.body);
}
