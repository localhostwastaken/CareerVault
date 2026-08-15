// @pdf-lib/fontkit's bundle references `regeneratorRuntime` as a global in its
// complex-script (Indic) shaper. Without this polyfill, embedding/drawing Devanagari
// throws "regeneratorRuntime is not defined". Must load before fontkit shapes text.
import 'regenerator-runtime/runtime.js';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Font as CoverageFont } from '@pdf-lib/fontkit';
import { StorageService } from '../../services/storage/storage.service.js';

interface DocLike {
  id: string;
  type: string;
  documentHash: string | null;
  contentJson: unknown;
}

interface OrgLike {
  name: string;
  domain: string;
}

const TITLES: Record<string, string> = {
  EXPERIENCE_LETTER: 'Experience Letter',
  LETTER_OF_RECOMMENDATION: 'Letter of Recommendation',
  SALARY_PROOF: 'Salary Proof',
};

// Layout constants (A4 points).
const LEFT = 56;
const VALUE_X = 210;
const RIGHT = 539;
const BOTTOM_GUARD = 130; // stop rendering fields above the hash footer
const LINE_H = 16;
const VALUE_SIZE = 11;

type PdfColor = ReturnType<typeof rgb>;
type Weight = 'regular' | 'bold';
interface Faces {
  latin: PDFFont;
  deva: PDFFont;
}
type FacesByWeight = Record<Weight, Faces>;
interface Run {
  text: string;
  font: PDFFont;
}

// StandardFonts.Helvetica (WinAnsi/Latin-1) throws on any non-Latin-1 glyph, which
// crashes issuance for the India-first market (Devanagari names, the ₹ sign, curly
// quotes). We embed Unicode Noto TTFs instead. Latin covers Latin + ₹ + punctuation;
// Devanagari covers the Devanagari block. Bytes are read once per process; embedFont
// still runs per-document because pdf-lib binds a font to its owning PDFDocument.
const FONT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'fonts',
);

interface FontAsset {
  bytes: Uint8Array;
  coverage: CoverageFont;
}
interface AssetSet {
  latinReg: FontAsset;
  latinBold: FontAsset;
  devaReg: FontAsset;
  devaBold: FontAsset;
}

function loadAsset(file: string): FontAsset {
  const bytes = readFileSync(join(FONT_DIR, file));
  return { bytes, coverage: fontkit.create(bytes) };
}

let assetCache: AssetSet | null = null;
function fontAssets(): AssetSet {
  if (!assetCache) {
    assetCache = {
      latinReg: loadAsset('NotoSans-Regular.ttf'),
      latinBold: loadAsset('NotoSans-Bold.ttf'),
      devaReg: loadAsset('NotoSansDevanagari-Regular.ttf'),
      devaBold: loadAsset('NotoSansDevanagari-Bold.ttf'),
    };
  }
  return assetCache;
}

// Headless PDF rendering via pdf-lib (no Chromium). Phase 3 embeds the Merkle proof
// into the PDF metadata; for now we render the letter + the document hash footer.
@Injectable()
export class PdfGenerationService {
  constructor(private readonly storage: StorageService) {}

  async generateAndStore(doc: DocLike, org: OrgLike): Promise<string> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const faces = await embedFaces(pdf);
    const page = pdf.addPage([595.28, 841.89]); // A4
    const navy = rgb(0.118, 0.227, 0.541);
    const ink = rgb(0.06, 0.09, 0.16);
    const muted = rgb(0.39, 0.45, 0.55);

    let y = 800;
    draw(page, org.name, LEFT, y, 18, faces.bold, navy);
    y -= 15;
    draw(page, org.domain, LEFT, y, 10, faces.regular, muted);
    y -= 40;
    draw(
      page,
      TITLES[doc.type] ?? 'Career Document',
      LEFT,
      y,
      22,
      faces.bold,
      ink,
    );
    y -= 34;

    for (const [label, value] of extractFields(doc.contentJson)) {
      if (y < BOTTOM_GUARD) break;
      draw(page, `${label}:`, LEFT, y, VALUE_SIZE, faces.bold, ink);
      const lines = wrapLines(
        value,
        faces.regular,
        VALUE_SIZE,
        RIGHT - VALUE_X,
      );
      for (const line of lines.length ? lines : ['']) {
        draw(page, line, VALUE_X, y, VALUE_SIZE, faces.regular, ink);
        y -= LINE_H;
        if (y < BOTTOM_GUARD) break;
      }
    }

    page.drawLine({
      start: { x: LEFT, y: 100 },
      end: { x: RIGHT, y: 100 },
      thickness: 0.5,
      color: muted,
    });
    draw(page, 'Document hash (SHA-256):', LEFT, 84, 8, faces.bold, muted);
    draw(page, doc.documentHash ?? '—', LEFT, 72, 8, faces.regular, muted);
    draw(
      page,
      'Verify authenticity at careervault.io',
      LEFT,
      56,
      8,
      faces.regular,
      muted,
    );

    const bytes = await pdf.save();
    const key = `documents/${doc.id}.pdf`;
    await this.storage.put(key, Buffer.from(bytes), 'application/pdf');
    return `/api/v1/documents/${doc.id}/download`;
  }

  // Stamps the Merkle anchor into the issued PDF's metadata once it has been anchored.
  // Archival only — verification reads the DB, never the PDF — so callers treat it as
  // best-effort (a missing PDF throws here and is swallowed upstream).
  async embedAnchorMetadata(
    documentId: string,
    anchor: { rootHash: string; txHash: string },
  ): Promise<void> {
    const key = `documents/${documentId}.pdf`;
    const existing = await this.storage.get(key);
    const pdf = await PDFDocument.load(existing);
    pdf.setSubject(`CareerVault anchor — Merkle root ${anchor.rootHash}`);
    pdf.setKeywords([`merkleRoot:${anchor.rootHash}`, `tx:${anchor.txHash}`]);
    pdf.setProducer('CareerVault AnchorEngine');
    const bytes = await pdf.save();
    await this.storage.put(key, Buffer.from(bytes), 'application/pdf');
  }
}

async function embedFaces(pdf: PDFDocument): Promise<FacesByWeight> {
  const a = fontAssets();
  // subset: true keeps issued PDFs small — only drawn glyphs are embedded, so the
  // four faces add negligible weight when a document uses only one script.
  const [latin, latinBold, deva, devaBold] = await Promise.all([
    pdf.embedFont(a.latinReg.bytes, { subset: true }),
    pdf.embedFont(a.latinBold.bytes, { subset: true }),
    pdf.embedFont(a.devaReg.bytes, { subset: true }),
    pdf.embedFont(a.devaBold.bytes, { subset: true }),
  ]);
  return {
    regular: { latin, deva },
    bold: { latin: latinBold, deva: devaBold },
  };
}

// Splits text into single-face runs so mixed Latin/Devanagari renders correctly and
// any uncovered code point (Tamil, CJK, emoji) degrades to '?' instead of throwing.
function toRuns(text: string, faces: Faces): Run[] {
  const { latinReg, devaReg } = fontAssets();
  const runs: Run[] = [];
  let buf = '';
  let active: PDFFont | null = null;
  const flush = (): void => {
    if (buf && active) runs.push({ text: buf, font: active });
    buf = '';
  };
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    let font: PDFFont;
    let glyph = ch;
    if (latinReg.coverage.hasGlyphForCodePoint(cp)) font = faces.latin;
    else if (devaReg.coverage.hasGlyphForCodePoint(cp)) font = faces.deva;
    else {
      font = faces.latin;
      glyph = '?';
    }
    if (active && font !== active) flush();
    active = font;
    buf += glyph;
  }
  flush();
  return runs;
}

function runsWidth(runs: Run[], size: number): number {
  return runs.reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0);
}

function textWidth(text: string, faces: Faces, size: number): number {
  return runsWidth(toRuns(text, faces), size);
}

function draw(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  faces: Faces,
  color: PdfColor,
): void {
  let cx = x;
  for (const run of toRuns(text, faces)) {
    page.drawText(run.text, { x: cx, y, size, font: run.font, color });
    cx += run.font.widthOfTextAtSize(run.text, size);
  }
}

// Greedy word-wrap; a single word wider than maxWidth is hard-broken by character so
// long hashes or spaceless scripts still fit instead of being clipped at a fixed cap.
function wrapLines(
  text: string,
  faces: Faces,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, faces, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    if (textWidth(word, faces, size) > maxWidth) {
      let chunk = '';
      for (const ch of word) {
        if (chunk && textWidth(chunk + ch, faces, size) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function extractFields(contentJson: unknown): Array<[string, string]> {
  if (!contentJson || typeof contentJson !== 'object') return [];
  const root = contentJson as Record<string, unknown>;
  const subject = root.credentialSubject;
  const source =
    subject && typeof subject === 'object'
      ? (subject as Record<string, unknown>)
      : root;
  return Object.entries(source)
    .filter(([, value]) => value != null && typeof value !== 'object')
    .map(([key, value]) => [humanize(key), String(value)] as [string, string])
    .slice(0, 16);
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
