import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import { MAX_BULK_VERIFY_HASHES } from '../../../config/verifier-rate-limits.constants.js';

export class BulkVerifyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_VERIFY_HASHES)
  @IsUUID('all', { each: true })
  documentIds!: string[];
}
