// What each document type says on paper: a formal subtitle, the letter's prose, and a
// table of particulars. Built only from the signed subject, so the PDF never claims more
// than the record the signatures cover.
import { formatDate, formatEnum } from './pdf-format.js';

export type Fact = [label: string, value: string];
export interface MoneyLine {
  label: string;
  paise: number;
}
export interface LetterContent {
  title: string;
  subtitle: string;
  paragraphs: string[];
  facts: Fact[];
  salary?: { earnings: MoneyLine[]; deductions: MoneyLine[] };
  strengths?: string[];
  reference: string | null;
  issueDate: string | null;
  holderName: string;
}

type Subject = Record<string, unknown>;
const str = (s: Subject, key: string): string | null =>
  typeof s[key] === 'string' && s[key] !== '' ? s[key] : null;
const num = (s: Subject, key: string): number | null =>
  typeof s[key] === 'number' ? s[key] : null;
const facts = (pairs: Array<[string, string | null]>): Fact[] =>
  pairs.filter((p): p is Fact => p[1] !== null);
const date = (s: Subject, key: string) =>
  str(s, key) ? formatDate(str(s, key)!) : null;
const label = (s: Subject, key: string) =>
  str(s, key) ? formatEnum(str(s, key)!) : null;

function experience(
  s: Subject,
  org: string,
): Omit<LetterContent, 'reference' | 'issueDate'> {
  const name = str(s, 'employeeName') ?? 'the employee';
  const left = str(s, 'lastWorkingDay');
  const tenure = left
    ? `from ${date(s, 'dateOfJoining')} to ${formatDate(left)}`
    : `since ${date(s, 'dateOfJoining')}`;
  const kind =
    str(s, 'letterKind') === 'RELIEVING'
      ? 'Relieving Letter'
      : str(s, 'letterKind') === 'EXPERIENCE_CUM_RELIEVING'
        ? 'Experience and Relieving Letter'
        : 'Experience Letter';
  const paragraphs = [
    `This is to certify that ${name} (employee code ${str(s, 'employeeCode')}) ${left ? 'was' : 'has been'} employed with ${org} as ${str(s, 'designation')} on a ${(label(s, 'employmentType') ?? 'full-time').toLowerCase()} basis ${tenure}.`,
  ];
  if (str(s, 'conductSummary')) paragraphs.push(str(s, 'conductSummary')!);
  if (left)
    paragraphs.push(
      `${name} has been relieved of all duties with effect from ${formatDate(left)}. We wish them every success in their future endeavours.`,
    );
  return {
    title: kind,
    subtitle: 'To whom it may concern',
    holderName: name,
    paragraphs,
    facts: facts([
      ['Employee name', name],
      ['Employee code', str(s, 'employeeCode')],
      ['Designation', str(s, 'designation')],
      ['Department', str(s, 'department')],
      ['Employment type', label(s, 'employmentType')],
      ['Date of joining', date(s, 'dateOfJoining')],
      ['Last working day', date(s, 'lastWorkingDay')],
      ['Reason for leaving', label(s, 'reasonForLeaving')],
      ['Work location', str(s, 'workLocation')],
    ]),
  };
}

function salary(
  s: Subject,
  org: string,
): Omit<LetterContent, 'reference' | 'issueDate'> {
  const name = str(s, 'employeeName') ?? 'the employee';
  const lines = (pairs: Array<[string, string]>): MoneyLine[] =>
    pairs
      .filter(([, key]) => num(s, key) !== null)
      .map(([l, key]) => ({ label: l, paise: num(s, key)! }));
  return {
    title: 'Salary Certificate',
    subtitle: `For the period ${date(s, 'periodStart')} to ${date(s, 'periodEnd')}`,
    holderName: name,
    paragraphs: [
      `This is to certify that ${name} (employee code ${str(s, 'employeeCode')}) is employed with ${org} as ${str(s, 'designation')} since ${date(s, 'dateOfJoining')}. The ${(label(s, 'payFrequency') ?? 'monthly').toLowerCase()} compensation for the period stated above is set out below.`,
    ],
    // Name, code and designation are already in the certifying paragraph.
    facts: facts([
      ['Employment status', label(s, 'employmentStatus')],
      ['Date of joining', date(s, 'dateOfJoining')],
      ['Purpose', label(s, 'purpose')],
    ]),
    salary: {
      earnings: lines([
        ['Basic', 'basicPaise'],
        ['House rent allowance', 'hraPaise'],
        ['Special allowance', 'specialAllowancePaise'],
        ['Leave travel allowance', 'ltaPaise'],
        ['Conveyance', 'conveyanceAllowancePaise'],
        ['Medical', 'medicalAllowancePaise'],
        ['Variable pay', 'variablePayPaise'],
      ]),
      deductions: lines([
        ['Provident fund', 'pfEmployeePaise'],
        ['Professional tax', 'professionalTaxPaise'],
        ['Income tax (TDS)', 'incomeTaxTdsPaise'],
        ['ESI', 'esiEmployeePaise'],
        ['Other deductions', 'otherDeductionsPaise'],
      ]),
    },
  };
}

function recommendation(
  s: Subject,
): Omit<LetterContent, 'reference' | 'issueDate'> {
  const name = str(s, 'candidateName') ?? 'the candidate';
  const paragraphs = [
    `I have known ${name} since ${date(s, 'relationshipStartDate')} as their ${(label(s, 'relationshipType') ?? 'colleague').toLowerCase()} in ${str(s, 'organizationContext')}.`,
  ];
  if (str(s, 'overallAssessment'))
    paragraphs.push(str(s, 'overallAssessment')!);
  paragraphs.push(
    `I recommend ${name} without hesitation and am happy to be contacted for further detail.`,
  );
  const strengths = Array.isArray(s.keyStrengths)
    ? s.keyStrengths.filter((k): k is string => typeof k === 'string')
    : [];
  return {
    title: 'Letter of Recommendation',
    subtitle: 'To whom it may concern',
    holderName: name,
    paragraphs,
    strengths,
    // The candidate and how long they are known are already in the opening sentence.
    facts: facts([
      ['Recommended by', str(s, 'recommenderName')],
      ['Title', str(s, 'recommenderTitle')],
      ['Relationship', label(s, 'relationshipType')],
      ['Endorsement', label(s, 'endorsementStrength')],
    ]),
  };
}

export function letterContent(
  type: string,
  contentJson: unknown,
  org: string,
): LetterContent {
  const s = (
    contentJson && typeof contentJson === 'object' ? contentJson : {}
  ) as Subject;
  const body =
    type === 'SALARY_PROOF'
      ? salary(s, org)
      : type === 'LETTER_OF_RECOMMENDATION'
        ? recommendation(s)
        : experience(s, org);
  return {
    ...body,
    reference: str(s, 'referenceNumber'),
    issueDate: date(s, 'issueDate'),
  };
}
