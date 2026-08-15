import { UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { DocumentType } from '../../generated/prisma/enums.js';
import { normalizeSubject } from '../../common/utils/crypto.util.js';
import { ExperienceLetterSubjectDto } from './dto/subjects/experience-letter.subject.js';
import { SalaryProofSubjectDto } from './dto/subjects/salary-proof.subject.js';
import { LetterOfRecommendationSubjectDto } from './dto/subjects/lor.subject.js';

// Server-authoritative content model. Both the interactive sign path and the bulk-CSV
// path funnel through here, so the two can never diverge, and the @IsObject() hole
// (which let a SALARY_PROOF be issued with `{}`) is closed. The RETURNED object is the
// exact, normalized subject that gets stored, hashed, and signed.

const SCHEMA_VERSION: Record<DocumentType, string> = {
  EXPERIENCE_LETTER: 'exp-letter/1',
  SALARY_PROOF: 'salary-proof/1',
  LETTER_OF_RECOMMENDATION: 'lor/1',
};

const DTO_BY_TYPE = {
  EXPERIENCE_LETTER: ExperienceLetterSubjectDto,
  SALARY_PROOF: SalaryProofSubjectDto,
  LETTER_OF_RECOMMENDATION: LetterOfRecommendationSubjectDto,
} as const;

export interface SubjectContext {
  // Set once at signing time so the signed payload is deterministic and the issue
  // date/reference are cryptographically bound rather than living only in the envelope.
  issueDate: string; // YYYY-MM-DD
  referenceNumber: string;
}

// Prefer an explicit `credentialSubject` wrapper (legacy interactive shape) but accept a
// flat object too (bulk path). Everything downstream stores/hashes the flat subject.
function extractSubject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new UnprocessableEntityException('Document content is required');
  }
  const root = raw as Record<string, unknown>;
  const inner = root.credentialSubject;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return root;
}

function flatten(messages: string[], errs: unknown): void {
  for (const e of errs as Array<{
    constraints?: Record<string, string>;
    children?: unknown;
  }>) {
    if (e.constraints) messages.push(...Object.values(e.constraints));
    if (Array.isArray(e.children) && e.children.length)
      flatten(messages, e.children);
  }
}

export async function validateAndNormalizeSubject(
  documentType: DocumentType,
  rawContentJson: unknown,
  ctx: SubjectContext,
): Promise<Record<string, unknown>> {
  const subject = extractSubject(rawContentJson);
  const Cls = DTO_BY_TYPE[documentType] as new () => object;
  const dto = plainToInstance(Cls, subject, {
    enableImplicitConversion: false,
  });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });
  if (errors.length) {
    const messages: string[] = [];
    flatten(messages, errors);
    throw new UnprocessableEntityException({
      message: 'Document content is invalid',
      details: messages,
    });
  }

  // class-validator leaves the (validated) instance; build a plain record from it.
  const validated = { ...(dto as Record<string, unknown>) };
  validated.schemaVersion = SCHEMA_VERSION[documentType];
  validated.issueDate = ctx.issueDate;

  if (documentType === 'EXPERIENCE_LETTER') {
    validated.referenceNumber = ctx.referenceNumber;
    assertDateOrder(
      validated.dateOfJoining as string,
      validated.lastWorkingDay as string | undefined,
      'lastWorkingDay must be on or after dateOfJoining',
    );
  }

  if (documentType === 'SALARY_PROOF') {
    validated.referenceNumber = ctx.referenceNumber;
    reconcileSalary(validated);
    assertDateOrder(
      validated.periodStart as string,
      validated.periodEnd as string,
      'periodEnd must be on or after periodStart',
    );
  }

  if (documentType === 'LETTER_OF_RECOMMENDATION') {
    assertDateOrder(
      validated.relationshipStartDate as string,
      validated.relationshipEndDate as string | undefined,
      'relationshipEndDate must be on or after relationshipStartDate',
    );
  }

  return normalizeSubject(validated) as Record<string, unknown>;
}

// The server is the SOLE author of the reconciling totals — client-supplied sums are
// never trusted. gross = Σ earnings; net = gross − Σ deductions; net must be ≥ 0.
function reconcileSalary(s: Record<string, unknown>): void {
  const n = (k: string): number => (typeof s[k] === 'number' ? s[k] : 0);
  const gross =
    n('basicPaise') +
    n('hraPaise') +
    n('specialAllowancePaise') +
    n('ltaPaise') +
    n('conveyanceAllowancePaise') +
    n('medicalAllowancePaise') +
    n('variablePayPaise');
  const deductions =
    n('pfEmployeePaise') +
    n('professionalTaxPaise') +
    n('incomeTaxTdsPaise') +
    n('esiEmployeePaise') +
    n('otherDeductionsPaise');
  const net = gross - deductions;
  if (net < 0) {
    throw new UnprocessableEntityException(
      'Total deductions exceed gross earnings',
    );
  }
  s.currency = 'INR';
  s.minorUnit = 'paise';
  s.grossEarningsPaise = gross;
  s.totalDeductionsPaise = deductions;
  s.netPayPaise = net;
}

function assertDateOrder(
  start: string,
  end: string | undefined,
  message: string,
): void {
  if (!end) return;
  if (new Date(end).getTime() < new Date(start).getTime()) {
    throw new UnprocessableEntityException(message);
  }
}

// A human-friendly, per-org reference number for the signed subject, e.g.
// ACME/EXP/2026/48213. Deterministic prefix from the org, random tail for uniqueness.
export function makeReferenceNumber(
  documentType: DocumentType,
  orgName: string,
  now: Date,
  randomTail: string,
): string {
  const prefix =
    orgName
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase() || 'ORG';
  const kind =
    documentType === 'EXPERIENCE_LETTER'
      ? 'EXP'
      : documentType === 'SALARY_PROOF'
        ? 'SAL'
        : 'LOR';
  return `${prefix}/${kind}/${now.getFullYear()}/${randomTail}`;
}
