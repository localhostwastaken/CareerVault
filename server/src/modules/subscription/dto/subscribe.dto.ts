import { IsIn } from 'class-validator';
import type { BillingTier } from '../../../config/billing.constants.js';

export class SubscribeDto {
  @IsIn(['HOLDER_PREMIUM', 'VERIFIER_BASIC', 'VERIFIER_ENTERPRISE'])
  tier!: BillingTier;
}
