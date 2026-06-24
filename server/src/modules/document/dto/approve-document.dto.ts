import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
