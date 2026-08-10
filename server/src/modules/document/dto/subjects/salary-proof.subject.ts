import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// India-first salary / income certificate. Money is integer PAISE (never floats or
// coerced strings) so JCS canonicalization is byte-stable and the gross/net
// reconciliation holds exactly. The server is the SOLE author of the gross/deductions/
// net totals — see content-validation.ts — so those are not client-supplied here.
export const PAY_FREQUENCIES = ['MONTHLY', 'ANNUAL'] as const;
export const EMPLOYMENT_STATUSES = ['ACTIVE', 'ON_NOTICE'] as const;
export const SALARY_EMPLOYMENT_TYPES = [
  'PERMANENT',
  'FIXED_TERM_CONTRACT',
  'PROBATION',
  'INTERN',
  'CONSULTANT',
] as const;
export const SALARY_PURPOSES = [
  'GENERAL',
  'HOME_LOAN',
  'VEHICLE_LOAN',
  'PERSONAL_LOAN',
  'CREDIT_CARD',
  'RENTAL_AGREEMENT',
  'VISA_APPLICATION',
  'BACKGROUND_VERIFICATION',
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SalaryProofSubjectDto {
  // ── identity / employment (auto-filled from holder + membership) ───────────
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  employeeName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  employeeCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  designation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsIn(SALARY_EMPLOYMENT_TYPES)
  employmentType?: (typeof SALARY_EMPLOYMENT_TYPES)[number];

  @IsIn(EMPLOYMENT_STATUSES)
  employmentStatus!: (typeof EMPLOYMENT_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workLocation?: string;

  @Matches(ISO_DATE, { message: 'dateOfJoining must be YYYY-MM-DD' })
  dateOfJoining!: string;

  // ── period ─────────────────────────────────────────────────────────────────
  @IsIn(PAY_FREQUENCIES)
  payFrequency!: (typeof PAY_FREQUENCIES)[number];

  @Matches(ISO_DATE, { message: 'periodStart must be YYYY-MM-DD' })
  periodStart!: string;

  @Matches(ISO_DATE, { message: 'periodEnd must be YYYY-MM-DD' })
  periodEnd!: string;

  // ── earnings (integer paise, in the payFrequency unit) ─────────────────────
  @IsInt()
  @Min(0)
  basicPaise!: number;

  @IsInt()
  @Min(0)
  hraPaise!: number;

  @IsInt()
  @Min(0)
  specialAllowancePaise!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ltaPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  conveyanceAllowancePaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  medicalAllowancePaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  variablePayPaise?: number;

  // ── deductions (integer paise) ─────────────────────────────────────────────
  @IsInt()
  @Min(0)
  pfEmployeePaise!: number;

  @IsInt()
  @Min(0)
  professionalTaxPaise!: number;

  @IsInt()
  @Min(0)
  incomeTaxTdsPaise!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  esiEmployeePaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  otherDeductionsPaise?: number;

  // ── CTC-side (excluded from gross earnings) ────────────────────────────────
  @IsOptional()
  @IsInt()
  @Min(0)
  employerPfPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gratuityPaise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  annualCtcPaise?: number;

  // ── statutory identifiers (PRIVATE — never on the public hash view) ────────
  // PAN stored MASKED only (e.g. XXXXX4821K) — a certificate never needs the full PAN.
  @IsOptional()
  @Matches(/^X{5}\d{4}[A-Z]$/, { message: 'panMasked must look like XXXXX4821K' })
  panMasked?: string;

  @IsOptional()
  @Matches(/^\d{12}$/, { message: 'uanNumber must be 12 digits' })
  uanNumber?: string;

  // ── signatory / provenance ─────────────────────────────────────────────────
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  signatoryName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  signatoryDesignation!: string;

  @IsOptional()
  @IsIn(SALARY_PURPOSES)
  purpose?: (typeof SALARY_PURPOSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(280)
  remarks?: string;
}
