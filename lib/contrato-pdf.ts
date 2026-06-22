import "server-only";

import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import type { ContratoBlock, TextSegment } from "@/lib/contrato-celestia-template";
import {
  buildContratoBlocksEn,
  buildContratoBlocksEs,
  buildContratoPdfFilename,
  type ContratoDocumentData,
} from "@/lib/contrato-celestia-template";

const PAGE_WIDTH = 210;
const MARGIN_LEFT = 25;
const MARGIN_RIGHT = 25;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 25;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_HEIGHT = 5;
const BODY_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 13;
const LOGO_WIDTH_MM = 42;
const LOGO_NATURAL_WIDTH_PX = 4500;
const LOGO_NATURAL_HEIGHT_PX = 4421;
const LOGO_HEIGHT_MM =
  LOGO_WIDTH_MM * (LOGO_NATURAL_HEIGHT_PX / LOGO_NATURAL_WIDTH_PX);
const FIRST_LINE_INDENT = 10;
const BULLET_HANGING = 6;

type StyledToken = {
  text: string;
  bold: boolean;
};

function loadLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    return fs.readFileSync(logoPath).toString("base64");
  } catch {
    return null;
  }
}

function pageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

function setBodyFont(doc: jsPDF, bold = false) {
  doc.setFont("times", bold ? "bold" : "normal");
  doc.setFontSize(BODY_FONT_SIZE);
}

function setTitleFont(doc: jsPDF) {
  doc.setFont("times", "bold");
  doc.setFontSize(TITLE_FONT_SIZE);
}

function measureTokenWidth(doc: jsPDF, token: StyledToken): number {
  setBodyFont(doc, token.bold);
  return doc.getTextWidth(token.text);
}

function segmentsToTokens(segments: TextSegment[]): StyledToken[] {
  const tokens: StyledToken[] = [];

  for (const segment of segments) {
    const text = segment.caps ? segment.text.toUpperCase() : segment.text;
    const parts = text.split(/(\s+)/).filter((part) => part.length > 0);

    for (const part of parts) {
      tokens.push({ text: part, bold: Boolean(segment.bold) });
    }
  }

  return tokens;
}

function wrapTokens(
  doc: jsPDF,
  tokens: StyledToken[],
  maxWidth: number,
): StyledToken[][] {
  const lines: StyledToken[][] = [];
  let currentLine: StyledToken[] = [];
  let currentWidth = 0;

  function pushLine() {
    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
  }

  for (const token of tokens) {
    const tokenWidth = measureTokenWidth(doc, token);
    const isWhitespace = /^\s+$/.test(token.text);

    if (
      currentLine.length > 0 &&
      currentWidth + tokenWidth > maxWidth &&
      !isWhitespace
    ) {
      pushLine();
    }

    if (currentLine.length === 0 && isWhitespace) {
      continue;
    }

    currentLine.push(token);
    currentWidth += tokenWidth;
  }

  pushLine();
  return lines;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > pageHeight(doc) - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

function renderLine(
  doc: jsPDF,
  y: number,
  tokens: StyledToken[],
  x: number,
  maxWidth: number,
  align: "left" | "justify",
) {
  if (tokens.length === 0) return;

  if (align === "left") {
    let cursorX = x;
    for (const token of tokens) {
      setBodyFont(doc, token.bold);
      doc.text(token.text, cursorX, y);
      cursorX += measureTokenWidth(doc, token);
    }
    return;
  }

  const totalWidth = tokens.reduce(
    (sum, token) => sum + measureTokenWidth(doc, token),
    0,
  );
  const extraSpace = Math.max(0, maxWidth - totalWidth);
  const gapCount = tokens.filter((token) => !/^\s+$/.test(token.text)).length - 1;
  const gap = gapCount > 0 ? extraSpace / gapCount : 0;

  let cursorX = x;
  let printedWords = 0;

  for (const token of tokens) {
    setBodyFont(doc, token.bold);
    doc.text(token.text, cursorX, y);
    cursorX += measureTokenWidth(doc, token);

    if (!/^\s+$/.test(token.text)) {
      printedWords += 1;
      if (printedWords < gapCount) {
        cursorX += gap;
      }
    }
  }
}

function renderStyledParagraph(
  doc: jsPDF,
  y: number,
  tokens: StyledToken[],
  options?: { indent?: boolean },
): number {
  const firstLineWidth = CONTENT_WIDTH - (options?.indent ? FIRST_LINE_INDENT : 0);
  const lines = wrapTokens(doc, tokens, firstLineWidth);
  if (lines.length === 0) return y;

  const [firstLine, ...restLines] = lines;

  y = ensureSpace(doc, y, LINE_HEIGHT);
  renderLine(
    doc,
    y,
    firstLine,
    MARGIN_LEFT + (options?.indent ? FIRST_LINE_INDENT : 0),
    firstLineWidth,
    "justify",
  );
  y += LINE_HEIGHT;

  for (const line of restLines) {
    y = ensureSpace(doc, y, LINE_HEIGHT);
    renderLine(doc, y, line, MARGIN_LEFT, CONTENT_WIDTH, "justify");
    y += LINE_HEIGHT;
  }

  return y + 2;
}

function renderPlainParagraph(
  doc: jsPDF,
  y: number,
  text: string,
  options?: { indent?: boolean; bold?: boolean },
): number {
  setBodyFont(doc, options?.bold);
  const firstLineWidth = CONTENT_WIDTH - (options?.indent ? FIRST_LINE_INDENT : 0);
  const lines = doc.splitTextToSize(text, firstLineWidth) as string[];

  if (lines.length === 0) return y;

  const [firstLine, ...restLines] = lines;

  y = ensureSpace(doc, y, LINE_HEIGHT);
  doc.text(firstLine, MARGIN_LEFT + (options?.indent ? FIRST_LINE_INDENT : 0), y, {
    align: "justify",
    maxWidth: firstLineWidth,
  });
  y += LINE_HEIGHT;

  for (const line of restLines) {
    y = ensureSpace(doc, y, LINE_HEIGHT);
    doc.text(line, MARGIN_LEFT, y, {
      align: "justify",
      maxWidth: CONTENT_WIDTH,
    });
    y += LINE_HEIGHT;
  }

  return y + 2;
}

function renderLogo(doc: jsPDF, y: number, logoBase64: string | null): number {
  y = ensureSpace(doc, y, LOGO_HEIGHT_MM + 8);

  if (logoBase64) {
    doc.addImage(
      `data:image/png;base64,${logoBase64}`,
      "PNG",
      (PAGE_WIDTH - LOGO_WIDTH_MM) / 2,
      y,
      LOGO_WIDTH_MM,
      LOGO_HEIGHT_MM,
    );
    return y + LOGO_HEIGHT_MM + 8;
  }

  setTitleFont(doc);
  doc.text("CELESTIA EVENTS", PAGE_WIDTH / 2, y + 8, { align: "center" });
  return y + 14;
}

function renderTitle(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, LINE_HEIGHT + 4);
  setTitleFont(doc);
  doc.text(text.toUpperCase(), PAGE_WIDTH / 2, y, { align: "center" });
  return y + LINE_HEIGHT + 4;
}

function renderBullet(doc: jsPDF, y: number, text: string): number {
  const bulletText = `• ${text}`;
  setBodyFont(doc, false);
  const lines = doc.splitTextToSize(
    bulletText,
    CONTENT_WIDTH - BULLET_HANGING,
  ) as string[];

  for (let index = 0; index < lines.length; index += 1) {
    y = ensureSpace(doc, y, LINE_HEIGHT);
    const x = MARGIN_LEFT + (index === 0 ? 0 : BULLET_HANGING);
    const maxWidth = CONTENT_WIDTH - (index === 0 ? 0 : BULLET_HANGING);
    doc.text(lines[index], x, y, { align: "justify", maxWidth });
    y += LINE_HEIGHT;
  }

  return y + 2;
}

function renderSignatureBlock(
  doc: jsPDF,
  y: number,
  block: Extract<ContratoBlock, { kind: "signature_block" }>,
): number {
  y = ensureSpace(doc, y, LINE_HEIGHT * (block.details.length + 2) + 6);
  y += 4;

  setBodyFont(doc, true);
  doc.text(block.name.toUpperCase(), MARGIN_LEFT, y);
  y += LINE_HEIGHT;

  setBodyFont(doc, true);
  doc.text(block.role.toUpperCase(), MARGIN_LEFT, y);
  y += LINE_HEIGHT;

  setBodyFont(doc, false);
  for (const detail of block.details) {
    doc.text(detail, MARGIN_LEFT, y);
    y += LINE_HEIGHT - 1;
  }

  return y + 4;
}

function renderBlock(
  doc: jsPDF,
  y: number,
  block: ContratoBlock,
  logoBase64: string | null,
): number {
  switch (block.kind) {
    case "logo":
      return renderLogo(doc, y, logoBase64);
    case "title":
      return renderTitle(doc, y, block.text);
    case "rich":
      return renderStyledParagraph(doc, y, segmentsToTokens(block.segments), {
        indent: block.indent,
      });
    case "clause":
      return renderStyledParagraph(
        doc,
        y,
        segmentsToTokens([
          { text: block.heading, bold: true, caps: true },
          { text: block.body },
        ]),
        { indent: true },
      );
    case "labeled":
      return renderStyledParagraph(
        doc,
        y,
        segmentsToTokens([
          { text: block.label, bold: true, caps: true },
          { text: block.text },
        ]),
        { indent: true },
      );
    case "paragraph":
      return renderPlainParagraph(doc, y, block.text, { indent: block.indent });
    case "bullet":
      return renderBullet(doc, y, block.text);
    case "signature_date":
      return renderPlainParagraph(doc, y, block.text, { bold: true });
    case "signature_block":
      return renderSignatureBlock(doc, y, block);
    case "spacer":
    default:
      return y + 3;
  }
}

function renderBlocks(
  doc: jsPDF,
  blocks: ContratoBlock[],
  logoBase64: string | null,
  startY = MARGIN_TOP,
): number {
  let y = startY;

  for (const block of blocks) {
    y = renderBlock(doc, y, block, logoBase64);
  }

  return y;
}

export function generateContratoPdf(data: ContratoDocumentData): {
  bytes: Uint8Array;
  filename: string;
} {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoBase64 = loadLogoBase64();

  renderBlocks(doc, buildContratoBlocksEs(data), logoBase64);
  doc.addPage();
  renderBlocks(doc, buildContratoBlocksEn(data), logoBase64);

  const arrayBuffer = doc.output("arraybuffer");
  return {
    bytes: new Uint8Array(arrayBuffer),
    filename: buildContratoPdfFilename(data.boda),
  };
}
