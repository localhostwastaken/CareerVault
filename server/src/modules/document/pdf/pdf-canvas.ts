// A cursor over A4 pages: content asks for vertical space and gets a fresh page when the
// current one is full, so nothing is ever cut off (audit F16). Colours are the "Ledger"
// tokens from the client's design system.
import {
  LineCapStyle,
  type PDFDocument,
  type PDFPage,
  rgb,
  type RGB,
} from 'pdf-lib';
import { drawText, textWidth, type Face, type Faces } from './pdf-text.js';

export const A4 = { width: 595.28, height: 841.89 };
export const MARGIN = 56;
export const CONTENT_WIDTH = A4.width - MARGIN * 2;
/** Space reserved at the bottom of every page for the footer. */
const FOOTER_SPACE = 64;
/** Where content starts on a continuation page, below its compact header. */
const CONTINUATION_TOP = A4.height - 96;

const hex = (h: string): RGB =>
  rgb(
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  );
export const COLOR = {
  ink: hex('#1A1A1A'),
  muted: hex('#4A4A4A'),
  subtle: hex('#6B6B6B'),
  rule: hex('#E0E0E0'),
  ruleStrong: hex('#C9C6BF'),
  seal: hex('#1B3A5C'),
  anchor: hex('#8A5A16'),
  verified: hex('#15803D'),
  well: hex('#F4F2EC'),
  white: rgb(1, 1, 1),
};

// Lucide icon paths (ISC licence), 24-unit grid, drawn as 2-unit strokes.
const ICONS = {
  shieldCheck: [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4',
  ],
  penLine: [
    'M12 20h9',
    'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z',
  ],
  stamp: [
    'M5 22h14',
    'M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z',
    'M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13',
  ],
  badgeCheck: [
    'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z',
    'm9 12 2 2 4-4',
  ],
} as const;
export type IconName = keyof typeof ICONS;

export class Canvas {
  readonly pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;

  constructor(
    readonly pdf: PDFDocument,
    readonly faces: Faces,
    private readonly continuationHeader: (canvas: Canvas) => void,
  ) {}

  /** The first page; the caller draws the full letterhead. */
  start(): void {
    this.addPage();
    this.y = A4.height - MARGIN;
  }

  /** Makes sure `height` points fit above the footer, starting a new page if not. */
  ensure(height: number): void {
    if (this.y - height >= FOOTER_SPACE) return;
    this.addPage();
    this.continuationHeader(this);
    this.y = CONTINUATION_TOP;
  }

  private addPage(): void {
    this.page = this.pdf.addPage([A4.width, A4.height]);
    this.pages.push(this.page);
    // A thin seal-navy band across the head of every page.
    this.page.drawRectangle({
      x: 0,
      y: A4.height - 5,
      width: A4.width,
      height: 5,
      color: COLOR.seal,
    });
  }

  text(
    value: string,
    x: number,
    y: number,
    size: number,
    face: Face,
    color: RGB = COLOR.ink,
  ): void {
    drawText(this.page, value, x, y, size, face, color);
  }

  textRight(
    value: string,
    right: number,
    y: number,
    size: number,
    face: Face,
    color: RGB = COLOR.ink,
  ): void {
    drawText(
      this.page,
      value,
      right - textWidth(value, face, size),
      y,
      size,
      face,
      color,
    );
  }

  rule(
    y: number,
    color: RGB = COLOR.rule,
    thickness = 0.6,
    x = MARGIN,
    width = CONTENT_WIDTH,
  ): void {
    this.page.drawLine({
      start: { x, y },
      end: { x: x + width, y },
      thickness,
      color,
    });
  }

  /** Draws an icon whose top-left corner is at (x, top). */
  icon(name: IconName, x: number, top: number, size: number, color: RGB): void {
    for (const path of ICONS[name]) {
      this.page.drawSvgPath(path, {
        x,
        y: top,
        scale: size / 24,
        borderColor: color,
        borderWidth: 2,
        borderLineCap: LineCapStyle.Round,
      });
    }
  }

  /** Small uppercase label above a value, the PDF twin of the app's `.label-micro`. */
  micro(value: string, x: number, y: number, color: RGB = COLOR.subtle): void {
    drawText(
      this.page,
      value.toUpperCase(),
      x,
      y,
      7,
      this.faces.sansBold,
      color,
    );
  }
}
