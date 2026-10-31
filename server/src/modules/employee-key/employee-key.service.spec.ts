import {
  unwrapEmployeeKey,
  wrapEmployeeKey,
} from '../../services/key-management/employee-key-wrap.js';
import { EmployeeKeyService } from './employee-key.service.js';
import { deriveEmployeeKey, secretMaterial } from './key-derivation.js';

const MASTER = Buffer.alloc(32, 3);
const ORG = 'org-1';
const USER = 'user-1';
const ORDER = ['first-school', 'birth-city', 'first-pet'];
const SECRETS = {
  dateOfBirth: '1990-04-12',
  personalId: 'EMP-1024',
  answers: [
    { questionId: 'first-school', answer: 'St. Xavier' },
    { questionId: 'birth-city', answer: 'Mumbai' },
    { questionId: 'first-pet', answer: 'Bruno' },
  ],
};

const kms = {
  wrapEmployeeKey: (key: Buffer, ctx: Parameters<typeof wrapEmployeeKey>[2]) =>
    Promise.resolve(wrapEmployeeKey(MASTER, key, ctx)),
  unwrapEmployeeKey: (
    wrapped: string,
    ctx: Parameters<typeof unwrapEmployeeKey>[2],
  ) => Promise.resolve(unwrapEmployeeKey(MASTER, wrapped, ctx)),
};

async function enrolledRow() {
  const kdfSalt = '0f'.repeat(16);
  const key = await deriveEmployeeKey(
    secretMaterial(SECRETS, ORDER),
    kdfSalt,
    1000,
  );
  return {
    id: 'key-1',
    userId: USER,
    organizationId: ORG,
    version: 1,
    kdfSalt,
    kdfIterations: 1000,
    questionIds: ORDER,
    wrappedKey: wrapEmployeeKey(MASTER, key, {
      organizationId: ORG,
      userId: USER,
      version: 1,
    }),
    status: 'ACTIVE',
    key,
  };
}

function service(row: unknown, recentFailures = 0, audits: unknown[] = []) {
  const prisma = {
    employeeKey: { findFirst: () => Promise.resolve(row) },
    auditLog: {
      count: () => Promise.resolve(recentFailures),
      create: (args: unknown) => {
        audits.push(args);
        return Promise.resolve({});
      },
    },
  };
  return new EmployeeKeyService(prisma as never, kms as never);
}

describe('EmployeeKeyService.unlock (step-up)', () => {
  it('releases the stored key when the re-entered details match, however they are typed', async () => {
    const row = await enrolledRow();
    const typedDifferently = {
      ...SECRETS,
      personalId: 'emp 1024',
      answers: SECRETS.answers.map((a) => ({
        ...a,
        answer: `  ${a.answer.toUpperCase()} `,
      })),
    };

    const unlocked = await service(row).unlock(USER, ORG, typedDifferently);

    expect(unlocked.keyId).toBe('key-1');
    expect(unlocked.key).toEqual(row.key);
  });

  it('refuses a wrong answer with STEP_UP_FAILED and records the attempt', async () => {
    const audits: unknown[] = [];
    const wrong = {
      ...SECRETS,
      answers: SECRETS.answers.map((a) =>
        a.questionId === 'first-pet' ? { ...a, answer: 'Rex' } : a,
      ),
    };

    await expect(
      service(await enrolledRow(), 0, audits).unlock(USER, ORG, wrong),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: 'STEP_UP_FAILED' },
    });
    expect(audits).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'EMPLOYEE_KEY_STEP_UP_FAILED',
        }) as unknown,
      }),
    ]);
  });

  it('treats answers to questions other than the enrolled ones as wrong', async () => {
    const otherQuestion = {
      ...SECRETS,
      answers: [
        ...SECRETS.answers.slice(0, 2),
        { questionId: 'first-employer', answer: 'Acme' },
      ],
    };
    await expect(
      service(await enrolledRow()).unlock(USER, ORG, otherQuestion),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('asks the signer to enrol first when they have no active key', async () => {
    await expect(
      service(null).unlock(USER, ORG, SECRETS),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'EMPLOYEE_KEY_REQUIRED' },
    });
  });

  it('locks signing after five failures in the window, even with the right answers', async () => {
    await expect(
      service(await enrolledRow(), 5).unlock(USER, ORG, SECRETS),
    ).rejects.toMatchObject({
      status: 429,
      response: { code: 'STEP_UP_LOCKED' },
    });
  });
});

describe('EmployeeKeyService.enroll', () => {
  const signer = {
    id: USER,
    email: 'm@example.com',
    fullName: 'Manager',
    hasPassword: true,
    memberships: [
      {
        organizationId: ORG,
        organizationName: 'Acme',
        role: 'MANAGER' as const,
      },
    ],
  };

  it('refuses someone who does not sign for that organisation', async () => {
    await expect(
      service(null).enroll(
        {
          ...signer,
          memberships: [{ ...signer.memberships[0], role: 'HOLDER' as never }],
        },
        { ...SECRETS, organizationId: ORG },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('retires the previous key and stores only a wrapped one, never the answers', async () => {
    const calls: Array<[string, unknown]> = [];
    const tx = {
      employeeKey: {
        findFirst: () => Promise.resolve({ version: 1 }),
        updateMany: (args: unknown) => {
          calls.push(['retire', args]);
          return Promise.resolve({ count: 1 });
        },
        create: (args: { data: Record<string, unknown> }) => {
          calls.push(['create', args.data]);
          return Promise.resolve({ id: 'key-2' });
        },
      },
      auditLog: { create: () => Promise.resolve({}) },
    };
    const prisma = {
      $transaction: (fn: (t: typeof tx) => Promise<void>) => fn(tx),
      employeeKey: { findMany: () => Promise.resolve([]) },
    };
    const keys = new EmployeeKeyService(prisma as never, kms as never);

    await keys.enroll(signer, { ...SECRETS, organizationId: ORG });

    expect(calls.map(([step]) => step)).toEqual(['retire', 'create']);
    const created = calls[1][1] as Record<string, unknown>;
    expect(created).toMatchObject({
      version: 2,
      kdfIterations: 600_000,
      questionIds: ORDER,
    });
    expect(created.wrappedKey).toMatch(/^ekw1:/);
    const stored = JSON.stringify(created);
    for (const secret of ['Mumbai', 'Bruno', 'Xavier', '1990-04-12', 'EMP'])
      expect(stored).not.toContain(secret);
  });
});
