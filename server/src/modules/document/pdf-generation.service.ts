import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import { StorageService } from '../../services/storage/storage.service.js';
import { pdfStorageKey } from './pdf-storage-key.js';
import { Canvas } from './pdf/pdf-canvas.js';
import { letterContent } from './pdf/letter-content.js';
import { embedFaces } from './pdf/pdf-text.js';
import {
  continuationHeader,
  footers,
  letterhead,
  particulars,
  prose,
  salaryTable,
  signatures,
  strengths,
  title,
  verification,
  type Org,
  type Signers,
} from './pdf/pdf-sections.js';

interface DocLike {
  id: string;
  type: string;
  contentJson: unknown;
}

// Headless PDF rendering via pdf-lib (no Chromium): a formal letter on the issuer's
// letterhead, the particulars, both signers, and a verification panel. Verification is by
// ID on our server, so the PDF carries nothing cryptographic (no hash, no algorithm names),
// and its wording says a printout alone is not proof. Content flows across pages (F16).
@Injectable()
export class PdfGenerationService {
  private readonly verifyBase: string;

  constructor(
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    // CORS_ORIGIN is the client's own origin, which is where /verify/:id lives.
    this.verifyBase = (
      config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  async generateAndStore(
    doc: DocLike,
    org: Org,
    signers: Signers = { managerName: null, hrName: null },
  ): Promise<string> {
    const pdf = await PDFDocument.create();
    const faces = await embedFaces(pdf);
    const letter = letterContent(doc.type, doc.contentJson, org.name);
    pdf.setTitle(`${letter.title} — ${letter.holderName}`);
    pdf.setAuthor(org.name);
    pdf.setCreator('CareerVault');

    const canvas = new Canvas(pdf, faces, continuationHeader(org, letter));
    canvas.start();
    letterhead(canvas, org, letter);
    title(canvas, letter);
    prose(canvas, letter.paragraphs);
    if (letter.salary) salaryTable(canvas, letter.salary);
    strengths(canvas, letter.strengths);
    particulars(canvas, letter.facts);
    signatures(canvas, org, signers);
    verification(canvas, `${this.verifyBase}/verify/${doc.id}`, doc.id);
    footers(canvas, org);

    const bytes = await pdf.save();
    await this.storage.put(
      pdfStorageKey(doc.id),
      Buffer.from(bytes),
      'application/pdf',
    );
    return `/api/v1/documents/${doc.id}/download`;
  }

  // Stamps the Merkle anchor into the issued PDF's metadata once it has been anchored.
  // Archival only — verification reads the DB, never the PDF — so callers treat it as
  // best-effort (a missing PDF throws here and is swallowed upstream).
  async embedAnchorMetadata(
    documentId: string,
    anchor: { rootHash: string; txHash: string },
  ): Promise<void> {
    const key = pdfStorageKey(documentId);
    const existing = await this.storage.get(key);
    const pdf = await PDFDocument.load(existing);
    pdf.setSubject(`CareerVault anchor — Merkle root ${anchor.rootHash}`);
    pdf.setKeywords([`merkleRoot:${anchor.rootHash}`, `tx:${anchor.txHash}`]);
    pdf.setProducer('CareerVault AnchorEngine');
    const bytes = await pdf.save();
    await this.storage.put(key, Buffer.from(bytes), 'application/pdf');
  }
}
