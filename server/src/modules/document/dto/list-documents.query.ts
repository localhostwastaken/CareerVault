import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

export class ListDocumentsQuery extends PaginationDto {
  @IsOptional()
  @IsIn([
    'REQUESTED',
    'DRAFT',
    'PENDING_HR',
    'ISSUED',
    'ANCHORED',
    'REVOKED',
    'EXPIRED',
  ])
  status?:
    | 'REQUESTED'
    | 'DRAFT'
    | 'PENDING_HR'
    | 'ISSUED'
    | 'ANCHORED'
    | 'REVOKED'
    | 'EXPIRED';

  @IsOptional()
  @IsIn(['EXPERIENCE_LETTER', 'LETTER_OF_RECOMMENDATION', 'SALARY_PROOF'])
  type?: 'EXPERIENCE_LETTER' | 'LETTER_OF_RECOMMENDATION' | 'SALARY_PROOF';

  // When set, restricts results to the persona the user is currently acting as:
  // HOLDER → only the user's own documents; MANAGER → only assigned signer docs;
  // HR/ORG_ADMIN/RECRUITER → only the org's documents.
  @IsOptional()
  @IsIn(['HOLDER', 'MANAGER', 'HR', 'ORG_ADMIN', 'RECRUITER'])
  role?: 'HOLDER' | 'MANAGER' | 'HR' | 'ORG_ADMIN' | 'RECRUITER';
}
