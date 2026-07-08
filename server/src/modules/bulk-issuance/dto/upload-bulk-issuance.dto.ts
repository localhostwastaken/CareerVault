import { IsIn, IsUUID } from 'class-validator';

// Bulk issuance is restricted to the two 1-to-many document types - LORs stay 1-to-1 through the normal request/sign/approve pipeline.
export class UploadBulkIssuanceDto {
  @IsUUID()
  organizationId!: string;

  @IsIn(['EXPERIENCE_LETTER', 'SALARY_PROOF'])
  documentType!: 'EXPERIENCE_LETTER' | 'SALARY_PROOF';
}
