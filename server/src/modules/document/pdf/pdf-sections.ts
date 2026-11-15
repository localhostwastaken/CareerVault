// The blocks of the issued letter, top to bottom. Each block asks the canvas for the space
// it needs, so any block can start a new page.
import { A4, COLOR, CONTENT_WIDTH, MARGIN, type Canvas } from './pdf-canvas.js';
import { formatRupees, initials } from './pdf-format.js';
import type { LetterContent, MoneyLine } from './letter-content.js';
import { textWidth, wrap } from './pdf-text.js';

export interface Org {
  name: string;
  domain: string;
}
export interface Signers {
  managerName: string | null;
  hrName: string | null;
}
const RIGHT = MARGIN + CONTENT_WIDTH;

export function letterhead(c: Canvas, org: Org, letter: LetterContent): void {
  const top = A4.height - 44;
  c.page.drawRectangle({
    x: MARGIN,
    y: top - 40,
    width: 40,
    height: 40,
    color: COLOR.seal,
  });
  const mark = initials(org.name);
  c.text(
    mark,
    MARGIN + 20 - textWidth(mark, c.faces.serif, 16) / 2,
    top - 26,
    16,
    c.faces.serif,
    COLOR.white,
  );
  c.text(org.name, MARGIN + 54, top - 17, 19, c.faces.serif, COLOR.ink);
  c.icon('badgeCheck', MARGIN + 54, top - 24, 10, COLOR.verified);
  c.text(
    `Verified organisation  ·  ${org.domain}`,
    MARGIN + 68,
    top - 33,
    8.5,
    c.faces.sans,
    COLOR.muted,
  );

  let y = top - 8;
  for (const [label, value] of [
    ['Reference', letter.reference],
    ['Date of issue', letter.issueDate],
  ] as const) {
    if (!value) continue;
    c.micro(
      label,
      RIGHT - textWidth(label.toUpperCase(), c.faces.sansBold, 7),
      y,
    );
    c.textRight(value, RIGHT, y - 12, 9.5, c.faces.mono, COLOR.ink);
    y -= 28;
  }
  const ruleY = top - 62;
  c.rule(ruleY, COLOR.ruleStrong, 0.75);
  c.page.drawRectangle({
    x: MARGIN,
    y: ruleY - 1,
    width: 48,
    height: 2.5,
    color: COLOR.anchor,
  });
  c.y = ruleY - 40;
}

export function continuationHeader(org: Org, letter: LetterContent) {
  return (c: Canvas): void => {
    const y = A4.height - 40;
    c.text(org.name, MARGIN, y, 11, c.faces.serif, COLOR.ink);
    c.textRight(
      `${letter.title}${letter.reference ? `  ·  ${letter.reference}` : ''}`,
      RIGHT,
      y,
      8.5,
      c.faces.mono,
      COLOR.subtle,
    );
    c.rule(y - 14, COLOR.rule);
  };
}

export function title(c: Canvas, letter: LetterContent): void {
  c.text(letter.title, MARGIN, c.y, 25, c.faces.serif, COLOR.ink);
  c.y -= 20;
  c.text(letter.subtitle, MARGIN, c.y, 10.5, c.faces.serifMedium, COLOR.muted);
  c.y -= 26;
}

export function prose(c: Canvas, paragraphs: string[]): void {
  for (const paragraph of paragraphs) {
    for (const line of wrap(paragraph, c.faces.sans, 10.5, CONTENT_WIDTH)) {
      c.ensure(16);
      c.text(line, MARGIN, c.y, 10.5, c.faces.sans, COLOR.ink);
      c.y -= 16.5;
    }
    c.y -= 9;
  }
}

function sectionHeading(c: Canvas, label: string): void {
  c.ensure(40);
  c.y -= 6;
  c.micro(label, MARGIN, c.y);
  c.y -= 8;
  c.rule(c.y, COLOR.ruleStrong, 0.75);
}

// Two-column grid of label-over-value cells: formal, and half the height of a list.
export function particulars(c: Canvas, facts: LetterContent['facts']): void {
  if (!facts.length) return;
  sectionHeading(c, 'Particulars');
  const column = (CONTENT_WIDTH - 24) / 2;
  for (let i = 0; i < facts.length; i += 2) {
    const row = facts.slice(i, i + 2);
    const cells = row.map(([, value]) => wrap(value, c.faces.sans, 10, column));
    const height = 20 + Math.max(...cells.map((lines) => lines.length)) * 13;
    c.ensure(height);
    row.forEach(([label], j) => {
      const x = MARGIN + j * (column + 24);
      c.micro(label, x, c.y - 14);
      cells[j].forEach((line, k) =>
        c.text(line, x, c.y - 27 - k * 13, 10, c.faces.sans, COLOR.ink),
      );
    });
    c.y -= height + 4;
    c.rule(c.y, COLOR.rule, 0.5);
  }
  c.y -= 20;
}

function moneyColumn(
  c: Canvas,
  x: number,
  width: number,
  heading: string,
  lines: MoneyLine[],
  totalLabel: string,
): number {
  let y = c.y;
  c.micro(heading, x, y);
  y -= 8;
  c.rule(y, COLOR.ruleStrong, 0.75, x, width);
  for (const line of lines) {
    c.text(line.label, x, y - 15, 9.5, c.faces.sans, COLOR.muted);
    c.textRight(
      formatRupees(line.paise),
      x + width,
      y - 15,
      9.5,
      c.faces.mono,
      COLOR.ink,
    );
    y -= 20;
    c.rule(y, COLOR.rule, 0.5, x, width);
  }
  const total = lines.reduce((sum, l) => sum + l.paise, 0);
  c.text(totalLabel, x, y - 16, 9.5, c.faces.sansBold, COLOR.ink);
  c.textRight(
    formatRupees(total),
    x + width,
    y - 16,
    9.5,
    c.faces.mono,
    COLOR.ink,
  );
  return total;
}

export function salaryTable(
  c: Canvas,
  salary: NonNullable<LetterContent['salary']>,
): void {
  const rows = Math.max(salary.earnings.length, salary.deductions.length);
  c.ensure(70 + rows * 20 + 60);
  c.y -= 6;
  const half = (CONTENT_WIDTH - 24) / 2;
  const gross = moneyColumn(
    c,
    MARGIN,
    half,
    'Earnings',
    salary.earnings,
    'Gross earnings',
  );
  const deducted = moneyColumn(
    c,
    MARGIN + half + 24,
    half,
    'Deductions',
    salary.deductions,
    'Total deductions',
  );
  c.y -= 8 + rows * 20 + 58;
  c.page.drawRectangle({
    x: MARGIN,
    y: c.y - 14,
    width: CONTENT_WIDTH,
    height: 34,
    color: COLOR.well,
  });
  c.page.drawRectangle({
    x: MARGIN,
    y: c.y - 14,
    width: 3,
    height: 34,
    color: COLOR.seal,
  });
  c.text(
    'Net pay for the period',
    MARGIN + 16,
    c.y,
    11,
    c.faces.serif,
    COLOR.ink,
  );
  c.textRight(
    formatRupees(gross - deducted),
    RIGHT - 14,
    c.y,
    13,
    c.faces.serif,
    COLOR.seal,
  );
  c.y -= 40;
}

export function strengths(c: Canvas, items: string[] | undefined): void {
  if (!items?.length) return;
  sectionHeading(c, 'Key strengths');
  c.y -= 24;
  let x = MARGIN;
  for (const item of items) {
    const width = textWidth(item, c.faces.sans, 9) + 20;
    if (x + width > RIGHT) {
      x = MARGIN;
      c.y -= 26;
    }
    c.page.drawRectangle({
      x,
      y: c.y - 6,
      width,
      height: 20,
      borderColor: COLOR.ruleStrong,
      borderWidth: 0.75,
    });
    c.text(item, x + 10, c.y, 9, c.faces.sans, COLOR.ink);
    x += width + 8;
  }
  c.y -= 34;
}

function signatureBlock(
  c: Canvas,
  x: number,
  width: number,
  top: number,
  who: { role: string; name: string; icon: 'penLine' | 'stamp'; line: string },
): void {
  const height = 96;
  c.page.drawRectangle({
    x,
    y: top - height,
    width,
    height,
    borderColor: COLOR.rule,
    borderWidth: 0.75,
  });
  c.page.drawRectangle({ x, y: top - 2, width, height: 2, color: COLOR.seal });
  c.icon(who.icon, x + 14, top - 14, 12, COLOR.seal);
  c.micro(who.role, x + 32, top - 24);
  c.text(who.name, x + 14, top - 50, 14, c.faces.serif, COLOR.ink);
  c.rule(top - 60, COLOR.rule, 0.5, x + 14, width - 28);
  c.icon('badgeCheck', x + 14, top - 68, 9, COLOR.verified);
  c.text(who.line, x + 27, top - 76, 8, c.faces.sans, COLOR.verified);
}

export function signatures(c: Canvas, org: Org, signers: Signers): void {
  c.ensure(126);
  c.y -= 4;
  const half = (CONTENT_WIDTH - 16) / 2;
  signatureBlock(c, MARGIN, half, c.y, {
    role: `Signed by · Manager, ${org.name}`,
    name: signers.managerName ?? 'Authorised manager',
    icon: 'penLine',
    line: 'Sealed with the manager’s personal signing key',
  });
  signatureBlock(c, MARGIN + half + 16, half, c.y, {
    role: `Co-signed by · HR, ${org.name}`,
    name: signers.hrName ?? 'Human Resources',
    icon: 'stamp',
    line: 'Co-sealed with HR’s personal signing key',
  });
  c.y -= 120;
}

export function verification(
  c: Canvas,
  verifyUrl: string,
  documentId: string,
): void {
  const height = 104;
  const disclaimer = wrap(
    'The verification page recomputes both signatures from the issuer’s encrypted record and shows the content it covers. A printed or forwarded copy is not proof on its own; compare it with what the verification page shows.',
    c.faces.sans,
    7.5,
    CONTENT_WIDTH,
  );
  // The panel and its disclaimer stay on one page together.
  c.ensure(height + 14 + disclaimer.length * 11);
  const top = c.y;
  c.page.drawRectangle({
    x: MARGIN,
    y: top - height,
    width: CONTENT_WIDTH,
    height,
    color: COLOR.well,
  });
  c.page.drawRectangle({
    x: MARGIN,
    y: top - height,
    width: 3,
    height,
    color: COLOR.seal,
  });
  c.icon('shieldCheck', MARGIN + 18, top - 16, 20, COLOR.seal);
  c.text(
    'Verify this document',
    MARGIN + 48,
    top - 30,
    13,
    c.faces.serif,
    COLOR.ink,
  );
  c.text(
    'Free, instant and with no account. Open the link below or enter the document ID.',
    MARGIN + 48,
    top - 45,
    8.5,
    c.faces.sans,
    COLOR.muted,
  );
  c.micro('Verification link', MARGIN + 48, top - 63);
  c.text(verifyUrl, MARGIN + 48, top - 75, 7.6, c.faces.mono, COLOR.seal);
  c.micro('Document ID', MARGIN + 48, top - 89);
  c.text(documentId, MARGIN + 110, top - 89, 8.5, c.faces.mono, COLOR.ink);
  c.y = top - height - 14;
  // Honest scope: the verdict comes from the issuer's record, not from this printout.
  for (const line of disclaimer) {
    c.text(line, MARGIN, c.y, 7.5, c.faces.sans, COLOR.subtle);
    c.y -= 11;
  }
}

export function footers(c: Canvas, org: Org): void {
  c.pages.forEach((page, i) => {
    c.page = page;
    c.rule(44, COLOR.rule, 0.5);
    c.text(
      `Issued by ${org.name} through CareerVault`,
      MARGIN,
      30,
      7.5,
      c.faces.sans,
      COLOR.subtle,
    );
    c.textRight(
      `Page ${i + 1} of ${c.pages.length}`,
      RIGHT,
      30,
      7.5,
      c.faces.sans,
      COLOR.subtle,
    );
  });
}
