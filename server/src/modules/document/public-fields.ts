import type { DocumentType } from '../../generated/prisma/enums.js';

export const SALARY_PROOF_TYPE = 'SALARY_PROOF';

// Anonymous /verify/hash view discloses ONLY these subject fields per type (D2/B6).
// Everything else — salary paise, PAN/UAN, personal contact, reason-for-leaving,
// reporting manager — is withheld from strangers holding only a hash. A holder who
// deliberately shares a document via a share link opts into full disclosure ('shared'
// mode), so the full content is shown there; this list gates only the public lookup.
export const PUBLIC_SUBJECT_FIELDS: Record<DocumentType, readonly string[]> = {
  EXPERIENCE_LETTER: [
    'letterKind',
    'employeeName',
    'employeeCode',
    'designation',
    'department',
    'employmentType',
    'dateOfJoining',
    'lastWorkingDay',
    'noticePeriodServed',
    'duesSettled',
    'workLocation',
    'conductSummary',
    'signatoryName',
    'signatoryDesignation',
    'issueDate',
    'referenceNumber',
    // withheld: reasonForLeaving, reportingManager, lastDrawnCtcPaise
  ],
  SALARY_PROOF: [
    'designation',
    'department',
    'employmentStatus',
    'employmentType',
    'payFrequency',
    'periodStart',
    'periodEnd',
    'issueDate',
    'referenceNumber',
    'signatoryName',
    'signatoryDesignation',
    'purpose',
    // withheld: employeeName, employeeCode, all *Paise, panMasked, uanNumber
  ],
  LETTER_OF_RECOMMENDATION: [
    'candidateName',
    'candidateTitle',
    'recommenderName',
    'recommenderTitle',
    'relationshipType',
    'organizationContext',
    'relationshipStartDate',
    'relationshipEndDate',
    'issueDate',
    'endorsementStrength',
    'recommendationContext',
    'overallAssessment',
    // withheld: recommenderEmail, recommenderPhone
  ],
};
