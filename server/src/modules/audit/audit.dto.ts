import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto.js';

export class AuditLogQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsIn(['USER', 'SYSTEM', 'CRON'])
  actorType?: string;

  @IsOptional()
  @IsString()
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
