import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import { PdfGenerationService } from './pdf-generation.service.js';
import type { StorageService } from '../../services/storage/storage.service.js';

/**
 * The issued PDF (audit F16): the old renderer drew one page and silently stopped at a
 * bottom guard, so a long conduct summary vanished from the printed letter. Content must
 * flow onto further pages instead, and every document type must render.
 */

const ORG = { name: 'TechCorp', domain: 'techcorp.example.com' };
const SIGNERS = { managerName: 'Marcus Manager', hrName: 'Hannah HR' };

const experience = (conductSummary: string) => ({
  letterKind: 'EXPERIENCE',
  employeeName: 'Alice Holder',
  employeeCode: 'TC-2041',
  designation: 'Software Engineer',
  employmentType: 'FULL_TIME',
  dateOfJoining: '2022-06-01',
  conductSummary,
  signatoryName: 'Marcus Manager',
  signatoryDesignation: 'Head — Human Resources',
  issueDate: '2026-11-15',
  referenceNumber: 'TECHCO/EXP/2026/K7M2P9',
});

const salary = {
  employeeName: 'आलिस होल्डर',
  employeeCode: 'TC-2041',
  designation: 'Software Engineer',
  employmentStatus: 'ACTIVE',
  dateOfJoining: '2022-06-01',
  payFrequency: 'MONTHLY',
  periodStart: '2026-10-01',
  periodEnd: '2026-10-31',
  basicPaise: 6_000_000,
  hraPaise: 3_000_000,
  specialAllowancePaise: 2_500_000,
  pfEmployeePaise: 720_000,
  professionalTaxPaise: 20_000,
  incomeTaxTdsPaise: 1_400_000,
  signatoryName: 'Hannah HR',
  signatoryDesignation: 'Head — Human Resources',
  issueDate: '2026-11-15',
  referenceNumber: 'TECHCO/SAL/2026/A1B2C3',
};

const recommendation = {
  candidateName: 'Alice Holder',
  recommenderName: 'Marcus Manager',
  recommenderTitle: 'Engineering Manager',
  recommenderEmail: 'marcus@techcorp.example.com',
  relationshipType: 'DIRECT_SUPERVISOR',
  organizationContext: 'Payments Platform, TechCorp',
  relationshipStartDate: '2022-06-01',
  overallAssessment:
    'Alice built our settlement service and owned its on-call rotation.',
  keyStrengths: ['Node.js', 'PostgreSQL', 'Payments'],
  issueDate: '2026-11-15',
};

function service() {
  const stored: Buffer[] = [];
  const storage = {
    put: (_key: string, data: Buffer) => {
      stored.push(data);
      return Promise.resolve({ key: _key });
    },
  } as unknown as StorageService;
  const config = {
    get: () => 'https://career-vault-steel.vercel.app',
  } as unknown as ConfigService;
  return { pdf: new PdfGenerationService(storage, config), stored };
}

async function pages(bytes: Buffer): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe('PdfGenerationService.generateAndStore', () => {
  it('renders an ordinary experience letter on one page and returns the download path', async () => {
    const { pdf, stored } = service();
    const url = await pdf.generateAndStore(
      {
        id: 'doc-1',
        type: 'EXPERIENCE_LETTER',
        contentJson: experience('Conducted herself professionally.'),
      },
      ORG,
      SIGNERS,
    );
    expect(url).toBe('/api/v1/documents/doc-1/download');
    expect(await pages(stored[0])).toBe(1);
  });

  it('flows a long letter onto further pages instead of truncating it', async () => {
    const { pdf, stored } = service();
    const long =
      'Alice led the settlement rewrite and mentored new engineers. '.repeat(
        90,
      );
    await pdf.generateAndStore(
      { id: 'doc-2', type: 'EXPERIENCE_LETTER', contentJson: experience(long) },
      ORG,
      SIGNERS,
    );
    expect(await pages(stored[0])).toBeGreaterThanOrEqual(2);
  });

  it('renders a salary proof, including a Devanagari name, and a recommendation', async () => {
    const { pdf, stored } = service();
    await pdf.generateAndStore(
      { id: 'doc-3', type: 'SALARY_PROOF', contentJson: salary },
      ORG,
      SIGNERS,
    );
    await pdf.generateAndStore(
      {
        id: 'doc-4',
        type: 'LETTER_OF_RECOMMENDATION',
        contentJson: recommendation,
      },
      ORG,
      SIGNERS,
    );
    expect(await pages(stored[0])).toBe(1);
    expect(await pages(stored[1])).toBe(1);
  });
});
