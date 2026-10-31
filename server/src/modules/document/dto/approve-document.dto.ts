import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EmployeeSecretsDto } from '../../employee-key/dto/employee-secrets.dto.js';

export class ApproveDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  // Step-up: HR's own details, re-derived into their employee key to seal the co-signature.
  @ValidateNested()
  @Type(() => EmployeeSecretsDto)
  stepUp!: EmployeeSecretsDto;
}
