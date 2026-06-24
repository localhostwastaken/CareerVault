import { IsInt, IsOptional, IsPositive, IsUUID, Max } from 'class-validator';

export class CreateShareLinkDto {
  @IsUUID()
  documentId!: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(10_000)
  maxViews?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(365)
  expiresInDays?: number;
}
