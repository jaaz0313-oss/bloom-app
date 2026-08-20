export type NotaMarkdownFormat = "bold" | "italic" | "heading" | "list";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
}

/**
 * Convierte el subset de Markdown de notas del equipo a HTML seguro.
 * Soporta: **negrita**, *cursiva*, ## título y - listas.
 */
export function renderNotaMarkdown(raw: string): string {
  const source = raw.replace(/\r\n/g, "\n");
  if (!source.trim()) return "";

  const lines = source.split("\n");
  const parts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.*)$/);
    const listMatch = line.match(/^-\s+(.*)$/);

    if (listMatch) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${applyInlineMarkdown(escapeHtml(listMatch[1]))}</li>`);
      continue;
    }

    closeList();

    if (headingMatch) {
      parts.push(
        `<h3>${applyInlineMarkdown(escapeHtml(headingMatch[1]))}</h3>`,
      );
      continue;
    }

    if (line.trim() === "") {
      parts.push("<br />");
      continue;
    }

    parts.push(`<p>${applyInlineMarkdown(escapeHtml(line))}</p>`);
  }

  closeList();
  return parts.join("");
}

function wrapSelection(
  value: string,
  start: number,
  end: number,
  marker: string,
  placeholder: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const selected = value.slice(start, end);
  const inner = selected.length > 0 ? selected : placeholder;
  const wrapped = `${marker}${inner}${marker}`;
  const next = value.slice(0, start) + wrapped + value.slice(end);
  const innerStart = start + marker.length;
  return {
    value: next,
    selectionStart: innerStart,
    selectionEnd: innerStart + inner.length,
  };
}

function applyLinePrefix(
  value: string,
  start: number,
  end: number,
  prefix: string,
  stripRe: RegExp,
  otherStripRe: RegExp,
): { value: string; selectionStart: number; selectionEnd: number } {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  let lineEnd = value.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = value.length;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const nextLines = lines.map((line) => {
    if (stripRe.test(line)) return line.replace(stripRe, "");
    const cleaned = line.replace(otherStripRe, "");
    return `${prefix}${cleaned}`;
  });
  const newBlock = nextLines.join("\n");
  const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + newBlock.length,
  };
}

export function applyNotaMarkdownFormat(
  value: string,
  start: number,
  end: number,
  format: NotaMarkdownFormat,
): { value: string; selectionStart: number; selectionEnd: number } {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));

  if (format === "bold") {
    return wrapSelection(value, safeStart, safeEnd, "**", "texto");
  }
  if (format === "italic") {
    return wrapSelection(value, safeStart, safeEnd, "*", "texto");
  }
  if (format === "heading") {
    return applyLinePrefix(
      value,
      safeStart,
      safeEnd,
      "## ",
      /^##\s+/,
      /^-\s+/,
    );
  }
  return applyLinePrefix(value, safeStart, safeEnd, "- ", /^-\s+/, /^##\s+/);
}
