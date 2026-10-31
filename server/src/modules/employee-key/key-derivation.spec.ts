import { deriveEmployeeKey, secretMaterial } from './key-derivation.js';

const ORDER = ['first-school', 'birth-city', 'first-pet'];
const SECRETS = {
  dateOfBirth: '1990-04-12',
  personalId: 'EMP-1024',
  answers: [
    { questionId: 'first-pet', answer: 'Bruno' },
    { questionId: 'first-school', answer: 'St. Xavier' },
    { questionId: 'birth-city', answer: 'Mumbai' },
  ],
};
const SALT = '0f'.repeat(16);

describe('secretMaterial (normalize + length-prefix)', () => {
  it('ignores case, outer spaces and repeated inner spaces in answers', () => {
    const typedDifferently = {
      ...SECRETS,
      answers: [
        { questionId: 'first-pet', answer: '  bruno ' },
        { questionId: 'first-school', answer: 'ST.   XAVIER' },
        { questionId: 'birth-city', answer: 'mumbai' },
      ],
    };
    expect(secretMaterial(typedDifferently, ORDER)).toEqual(
      secretMaterial(SECRETS, ORDER),
    );
  });

  it('ignores spaces, hyphens and case in the personal identifier', () => {
    expect(
      secretMaterial({ ...SECRETS, personalId: 'emp 1024' }, ORDER),
    ).toEqual(secretMaterial(SECRETS, ORDER));
  });

  it('follows the enrolled question order, not the order answers arrive in', () => {
    const reversed = { ...SECRETS, answers: [...SECRETS.answers].reverse() };
    expect(secretMaterial(reversed, ORDER)).toEqual(
      secretMaterial(SECRETS, ORDER),
    );
  });

  it('changes when any single input changes', () => {
    const base = secretMaterial(SECRETS, ORDER);
    expect(
      secretMaterial({ ...SECRETS, dateOfBirth: '1990-04-13' }, ORDER),
    ).not.toEqual(base);
    expect(
      secretMaterial(
        {
          ...SECRETS,
          answers: SECRETS.answers.map((a) =>
            a.questionId === 'birth-city' ? { ...a, answer: 'Pune' } : a,
          ),
        },
        ORDER,
      ),
    ).not.toEqual(base);
  });

  it('refuses answers that do not cover exactly the enrolled questions', () => {
    expect(() =>
      secretMaterial(SECRETS, ['first-school', 'birth-city', 'first-employer']),
    ).toThrow(/enrolled questions/);
  });
});

describe('deriveEmployeeKey (PBKDF2-SHA256)', () => {
  it('derives the same 32-byte key from the same material and salt', async () => {
    const material = secretMaterial(SECRETS, ORDER);
    const a = await deriveEmployeeKey(material, SALT, 1000);
    expect(a).toHaveLength(32);
    expect(await deriveEmployeeKey(material, SALT, 1000)).toEqual(a);
  });

  it('gives two employees with identical answers different keys via their salts', async () => {
    const material = secretMaterial(SECRETS, ORDER);
    expect(await deriveEmployeeKey(material, SALT, 1000)).not.toEqual(
      await deriveEmployeeKey(material, 'a0'.repeat(16), 1000),
    );
  });
});
