import { Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { EmployeeSecretsDto } from '../../employee-key/dto/employee-secrets.dto.js';

export class SignDocumentDto {
  // The credential content the manager signs; validated per type by content-validation.ts.
  @IsObject()
  contentJson!: Record<string, unknown>;

  // Step-up: the manager's own details, re-derived into their employee key to seal this.
  @ValidateNested()
  @Type(() => EmployeeSecretsDto)
  stepUp!: EmployeeSecretsDto;
}
