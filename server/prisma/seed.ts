// Demo fixtures for local development, QA, and the investor walkthrough.
//
// Idempotent: re-running upserts the orgs/users/memberships and rebuilds the demo
// documents, so `npm run db:seed` is safe to run repeatedly.
//
// Actors created (all share DEMO_PASSWORD except the external magic-link-only manager):
//   TechCorp (verified)        — Olivia (ORG_ADMIN), Marcus (MANAGER), Hannah (HR)
//   GlobalSolutions (verified) — Gabriel (MANAGER)
//   Holders (no membership)    — Alice (discoverable), Bob
//
// Counts match the QA brief: 2 verified orgs · 1 admin · 2 managers · 1 HR · 2 holders.
//
// Note on signing keys: orgs are seeded WITHOUT a kmsKeyId. DocumentService.ensureOrgKey()
// lazily mints the RSA-2048 key pair on the manager's first signature, so the full
// REQUESTED → PENDING_HR → ISSUED happy path works against a seeded org with no extra setup.
//
// Run:  npm run db:seed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

const DEMO_PASSWORD = 'Password123@';

type MemberRole = 'ORG_ADMIN' | 'MANAGER' | 'HR' | 'RECRUITER';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ── Organizations (both pre-verified so holders can request immediately) ───────
  const techCorp = await upsertOrg('TechCorp', 'techcorp.example.com', 'demo_techcorp', 'STARTER');
  const globalSolutions = await upsertOrg('GlobalSolutions', 'globalsolutions.example.com', 'demo_globalsolutions', 'FREE');

  // ── Org staff ──────────────────────────────────────────────────────────────
  const olivia = await upsertUser('admin@techcorp.example.com', 'Olivia Admin', passwordHash);
  const marcus = await upsertUser('marcus@techcorp.example.com', 'Marcus Manager', passwordHash);
  const hannah = await upsertUser('hr@techcorp.example.com', 'Hannah HR', passwordHash);
  const gabriel = await upsertUser('gabriel@globalsolutions.example.com', 'Gabriel Manager', passwordHash);

  await upsertMember(olivia.id, techCorp.id, 'ORG_ADMIN', 'admin@techcorp.example.com');
  const marcusMember = await upsertMember(marcus.id, techCorp.id, 'MANAGER', 'marcus@techcorp.example.com');
  await upsertMember(hannah.id, techCorp.id, 'HR', 'hr@techcorp.example.com');
  await upsertMember(gabriel.id, globalSolutions.id, 'MANAGER', 'gabriel@globalsolutions.example.com');

  // ── Holders (plain users; "holder" is implicit, not an org membership) ────────
  // Alice is intentionally left with NO documents so the live E2E happy path starts
  // from a clean slate. Bob carries seed documents to populate the manager dashboard.
  const alice = await upsertUser('alice@holder.example.com', 'Alice Holder', passwordHash, true);
  const bob = await upsertUser('bob@holder.example.com', 'Bob Holder', passwordHash);

  // ── Demo documents for Bob at TechCorp (Marcus is the signer) ─────────────────
  // Only REQUESTED/DRAFT stages are seeded — they require no real KMS signature.
  // PENDING_HR/ISSUED states are produced live through the app so the dual-signature
  // and hashing pipeline is exercised end-to-end during the demo.
  await prisma.auditLog.deleteMany({});
  await prisma.document.deleteMany({ where: { holderId: bob.id } });

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

  const bobDoc1 = await prisma.document.create({
    data: {
      type:            'EXPERIENCE_LETTER',
      status:          'REQUESTED',
      holderId:        bob.id,
      organizationId:  techCorp.id,
      signerMemberId:  marcusMember.id,
      contentJson:     { note: 'Requesting an experience letter for a visa application.' },
    },
  });

  const bobDoc2 = await prisma.document.create({
    data: {
      type:            'LETTER_OF_RECOMMENDATION',
      status:          'DRAFT',
      holderId:        bob.id,
      organizationId:  techCorp.id,
      signerMemberId:  marcusMember.id,
      contentJson: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type:       ['VerifiableCredential', 'LetterOfRecommendation'],
        credentialSubject: {
          fullName:     'Bob Holder',
          designation:  'Software Engineer',
          recommender:  'Marcus Manager',
          relationship: 'Direct manager, 2 years',
          body:         'Bob consistently delivered high-quality work and mentored junior engineers.',
        },
      },
    },
  });

  // ── Seed audit log entries so the Audit Log page has data immediately ──────────
  await prisma.auditLog.createMany({
    data: [
      {
        actorId:        marcus.id,
        actorType:      'USER',
        action:         'DOCUMENT_SIGNED',
        entityType:     'DOCUMENT',
        entityId:       bobDoc1.id,
        retentionTier:  'STANDARD',
        newValue:       { status: 'PENDING_HR' },
        ipAddress:      '10.0.1.5',
        createdAt:      daysAgo(4),
      },
      {
        actorId:        hannah.id,
        actorType:      'USER',
        action:         'DOCUMENT_ISSUED',
        entityType:     'DOCUMENT',
        entityId:       bobDoc1.id,
        retentionTier:  'STANDARD',
        newValue:       { status: 'ISSUED' },
        ipAddress:      '10.0.1.6',
        createdAt:      daysAgo(3),
      },
      {
        actorType:      'SYSTEM',
        action:         'DOCUMENT_VERIFIED',
        entityType:     'DOCUMENT',
        entityId:       bobDoc1.id,
        retentionTier:  'COMPLIANCE',
        newValue:       { verdict: 'VERIFIED' },
        ipAddress:      '203.0.113.42',
        createdAt:      daysAgo(2),
      },
      {
        actorType:      'SYSTEM',
        action:         'DOCUMENT_CHECK_FAILED',
        entityType:     'DOCUMENT',
        entityId:       bobDoc2.id,
        retentionTier:  'COMPLIANCE',
        newValue:       { verdict: 'INVALID', failedCheck: 'SIGNATURE_INVALID' },
        ipAddress:      '198.51.100.7',
        createdAt:      daysAgo(1),
      },
      {
        actorType:      'SYSTEM',
        action:         'DOCUMENT_VERIFIED',
        entityType:     'DOCUMENT',
        entityId:       bobDoc1.id,
        retentionTier:  'COMPLIANCE',
        newValue:       { verdict: 'VERIFIED' },
        ipAddress:      '198.51.100.19',
        createdAt:      daysAgo(0),
      },
      {
        actorType:      'CRON',
        action:         'AUDIT_LOGS_PURGED',
        entityType:     'SYSTEM',
        entityId:       techCorp.id,
        retentionTier:  'STANDARD',
        newValue:       { deletedCount: 0 },
        createdAt:      daysAgo(1),
      },
    ],
  });

  await prisma.notification.create({
    data: {
      userId: bob.id,
      type: 'DOCUMENT_REQUESTED',
      title: 'Experience letter requested',
      body: 'Your experience letter request was sent to TechCorp.',
    },
  });

  console.log('Seed complete.');
  console.log('  Organizations (verified): TechCorp, GlobalSolutions');
  console.log(`  Staff/holders (password "${DEMO_PASSWORD}"):`);
  console.log('    ORG_ADMIN  admin@techcorp.example.com');
  console.log('    MANAGER    marcus@techcorp.example.com   (TechCorp)');
  console.log('    HR         hr@techcorp.example.com');
  console.log('    MANAGER    gabriel@globalsolutions.example.com  (GlobalSolutions)');
  console.log('    HOLDER     alice@holder.example.com   (clean slate — run the live happy path here)');
  console.log('    HOLDER     bob@holder.example.com     (has seeded REQUESTED + DRAFT docs)');
}

function upsertOrg(
  name: string,
  domain: string,
  tokenSlug: string,
  subscriptionTier: 'FREE' | 'STARTER' | 'ENTERPRISE',
) {
  return prisma.organization.upsert({
    where: { domain },
    update: { name },
    create: {
      name,
      domain,
      dnsToken: `careervault-verify=${tokenSlug}`,
      isVerified: true,
      verifiedAt: new Date(),
      rootDid: `did:careervault:demo:${tokenSlug}`,
      subscriptionTier,
    },
  });
}

function upsertUser(email: string, fullName: string, passwordHash: string | null, isDiscoverable = false) {
  return prisma.user.upsert({
    where: { email },
    update: { fullName },
    create: { email, fullName, passwordHash, emailVerified: true, isDiscoverable },
  });
}

function upsertMember(userId: string, organizationId: string, role: MemberRole, corporateEmail: string) {
  return prisma.organizationMember.upsert({
    where: { userId_organizationId_role: { userId, organizationId, role } },
    update: { isActive: true },
    create: { userId, organizationId, role, corporateEmail, joinedAt: new Date() },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
