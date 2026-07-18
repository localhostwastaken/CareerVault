import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVerifierKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
