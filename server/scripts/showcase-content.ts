// The words and numbers behind the demo's background documents. Kept apart from
// demo-showcase.ts so the script stays about order of operations, not content.
type DocumentType =
  | 'EXPERIENCE_LETTER'
  | 'SALARY_PROOF'
  | 'LETTER_OF_RECOMMENDATION';

interface ShowcaseDocument {
  label: string;
  holder: 'alice' | 'bob';
  type: DocumentType;
  enableSkillExtraction: boolean;
  subject: Record<string, unknown>;
}

const documents: ShowcaseDocument[] = [
  {
    label: 'Alice · Salary Proof',
    holder: 'alice',
    type: 'SALARY_PROOF',
    enableSkillExtraction: false,
    subject: {
      employeeName: 'Alice Holder',
      employeeCode: 'TC-2041',
      designation: 'Software Engineer',
      employmentStatus: 'ACTIVE',
      dateOfJoining: '2022-06-01',
      payFrequency: 'MONTHLY',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      basicPaise: 6_000_000,
      hraPaise: 3_000_000,
      specialAllowancePaise: 2_500_000,
      pfEmployeePaise: 720_000,
      professionalTaxPaise: 20_000,
      incomeTaxTdsPaise: 1_400_000,
      signatoryName: 'Hannah HR',
      signatoryDesignation: 'Head — Human Resources',
    },
  },
  {
    label: 'Alice · Recommendation',
    holder: 'alice',
    type: 'LETTER_OF_RECOMMENDATION',
    enableSkillExtraction: true,
    subject: {
      candidateName: 'Alice Holder',
      candidateTitle: 'Software Engineer',
      recommenderName: 'Marcus Manager',
      recommenderTitle: 'Engineering Manager',
      recommenderEmail: 'marcus@techcorp.example.com',
      relationshipType: 'DIRECT_SUPERVISOR',
      organizationContext: 'Payments Platform, TechCorp',
      relationshipStartDate: '2022-06-01',
      overallAssessment:
        'Alice built our payment settlement service in Node.js and TypeScript on PostgreSQL, owned its on-call rotation, and cut reconciliation failures by a third.',
      keyStrengths: ['Node.js', 'TypeScript', 'PostgreSQL', 'Payments'],
    },
  },
  {
    label: 'Bob · Experience Letter',
    holder: 'bob',
    type: 'EXPERIENCE_LETTER',
    enableSkillExtraction: false,
    subject: {
      letterKind: 'EXPERIENCE_CUM_RELIEVING',
      employeeName: 'Bob Holder',
      employeeCode: 'TC-1873',
      designation: 'QA Engineer',
      employmentType: 'FULL_TIME',
      dateOfJoining: '2021-03-15',
      lastWorkingDay: '2026-09-30',
      reasonForLeaving: 'RESIGNATION',
      conductSummary:
        'Bob worked on our release quality team and conducted himself professionally throughout.',
      signatoryName: 'Hannah HR',
      signatoryDesignation: 'Head — Human Resources',
    },
  },
];

export const SHOWCASE = {
  emails: {
    alice: 'imperialsample+alice@gmail.com',
    bob: 'bob@holder.example.com',
    marcus: 'marcus@techcorp.example.com',
    hr: 'hr@techcorp.example.com',
    recruiter: 'recruiter@techcorp.example.com',
  },
  // The public demo step-up values every seeded signer enrols with (prisma/seed.ts).
  stepUp: {
    dateOfBirth: '1990-01-15',
    personalId: 'DEMO-0001',
    answers: [
      { questionId: 'first-school', answer: 'Somaiya' },
      { questionId: 'birth-city', answer: 'Mumbai' },
      { questionId: 'first-pet', answer: 'Bruno' },
    ],
  },
  documents,
  jobOpening: {
    title: 'Backend Engineer — Payments',
    description:
      'Build and run the services that move money for our customers. You will own settlement and reconciliation services in Node.js and TypeScript on PostgreSQL.',
    requiredSkills: ['Node.js', 'PostgreSQL', 'Payments', 'TypeScript'],
    seniority: 'MID' as const,
  },
};
