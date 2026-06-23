import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ResubmitRequestDto {
  @IsOptional()
  @IsIn(['EXPERIENCE_LETTER', 'LETTER_OF_RECOMMENDATION', 'SALARY_PROOF'])
  type?: 'EXPERIENCE_LETTER' | 'LETTER_OF_RECOMMENDATION' | 'SALARY_PROOF';

  @IsOptional()
  @IsUUID()
  managerUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
