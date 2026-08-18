import { UnprocessableEntityException } from '@nestjs/common';
import {
  validateAndNormalizeSubject,
  makeReferenceNumber,
} from './content-validation.js';

const CTX = {
  issueDate: '2026-08-10',
  referenceNumber: 'ACME/EXP/2026/ABC123',
};

const experience = () => ({
  letterKind: 'EXPERIENCE_CUM_RELIEVING',
  employeeName: 'Priya Sharma',
  employeeCode: 'EMP-2019-04832',
  designation: 'Senior Software Engineer',
  employmentType: 'FULL_TIME',
  dateOfJoining: '2019-06-14',
  lastWorkingDay: '2024-08-30',
  reasonForLeaving: 'RESIGNATION',
  conductSummary:
    'Priya was employed with us and demonstrated strong technical ownership throughout her tenure.',
  signatoryName: 'Anita Rao',
  signatoryDesignation: 'Head — Human Resources',
});

const salary = () => ({
  employeeName: 'Ananya Iyer',
  employeeCode: 'TCPL-04821',
  designation: 'Senior Software Engineer',
  employmentStatus: 'ACTIVE',
  dateOfJoining: '2021-06-14',
  payFrequency: 'MONTHLY',
  periodStart: '2025-07-01',
  periodEnd: '2025-07-31',
  basicPaise: 5_000_000,
  hraPaise: 2_500_000,
  specialAllowancePaise: 3_500_000,
  pfEmployeePaise: 600_000,
  professionalTaxPaise: 20_000,
  incomeTaxTdsPaise: 1_500_000,
  signatoryName: 'Priya Nair',
  signatoryDesignation: 'Head of Human Resources',
});

const lor = () => ({
  candidateName: 'Ananya Krishnan',
  recommenderName: 'Rajesh Menon',
  recommenderTitle: 'Engineering Manager',
  recommenderEmail: 'rajesh.menon@zeta.in',
  relationshipType: 'DIRECT_SUPERVISOR',
  organizationContext: 'Payments Platform, Zeta Systems',
  relationshipStartDate: '2021-06-14',
  overallAssessment:
    'I managed Ananya directly for three years and she consistently operated a level above her title.',
});

describe('validateAndNormalizeSubject', () => {
  it('rejects empty content for every document type (closes the @IsObject hole)', async () => {
    for (const type of [
      'EXPERIENCE_LETTER',
      'SALARY_PROOF',
      'LETTER_OF_RECOMMENDATION',
    ] as const) {
      await expect(
        validateAndNormalizeSubject(type, {}, CTX),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    }
  });

  it('rejects unknown keys so they can never enter the signed payload', async () => {
    await expect(
      validateAndNormalizeSubject(
        'EXPERIENCE_LETTER',
        { ...experience(), attackerControlled: 'x' },
        CTX,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('accepts a valid experience letter and injects the server-authored fields', async () => {
    const out = await validateAndNormalizeSubject(
      'EXPERIENCE_LETTER',
      experience(),
      CTX,
    );
    expect(out.schemaVersion).toBe('exp-letter/1');
    expect(out.issueDate).toBe(CTX.issueDate);
    expect(out.referenceNumber).toBe(CTX.referenceNumber);
    expect(out.employeeName).toBe('Priya Sharma');
  });

  it('accepts the legacy credentialSubject wrapper but stores a FLAT subject', async () => {
    const out = await validateAndNormalizeSubject(
      'EXPERIENCE_LETTER',
      { credentialSubject: experience() },
      CTX,
    );
    expect(out.credentialSubject).toBeUndefined();
    expect(out.designation).toBe('Senior Software Engineer');
  });

  it('requires the separation block only when the letter certifies a separation', async () => {
    // Rebuilt without the separation block rather than destructured away — the discarded
    // bindings tripped no-unused-vars, and the intent reads the same.
    const rest: Record<string, unknown> = { ...experience() };
    delete rest.lastWorkingDay;
    delete rest.reasonForLeaving;
    // RELIEVING without a last working day / reason must fail...
    await expect(
      validateAndNormalizeSubject(
        'EXPERIENCE_LETTER',
        { ...rest, letterKind: 'RELIEVING' },
        CTX,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    // ...while a plain experience letter for a still-employed person is valid.
    const out = await validateAndNormalizeSubject(
      'EXPERIENCE_LETTER',
      { ...rest, letterKind: 'EXPERIENCE' },
      CTX,
    );
    expect(out.lastWorkingDay).toBeUndefined();
  });

  it('rejects a last working day before the date of joining', async () => {
    await expect(
      validateAndNormalizeSubject(
        'EXPERIENCE_LETTER',
        { ...experience(), lastWorkingDay: '2018-01-01' },
        CTX,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('computes salary gross/deductions/net authoritatively in paise', async () => {
    const out = await validateAndNormalizeSubject(
      'SALARY_PROOF',
      salary(),
      CTX,
    );
    expect(out.grossEarningsPaise).toBe(11_000_000);
    expect(out.totalDeductionsPaise).toBe(2_120_000);
    expect(out.netPayPaise).toBe(8_880_000);
    expect(out.currency).toBe('INR');
    expect(out.minorUnit).toBe('paise');
  });

  it('ignores client-supplied totals — the server is the sole author', async () => {
    // Inflated totals are unknown keys to the DTO, so they are rejected outright
    // rather than silently trusted.
    await expect(
      validateAndNormalizeSubject(
        'SALARY_PROOF',
        { ...salary(), netPayPaise: 99_999_999 },
        CTX,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a salary whose deductions exceed gross earnings', async () => {
    await expect(
      validateAndNormalizeSubject(
        'SALARY_PROOF',
        { ...salary(), incomeTaxTdsPaise: 50_000_000 },
        CTX,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a malformed masked PAN', async () => {
    await expect(
      validateAndNormalizeSubject(
        'SALARY_PROOF',
        { ...salary(), panMasked: 'ABCDE1234F' },
        CTX,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('binds the recommender inside the signed LOR subject', async () => {
    const out = await validateAndNormalizeSubject(
      'LETTER_OF_RECOMMENDATION',
      lor(),
      CTX,
    );
    expect(out.recommenderName).toBe('Rajesh Menon');
    expect(out.recommenderEmail).toBe('rajesh.menon@zeta.in');
    expect(out.relationshipType).toBe('DIRECT_SUPERVISOR');
  });

  it('normalizes away empty values so the signed bytes are deterministic', async () => {
    const out = await validateAndNormalizeSubject(
      'EXPERIENCE_LETTER',
      { ...experience(), department: '', workLocation: undefined },
      CTX,
    );
    expect('department' in out).toBe(false);
    expect('workLocation' in out).toBe(false);
  });
});

describe('makeReferenceNumber', () => {
  it('builds a per-org, per-type reference', () => {
    const ref = makeReferenceNumber(
      'EXPERIENCE_LETTER',
      'TechCorp Pvt Ltd',
      new Date('2026-08-10T00:00:00Z'),
      'A1B2C3',
    );
    expect(ref).toBe('TECHCO/EXP/2026/A1B2C3');
  });

  it('falls back to ORG when the name has no alphanumerics', () => {
    expect(
      makeReferenceNumber(
        'SALARY_PROOF',
        '—',
        new Date('2026-01-01T00:00:00Z'),
        'X',
      ),
    ).toBe('ORG/SAL/2026/X');
  });
});
