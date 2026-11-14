// Demo fixtures for local development, QA, and the investor walkthrough.
//
// Idempotent: re-running upserts the orgs/users/memberships and rebuilds the demo
// documents, so `npm run db:seed` is safe to run repeatedly.
//
// Actors created (all share DEMO_PASSWORD except the external magic-link-only manager):
// SEED_DEMO_PASSWORD when set, else the published local-dev default `Password123@`. A
// deployed stack must be seeded with a non-public SEED_DEMO_PASSWORD: the default is in the
// README, so anyone could otherwise sign in as TechCorp's admin.
//   TechCorp (verified)        — Olivia (ORG_ADMIN), Marcus (MANAGER), Hannah (HR), Riya (RECRUITER)
//   GlobalSolutions (verified) — Gabriel (MANAGER)
//   Holders (no membership)    — Alice (discoverable; a real Gmail plus-alias so the recorded
//                                demo can show the issuance email), Bob
//
// Issued and anchored showcase documents cannot be inserted here (they need real seals and
// signatures): `npm run demo:showcase` produces them through the real services afterwards.
//
// Note on employee keys: every seeded MANAGER/HR is enrolled with SIGNER_STEP_UP below, so
// signing works straight away; each signature still asks for those details (step-up).
//
// Note on signing keys: orgs are seeded WITHOUT a kmsKeyId. DocumentService.ensureOrgKey()
// lazily mints the RSA-2048 key pair on the manager's first signature, so the full
// REQUESTED → PENDING_HR → ISSUED happy path works against a seeded org with no extra setup.
//
// Run:  npm run db:seed
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { fieldEncryption } from '../src/prisma/encryption/field-encryption.extension.js';
import {
  deriveEmployeeKey,
  KDF_ITERATIONS,
  newKdfSalt,
  secretMaterial,
} from '../src/modules/employee-key/key-derivation.js';
import { FieldCipher } from '../src/services/key-management/field-cipher.js';
import { LocalKmsService } from '../src/services/key-management/local-kms.service.js';

// R10: seeded documents are sealed exactly as the app seals them, under the master key
// that ConfigService resolves from process.env (loaded by dotenv above). Seeding a REMOTE
// database must therefore use that deployment's KMS_MASTER_KEY and STORAGE_LOCAL_DIR, or
// the rows it writes are undecryptable there.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const kms = new LocalKmsService(new ConfigService());
const prisma = new PrismaClient({ adapter }).$extends(
  fieldEncryption(new FieldCipher(kms)),
);

// The signing details every seeded MANAGER/HR enrols with, so the demo can sign at once.
// Demo values only: the server never stores them, only the key they derive, and the deployed
// accounts stay behind the non-public SEED_DEMO_PASSWORD. Printed in demo-guide/index.html.
const SIGNER_STEP_UP = {
  dateOfBirth: '1990-01-15',
  personalId: 'DEMO-0001',
  answers: [
    { questionId: 'first-school', answer: 'Somaiya' },
    { questionId: 'birth-city', answer: 'Mumbai' },
    { questionId: 'first-pet', answer: 'Bruno' },
  ],
};

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Password123@';
// A password set through the environment is a secret, so it is never echoed back.
const PASSWORD_NOTE = process.env.SEED_DEMO_PASSWORD
  ? 'the SEED_DEMO_PASSWORD you set'
  : `"${DEMO_PASSWORD}"`;

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
  const riya = await upsertUser('recruiter@techcorp.example.com', 'Riya Recruiter', passwordHash);

  await upsertMember(olivia.id, techCorp.id, 'ORG_ADMIN', 'admin@techcorp.example.com');
  const marcusMember = await upsertMember(marcus.id, techCorp.id, 'MANAGER', 'marcus@techcorp.example.com');
  await upsertMember(hannah.id, techCorp.id, 'HR', 'hr@techcorp.example.com');
  await upsertMember(gabriel.id, globalSolutions.id, 'MANAGER', 'gabriel@globalsolutions.example.com');
  await upsertMember(riya.id, techCorp.id, 'RECRUITER', 'recruiter@techcorp.example.com');

  // ── Signing keys (per signer, per org) ─────────────────────────────────────
  await enrolSigner(marcus.id, techCorp.id);
  await enrolSigner(hannah.id, techCorp.id);
  await enrolSigner(gabriel.id, globalSolutions.id);

  // ── Holders (plain users; "holder" is implicit, not an org membership) ────────
  // Alice starts with NO documents here; demo:showcase issues her background documents.
  // Bob carries one open request so the manager inbox is not empty.
  const alice = await upsertUser('imperialsample+alice@gmail.com', 'Alice Holder', passwordHash, true);
  const bob = await upsertUser('bob@holder.example.com', 'Bob Holder', passwordHash);

  // ── Bob's open request, so Marcus's inbox has something waiting ───────────────
  await prisma.auditLog.deleteMany({});
  await prisma.document.deleteMany({ where: { holderId: bob.id, status: { in: ['REQUESTED', 'DRAFT'] } } });
  await prisma.document.create({
    data: {
      type:            'EXPERIENCE_LETTER',
      status:          'REQUESTED',
      holderId:        bob.id,
      organizationId:  techCorp.id,
      signerMemberId:  marcusMember.id,
      contentJson:     { note: 'Requesting an experience letter for a visa application.' },
    },
  });

  console.log('Seed complete.');
  console.log('  Organizations (verified): TechCorp, GlobalSolutions');
  console.log(`  Staff/holders (password ${PASSWORD_NOTE}):`);
  console.log('    ORG_ADMIN  admin@techcorp.example.com');
  console.log('    MANAGER    marcus@techcorp.example.com   (TechCorp)');
  console.log('    HR         hr@techcorp.example.com');
  console.log('    MANAGER    gabriel@globalsolutions.example.com  (GlobalSolutions)');
  console.log('    RECRUITER  recruiter@techcorp.example.com');
  console.log('    HOLDER     imperialsample+alice@gmail.com   (discoverable; background docs from demo:showcase)');
  console.log('    HOLDER     bob@holder.example.com     (one REQUESTED letter)');
  console.log('  Signers are enrolled; step-up: DOB 1990-01-15 · ID DEMO-0001 ·');
  console.log('    first school "Somaiya" · birth city "Mumbai" · first pet "Bruno"');
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

// The hash is rewritten on update too, so re-seeding with a new SEED_DEMO_PASSWORD takes
// effect on accounts an earlier seed created, not only on a fresh database.
function upsertUser(email: string, fullName: string, passwordHash: string | null, isDiscoverable = false) {
  return prisma.user.upsert({
    where: { email },
    update: { fullName, passwordHash },
    create: { email, fullName, passwordHash, emailVerified: true, isDiscoverable },
  });
}

// Idempotent: a signer who already has an ACTIVE key keeps it. Documents pin the key they
// were sealed with, so an existing key is never replaced or deleted here.
async function enrolSigner(userId: string, organizationId: string): Promise<void> {
  const active = await prisma.employeeKey.findFirst({
    where: { userId, organizationId, status: 'ACTIVE' },
  });
  if (active) return;
  const latest = await prisma.employeeKey.findFirst({
    where: { userId, organizationId },
    orderBy: { version: 'desc' },
  });
  const version = (latest?.version ?? 0) + 1;
  const questionIds = SIGNER_STEP_UP.answers.map((a) => a.questionId);
  const kdfSalt = newKdfSalt();
  const key = await deriveEmployeeKey(
    secretMaterial(SIGNER_STEP_UP, questionIds),
    kdfSalt,
    KDF_ITERATIONS,
  );
  await prisma.employeeKey.create({
    data: {
      userId,
      organizationId,
      version,
      kdfSalt,
      kdfIterations: KDF_ITERATIONS,
      questionIds,
      wrappedKey: await kms.wrapEmployeeKey(key, { organizationId, userId, version }),
    },
  });
  key.fill(0);
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
