import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Shared pagination input. Reuse on every list endpoint; never re-declare page/limit.
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export function pageMeta(total: number, pagination: PaginationDto): PageMeta {
  return { page: pagination.page, limit: pagination.limit, total };
}
