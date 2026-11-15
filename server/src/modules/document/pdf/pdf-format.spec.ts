import {
  formatDate,
  formatEnum,
  formatRupees,
  initials,
} from './pdf-format.js';

// The issued PDF is read by people, not by code: no ISO dates, no paise, no enum codes.
describe('pdf-format', () => {
  it('formats ISO dates as day month year', () => {
    expect(formatDate('2022-06-01')).toBe('1 June 2022');
    expect(formatDate('2026-10-31T00:00:00.000Z')).toBe('31 October 2026');
  });

  it('formats paise as rupees with Indian digit grouping', () => {
    expect(formatRupees(6_000_000)).toBe('₹60,000.00');
    expect(formatRupees(1_234_567_89)).toBe('₹12,34,567.89');
  });

  it('turns known enum codes into their display labels', () => {
    expect(formatEnum('EXPERIENCE_CUM_RELIEVING')).toBe(
      'Experience-cum-relieving',
    );
    expect(formatEnum('FULL_TIME')).toBe('Full-time');
    expect(formatEnum('DIRECT_SUPERVISOR')).toBe('Direct supervisor');
  });

  it('falls back to sentence case for an unknown enum code', () => {
    expect(formatEnum('SOME_NEW_VALUE')).toBe('Some new value');
  });

  it('builds a two-letter monogram from an organisation name', () => {
    expect(initials('TechCorp')).toBe('TC');
    expect(initials('Global Solutions Ltd')).toBe('GS');
    expect(initials('acme')).toBe('A');
  });
});
