import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

// India-first experience / relieving letter (one type, discriminated by letterKind).
// A relieving letter is issued only on separation and carries the separation block;
// a plain experience letter can be issued to a current employee and omits it.
export const LETTER_KINDS = [
  'EXPERIENCE',
  'RELIEVING',
  'EXPERIENCE_CUM_RELIEVING',
] as const;
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'CONTRACT',
  'INTERN',
  'CONSULTANT',
] as const;
export const REASONS_FOR_LEAVING = [
  'RESIGNATION',
  'TERMINATION',
  'MUTUAL_SEPARATION',
  'CONTRACT_END',
  'RETIREMENT',
] as const;
export const NOTICE_PERIOD_SERVED = [
  'SERVED_IN_FULL',
  'WAIVED',
  'SHORTFALL_RECOVERED',
  'PAY_IN_LIEU',
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isSeparation = (o: ExperienceLetterSubjectDto): boolean =>
  o.letterKind !== 'EXPERIENCE';

export class ExperienceLetterSubjectDto {
  @IsIn(LETTER_KINDS)
  letterKind!: (typeof LETTER_KINDS)[number];

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

  @IsIn(EMPLOYMENT_TYPES)
  employmentType!: (typeof EMPLOYMENT_TYPES)[number];

  @Matches(ISO_DATE, { message: 'dateOfJoining must be YYYY-MM-DD' })
  dateOfJoining!: string;

  // Required only when the letter certifies a separation.
  @ValidateIf(isSeparation)
  @Matches(ISO_DATE, { message: 'lastWorkingDay must be YYYY-MM-DD' })
  lastWorkingDay?: string;

  @ValidateIf(isSeparation)
  @IsIn(REASONS_FOR_LEAVING)
  reasonForLeaving?: (typeof REASONS_FOR_LEAVING)[number];

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  conductSummary!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  signatoryName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  signatoryDesignation!: string;

  // ── optional ("add more detail") ──────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsIn(NOTICE_PERIOD_SERVED)
  noticePeriodServed?: (typeof NOTICE_PERIOD_SERVED)[number];

  @IsOptional()
  @IsBoolean()
  duesSettled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reportingManager?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  placeOfIssue?: string;

  // Last-drawn CTC is optional and PRIVATE (never shown on the public hash view).
  // Omit by default — confidential pay belongs on a SALARY_PROOF the holder shares
  // selectively, not broadcast on every experience letter.
  @IsOptional()
  @IsInt()
  @Min(0)
  lastDrawnCtcPaise?: number;
}
