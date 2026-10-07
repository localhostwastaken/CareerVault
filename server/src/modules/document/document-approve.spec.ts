import { DocumentService } from './document.service.js';

/**
 * Skill extraction after approve() is explicitly best-effort (AI downtime must never
 * block issuance). It must be fire-and-forget: awaiting it would hold the HTTP response
 * open for up to two AI-service timeouts (extractSkills + embed, 90s each) — the cause of
 * the production /approve latency spikes traced alongside PrismaPgAdapter EAUTHTIMEOUTs.
 */

const HASH = 'ab'.repeat(32);

function approveFixture(extractForDocument: () => Promise<void>) {
  const extractionCalls: string[] = [];
  const warnings: string[] = [];
  const org = {
    id: 'org-1',
    name: 'Acme Corp',
    domain: 'acme.example',
    kmsKeyId: 'kms-1',
    publicKeyPem: 'pub-key-pem',
  };
  const tx = {
    document: { updateMany: () => Promise.resolve({ count: 1 }) },
    documentVersion: { create: () => Promise.resolve({}) },
  };
  const prisma = {
    document: {
      findUnique: () =>
        Promise.resolve({
          id: 'doc-1',
          type: 'EXPERIENCE_LETTER',
          status: 'PENDING_HR',
          organizationId: 'org-1',
          holderId: 'holder-1',
          documentHash: HASH,
          managerSignature: 'manager-sig',
          signerMemberId: 'member-manager',
          signingPublicKeyPem: null,
          enableSkillExtraction: true,
          version: 1,
          contentJson: {},
        }),
      update: () => Promise.resolve({}),
    },
    organization: {
      findUniqueOrThrow: () => Promise.resolve(org),
    },
    organizationMember: {
      findFirst: () => Promise.resolve({ id: 'member-hr', role: 'HR' }),
      findUnique: () => Promise.resolve({ userId: 'user-manager' }),
    },
    $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
    auditLog: { create: () => Promise.resolve({}) },
    user: { findUnique: () => Promise.resolve(null) },
  };
  const kms = {
    sign: () => Promise.resolve('hr-signature'),
    hasKey: () => Promise.resolve(true),
  };
  const pdf = {
    generateAndStore: () => Promise.resolve('https://pdf.example/doc-1'),
  };
  const notifications = { notify: () => Promise.resolve() };
  const skills = {
    extractForDocument: (id: string) => {
      extractionCalls.push(id);
      return extractForDocument();
    },
  };
  const service = new DocumentService(
    prisma as never,
    kms as never,
    pdf as never,
    notifications as never,
    {} as never, // blockchain
    skills as never,
  );
  // The response shape is not under test; only that approve() returns without waiting
  // on skill extraction.
  Object.assign(service, {
    present: (id: string) => Promise.resolve({ id, status: 'ISSUED' }),
    logger: { warn: (message: string) => warnings.push(message) },
  });
  const approve = () =>
    service.approve(
      'doc-1',
      { id: 'user-hr' } as never,
      { notes: undefined } as never,
    );
  return { approve, extractionCalls, warnings };
}

const nextMacrotask = () =>
  new Promise<'still waiting'>((resolve) =>
    setImmediate(() => resolve('still waiting')),
  );

describe('DocumentService.approve', () => {
  it('returns without waiting for skill extraction', async () => {
    const { approve, extractionCalls } = approveFixture(
      () => new Promise(() => {}),
    );

    const outcome = await Promise.race([
      approve().then(() => 'returned' as const),
      nextMacrotask(),
    ]);

    expect(outcome).toBe('returned');
    expect(extractionCalls).toEqual(['doc-1']);
  });

  it('logs a failed skill extraction as a warning instead of failing the request', async () => {
    const { approve, warnings } = approveFixture(() =>
      Promise.reject(new Error('AI service is unavailable')),
    );

    await expect(approve()).resolves.toMatchObject({ status: 'ISSUED' });
    await nextMacrotask();

    expect(warnings).toEqual([
      expect.stringMatching(/doc-1.*AI service is unavailable/),
    ]);
  });
});
