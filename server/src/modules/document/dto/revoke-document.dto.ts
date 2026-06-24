import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeDocumentDto {
  @IsIn(['ADMINISTRATIVE_ERROR', 'POLICY_VIOLATION', 'ISSUED_IN_ERROR'])
  code!: 'ADMINISTRATIVE_ERROR' | 'POLICY_VIOLATION' | 'ISSUED_IN_ERROR';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
