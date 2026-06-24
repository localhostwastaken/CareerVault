import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RequestDocumentDto {
  @IsIn(['EXPERIENCE_LETTER', 'LETTER_OF_RECOMMENDATION', 'SALARY_PROOF'])
  type!: 'EXPERIENCE_LETTER' | 'LETTER_OF_RECOMMENDATION' | 'SALARY_PROOF';

  @IsUUID()
  organizationId!: string;

  // Required for LORs (1-to-1); optional for experience/salary (auto-assigned otherwise).
  @IsOptional()
  @IsUUID()
  managerUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  // Holder consent (R: privacy) — opt in to AI skill extraction for talent matching.
  @IsOptional()
  @IsBoolean()
  enableSkillExtraction?: boolean;
}
