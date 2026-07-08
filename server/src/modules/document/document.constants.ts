// Shared between DocumentService (normal lifecycle) and BulkIssuanceService (HR's direct-to-ISSUED path) so both stay in lockstep on labels and expiry.
export const EXPIRY_DAYS = 90;

export const TYPE_LABEL: Record<string, string> = {
  EXPERIENCE_LETTER: 'experience letter',
  LETTER_OF_RECOMMENDATION: 'letter of recommendation',
  SALARY_PROOF: 'salary proof',
};
