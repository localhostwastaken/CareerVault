import { IsISO8601, IsIn, IsOptional, Matches } from 'class-validator';
import { FORMATS } from '../../common/validators/formats.js';
import { PaginationDto } from '../../common/dtos/pagination.dto.js';

export class AuditLogQueryDto extends PaginationDto {
  @IsOptional()
  @Matches(FORMATS.auditCode)
  action?: string;

  @IsOptional()
  @IsIn(['USER', 'SYSTEM', 'CRON'])
  actorType?: string;

  @IsOptional()
  @Matches(FORMATS.auditCode)
  entityType?: string;

  @IsOptional()
  @IsIn(['STANDARD', 'COMPLIANCE'])
  retentionTier?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
