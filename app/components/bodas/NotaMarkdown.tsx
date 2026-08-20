"use client";

import { useMemo } from "react";
import { renderNotaMarkdown } from "@/lib/nota-markdown";

type NotaMarkdownProps = {
  text: string;
  className?: string;
};

export function NotaMarkdown({ text, className = "" }: NotaMarkdownProps) {
  const html = useMemo(() => renderNotaMarkdown(text), [text]);

  if (!text.trim()) return null;

  return (
    <div
      className={`nota-md text-sm text-bloom-ink [&_br]:block [&_em]:italic [&_h3]:mb-1 [&_h3]:mt-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-bloom-ink [&_li]:my-0.5 [&_p]:my-0.5 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:pl-5 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
