import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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

// Headless PDF rendering via pdf-lib (no Chromium). Phase 3 embeds the Merkle proof
// into the PDF metadata; for now we render the letter + the document hash footer.
@Injectable()
export class PdfGenerationService {
  constructor(private readonly storage: StorageService) {}

  async generateAndStore(doc: DocLike, org: OrgLike): Promise<string> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const navy = rgb(0.118, 0.227, 0.541);
    const ink = rgb(0.06, 0.09, 0.16);
    const muted = rgb(0.39, 0.45, 0.55);

    let y = 800;
    page.drawText(org.name, { x: 56, y, size: 18, font: bold, color: navy });
    y -= 15;
    page.drawText(org.domain, { x: 56, y, size: 10, font, color: muted });
    y -= 40;
    page.drawText(TITLES[doc.type] ?? 'Career Document', {
      x: 56,
      y,
      size: 22,
      font: bold,
      color: ink,
    });
    y -= 34;

    for (const [label, value] of extractFields(doc.contentJson)) {
      page.drawText(`${label}:`, {
        x: 56,
        y,
        size: 11,
        font: bold,
        color: ink,
      });
      page.drawText(value.slice(0, 60), {
        x: 210,
        y,
        size: 11,
        font,
        color: ink,
      });
      y -= 18;
      if (y < 130) break;
    }

    page.drawLine({
      start: { x: 56, y: 100 },
      end: { x: 539, y: 100 },
      thickness: 0.5,
      color: muted,
    });
    page.drawText('Document hash (SHA-256):', {
      x: 56,
      y: 84,
      size: 8,
      font: bold,
      color: muted,
    });
    page.drawText(doc.documentHash ?? '—', {
      x: 56,
      y: 72,
      size: 8,
      font,
      color: muted,
    });
    page.drawText('Verify authenticity at careervault.io', {
      x: 56,
      y: 56,
      size: 8,
      font,
      color: muted,
    });

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
