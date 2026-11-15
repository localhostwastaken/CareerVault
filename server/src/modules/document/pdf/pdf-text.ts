// Fonts and text primitives for the issued PDF.
//
// Body text uses Noto Sans + Noto Sans Devanagari (StandardFonts are Latin-1 only and throw
// on Devanagari names or the ₹ sign). Headings use IBM Plex Serif and identifiers IBM Plex
// Mono, the product's own typefaces (latin subsets, OFL: assets/fonts/IBMPlex-OFL.txt);
// any glyph they lack falls back to Noto, so a heading with a Devanagari name still renders.
import 'regenerator-runtime/runtime.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import type { Font as CoverageFont } from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import type { RGB } from 'pdf-lib';

const FONT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'assets',
  'fonts',
);

const FILES = {
  sans: 'NotoSans-Regular.ttf',
  sansBold: 'NotoSans-Bold.ttf',
  deva: 'NotoSansDevanagari-Regular.ttf',
  devaBold: 'NotoSansDevanagari-Bold.ttf',
  serif: 'IBMPlexSerif-SemiBold.ttf',
  serifMedium: 'IBMPlexSerif-Medium.ttf',
  mono: 'IBMPlexMono-Regular.ttf',
} as const;
type FaceKey = keyof typeof FILES;

interface Asset {
  bytes: Uint8Array;
  coverage: CoverageFont;
}
let assets: Record<FaceKey, Asset> | null = null;
function loadAssets(): Record<FaceKey, Asset> {
  if (!assets) {
    assets = Object.fromEntries(
      Object.entries(FILES).map(([key, file]) => {
        const bytes = readFileSync(join(FONT_DIR, file));
        return [key, { bytes, coverage: fontkit.create(bytes) }];
      }),
    ) as unknown as Record<FaceKey, Asset>;
  }
  return assets;
}

/** A typeface with its fallbacks, tried in order per code point. */
export type Face = Array<{ font: PDFFont; coverage: CoverageFont }>;
export interface Faces {
  sans: Face;
  sansBold: Face;
  serif: Face;
  serifMedium: Face;
  mono: Face;
}

export async function embedFaces(pdf: PDFDocument): Promise<Faces> {
  pdf.registerFontkit(fontkit);
  const a = loadAssets();
  const embedded = {} as Record<FaceKey, PDFFont>;
  for (const key of Object.keys(FILES) as FaceKey[]) {
    // subset: only drawn glyphs are embedded, so seven faces cost little.
    embedded[key] = await pdf.embedFont(a[key].bytes, { subset: true });
  }
  const face = (...keys: FaceKey[]): Face =>
    keys.map((k) => ({ font: embedded[k], coverage: a[k].coverage }));
  return {
    sans: face('sans', 'deva'),
    sansBold: face('sansBold', 'devaBold'),
    serif: face('serif', 'sansBold', 'devaBold'),
    serifMedium: face('serifMedium', 'sans', 'deva'),
    mono: face('mono', 'sans', 'deva'),
  };
}

interface Run {
  text: string;
  font: PDFFont;
}

// Splits text into single-font runs; an uncovered code point degrades to '?' rather than
// throwing, so an unexpected script never blocks issuance.
function toRuns(text: string, face: Face): Run[] {
  const runs: Run[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const hit = face.find((f) => f.coverage.hasGlyphForCodePoint(cp));
    const font = hit?.font ?? face[0].font;
    const glyph = hit ? ch : '?';
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += glyph;
    else runs.push({ text: glyph, font });
  }
  return runs;
}

export function textWidth(text: string, face: Face, size: number): number {
  return toRuns(text, face).reduce(
    (w, r) => w + r.font.widthOfTextAtSize(r.text, size),
    0,
  );
}

export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  face: Face,
  color: RGB,
): void {
  let cx = x;
  for (const run of toRuns(text, face)) {
    page.drawText(run.text, { x: cx, y, size, font: run.font, color });
    cx += run.font.widthOfTextAtSize(run.text, size);
  }
}

// Greedy word wrap; a word wider than the line is broken by character.
export function wrap(
  text: string,
  face: Face,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, face, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const ch of word) {
      if (line && textWidth(line + ch, face, size) > maxWidth) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}
