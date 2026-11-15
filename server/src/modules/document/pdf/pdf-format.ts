// Human formatting for the issued PDF. The signed record keeps machine values (ISO dates,
// paise, enum codes); only their printed form changes here, never the signed bytes.

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Display labels mirror the client's sign form (client/src/features/document/sign-config.ts).
const ENUM_LABELS: Record<string, string> = {
  EXPERIENCE: 'Experience',
  RELIEVING: 'Relieving',
  EXPERIENCE_CUM_RELIEVING: 'Experience-cum-relieving',
  FULL_TIME: 'Full-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
  CONSULTANT: 'Consultant',
  RESIGNATION: 'Resignation',
  TERMINATION: 'Termination',
  MUTUAL_SEPARATION: 'Mutual separation',
  CONTRACT_END: 'Contract end',
  RETIREMENT: 'Retirement',
  SERVED_IN_FULL: 'Served in full',
  WAIVED: 'Waived',
  SHORTFALL_RECOVERED: 'Shortfall recovered',
  PAY_IN_LIEU: 'Pay in lieu',
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
  ACTIVE: 'Active',
  ON_NOTICE: 'On notice',
  PERMANENT: 'Permanent',
  FIXED_TERM_CONTRACT: 'Fixed-term contract',
  PROBATION: 'Probation',
  DIRECT_SUPERVISOR: 'Direct supervisor',
  SKIP_LEVEL: 'Skip-level manager',
  DEPARTMENT_HEAD: 'Department head',
  PEER: 'Peer',
  CROSS_FUNCTIONAL: 'Cross-functional partner',
  MENTOR: 'Mentor',
  CLIENT: 'Client',
  VENDOR_PARTNER: 'Vendor / partner',
  STRONGLY_RECOMMEND: 'Strongly recommend',
  RECOMMEND: 'Recommend',
  RECOMMEND_WITH_RESERVATIONS: 'Recommend with reservations',
};

export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatRupees(paise: number): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  const fraction = String(Math.abs(paise) % 100).padStart(2, '0');
  const digits = String(rupees);
  // Indian grouping: last three digits, then pairs.
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  const grouped = head
    ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`
    : tail;
  return `${paise < 0 ? '−' : ''}₹${grouped}.${fraction}`;
}

export function formatEnum(code: string): string {
  if (ENUM_LABELS[code]) return ENUM_LABELS[code];
  const words = code.toLowerCase().split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Monogram for the letterhead: first letters of the first two words, or the capitals of
// a single camel-cased word ("TechCorp" → "TC").
export function initials(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((w) => !/^(ltd|llp|inc|pvt|limited)\.?$/i.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const capitals = (words[0] ?? '').match(/[A-Z]/g) ?? [];
  if (capitals.length >= 2) return capitals.slice(0, 2).join('');
  return (words[0]?.[0] ?? '').toUpperCase();
}
