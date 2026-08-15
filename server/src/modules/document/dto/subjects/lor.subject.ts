import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Letter of recommendation. The recommender is bound INSIDE the signed subject
// (name/title/email/relationship) so the RS256 signatures attest WHO is vouching,
// not merely "some member of the org". LORs never expire.
export const LOR_RELATIONSHIP_TYPES = [
  'DIRECT_SUPERVISOR',
  'SKIP_LEVEL',
  'DEPARTMENT_HEAD',
  'PEER',
  'CROSS_FUNCTIONAL',
  'MENTOR',
  'CLIENT',
  'VENDOR_PARTNER',
  'PROFESSOR',
  'RESEARCH_GUIDE',
] as const;
export const LOR_ENDORSEMENT_STRENGTHS = [
  'STRONGLY_RECOMMEND',
  'RECOMMEND',
  'RECOMMEND_WITH_RESERVATIONS',
] as const;
export const LOR_CONTEXTS = [
  'HIGHER_EDUCATION',
  'EMPLOYMENT',
  'INTERNAL_PROMOTION',
  'IMMIGRATION_VISA',
  'SCHOLARSHIP_FELLOWSHIP',
  'PROFESSIONAL_MEMBERSHIP',
  'GENERAL',
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

class NotableProjectDto {
  @IsString()
  @Length(2, 120)
  title!: string;

  @IsString()
  @Length(2, 80)
  candidateRole!: string;

  @IsString()
  @Length(2, 280)
  impact!: string;
}

export class LetterOfRecommendationSubjectDto {
  // ── required (common case) ─────────────────────────────────────────────────
  @IsString()
  @Length(2, 120)
  candidateName!: string;

  @IsString()
  @Length(2, 120)
  recommenderName!: string;

  @IsString()
  @Length(2, 120)
  recommenderTitle!: string;

  @IsEmail()
  recommenderEmail!: string;

  @IsIn(LOR_RELATIONSHIP_TYPES)
  relationshipType!: (typeof LOR_RELATIONSHIP_TYPES)[number];

  @IsString()
  @Length(2, 160)
  organizationContext!: string;

  @Matches(ISO_DATE, { message: 'relationshipStartDate must be YYYY-MM-DD' })
  relationshipStartDate!: string;

  @IsString()
  @MinLength(40)
  @MaxLength(4000)
  overallAssessment!: string;

  // ── optional ("add more detail") ──────────────────────────────────────────
  @IsOptional()
  @Matches(ISO_DATE, { message: 'relationshipEndDate must be YYYY-MM-DD' })
  relationshipEndDate?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  candidateTitle?: string;

  @IsOptional()
  @IsIn(LOR_ENDORSEMENT_STRENGTHS)
  endorsementStrength?: (typeof LOR_ENDORSEMENT_STRENGTHS)[number];

  @IsOptional()
  @IsIn(LOR_CONTEXTS)
  recommendationContext?: (typeof LOR_CONTEXTS)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Length(2, 60, { each: true })
  keyStrengths?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => NotableProjectDto)
  notableProjects?: NotableProjectDto[];

  @IsOptional()
  @Matches(/^\+?[0-9][0-9\s-]{7,14}$/, { message: 'recommenderPhone is invalid' })
  recommenderPhone?: string;
}
