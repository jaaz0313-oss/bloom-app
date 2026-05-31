import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ContratoBlock, TextSegment } from "@/lib/contrato-celestia-template";
import {
  buildContratoBlocksEn,
  buildContratoBlocksEs,
  buildContratoFilename,
  type ContratoDocumentData,
} from "@/lib/contrato-celestia-template";

const FONT_BODY = "Times New Roman";
const FONT_DISPLAY = "Georgia";
const BODY_SIZE = 24; // 12pt
const TITLE_SIZE = 28; // 14pt
const LOGO_WIDTH = 150;

const PARAGRAPH_INDENT = { firstLine: 720 };
const BODY_SPACING = { after: 160, line: 276 };
const TITLE_SPACING = { before: 120, after: 280 };

type LogoImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function loadLogoImage(): LogoImage | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const file = fs.readFileSync(logoPath);
    const dimensions = readPngDimensions(file);
    if (!dimensions.width || !dimensions.height) return null;

    const height = Math.round(
      (dimensions.height / dimensions.width) * LOGO_WIDTH,
    );

    return {
      data: new Uint8Array(file),
      width: LOGO_WIDTH,
      height: height > 0 ? height : LOGO_WIDTH,
    };
  } catch {
    return null;
  }
}

function textRun(
  text: string,
  options?: { bold?: boolean; caps?: boolean; size?: number; font?: string },
): TextRun {
  const content = options?.caps ? text.toUpperCase() : text;
  return new TextRun({
    text: content,
    bold: options?.bold,
    size: options?.size ?? BODY_SIZE,
    font: options?.font ?? FONT_BODY,
  });
}

function segmentsToRuns(segments: TextSegment[]): TextRun[] {
  return segments.map((segment) =>
    textRun(segment.text, {
      bold: segment.bold,
      caps: segment.caps,
    }),
  );
}

function logoParagraph(logo: LogoImage): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
    children: [
      new ImageRun({
        type: "png",
        data: logo.data,
        transformation: {
          width: logo.width,
          height: logo.height,
        },
      }),
    ],
  });
}

function blockToParagraph(
  block: ContratoBlock,
  logo: LogoImage | null,
): Paragraph {
  switch (block.kind) {
    case "logo":
      return logo
        ? logoParagraph(logo)
        : new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
            children: [
              textRun("CELESTIA EVENTS", {
                bold: true,
                caps: true,
                size: 36,
                font: FONT_DISPLAY,
              }),
            ],
          });
    case "title":
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: TITLE_SPACING,
        children: [
          textRun(block.text, {
            bold: true,
            caps: true,
            size: TITLE_SIZE,
            font: FONT_DISPLAY,
          }),
        ],
      });
    case "rich":
      return new Paragraph({
        alignment: AlignmentType.BOTH,
        indent: block.indent ? PARAGRAPH_INDENT : undefined,
        spacing: BODY_SPACING,
        children: segmentsToRuns(block.segments),
      });
    case "clause":
      return new Paragraph({
        alignment: AlignmentType.BOTH,
        indent: PARAGRAPH_INDENT,
        spacing: BODY_SPACING,
        children: [
          textRun(block.heading, { bold: true, caps: true }),
          textRun(block.body),
        ],
      });
    case "labeled":
      return new Paragraph({
        alignment: AlignmentType.BOTH,
        indent: PARAGRAPH_INDENT,
        spacing: BODY_SPACING,
        children: [
          textRun(block.label, { bold: true, caps: true }),
          textRun(block.text),
        ],
      });
    case "paragraph":
      return new Paragraph({
        alignment: AlignmentType.BOTH,
        indent: block.indent ? PARAGRAPH_INDENT : undefined,
        spacing: BODY_SPACING,
        children: [textRun(block.text)],
      });
    case "bullet":
      return new Paragraph({
        alignment: AlignmentType.BOTH,
        indent: { left: 720, hanging: 360 },
        spacing: BODY_SPACING,
        children: [textRun(`• ${block.text}`)],
      });
    case "signature_date":
      return new Paragraph({
        alignment: AlignmentType.BOTH,
        spacing: { before: 240, after: 240 },
        children: [textRun(block.text, { bold: true })],
      });
    case "spacer":
    default:
      return new Paragraph({
        children: [new TextRun("")],
        spacing: { after: 120 },
      });
  }
}

function signatureBlockParagraphs(
  block: Extract<ContratoBlock, { kind: "signature_block" }>,
): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 360, after: 80 },
      children: [textRun(block.name, { bold: true, caps: true })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [textRun(block.role, { bold: true, caps: true })],
    }),
    ...block.details.map(
      (line) =>
        new Paragraph({
          spacing: { after: 60 },
          children: [textRun(line)],
        }),
    ),
  ];
}

function blocksToParagraphs(
  blocks: ContratoBlock[],
  logo: LogoImage | null,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const block of blocks) {
    if (block.kind === "signature_block") {
      paragraphs.push(...signatureBlockParagraphs(block));
      continue;
    }
    paragraphs.push(blockToParagraph(block, logo));
  }
  return paragraphs;
}

export async function generateContratoDocx(data: ContratoDocumentData): Promise<{
  blob: Blob;
  filename: string;
}> {
  const logo = loadLogoImage();
  const paragraphsEs = blocksToParagraphs(buildContratoBlocksEs(data), logo);
  const pageBreak = new Paragraph({
    children: [new TextRun("")],
    pageBreakBefore: true,
  });
  const paragraphsEn = blocksToParagraphs(buildContratoBlocksEn(data), logo);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...paragraphsEs, pageBreak, ...paragraphsEn],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return { blob, filename: buildContratoFilename(data.boda) };
}
