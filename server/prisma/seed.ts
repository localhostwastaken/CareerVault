// Demo fixtures for local development and the investor walkthrough.
// Idempotent: re-running upserts the org/users/memberships and rebuilds the demo
// documents. Cryptographic signing + merkle anchoring fixtures are added when the
// document/merkle modules land (Phase 2/3); here we seed shape + early-lifecycle data.
//
// Run:  npm run db:seed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { generateSalt, hashDocument } from '../src/common/utils/crypto.util.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

const DEMO_PASSWORD = 'Password123!';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const org = await prisma.organization.upsert({
    where: { domain: 'acme.example.com' },
    update: {},
    create: {
      name: 'Acme Corporation',
      domain: 'acme.example.com',
      dnsToken: 'careervault-verify=demo_acme',
      isVerified: true,
      verifiedAt: new Date(),
      rootDid: 'did:careervault:demo:acme',
      subscriptionTier: 'STARTER',
    },
  });

  // Users (all share the demo password except the external, magic-link-only manager).
  const admin = await upsertUser('admin@acme.example.com', 'Olivia Admin', passwordHash);
  const manager = await upsertUser('manager@acme.example.com', 'Marcus Manager', passwordHash);
  const hr = await upsertUser('hr@acme.example.com', 'Hannah HR', passwordHash);
  const recruiter = await upsertUser('recruiter@acme.example.com', 'Riya Recruiter', passwordHash);
  const holder = await upsertUser('alice@holder.example.com', 'Alice Holder', passwordHash, true);
  const professor = await upsertUser('prof@university.edu', 'Dr. Pat Professor', null); // external, magic-link only

  await upsertMember(admin.id, org.id, 'ORG_ADMIN', 'admin@acme.example.com');
  const managerMember = await upsertMember(manager.id, org.id, 'MANAGER', 'manager@acme.example.com');
  await upsertMember(hr.id, org.id, 'HR', 'hr@acme.example.com');
  await upsertMember(recruiter.id, org.id, 'RECRUITER', 'recruiter@acme.example.com');
  await upsertMember(professor.id, org.id, 'MANAGER', 'prof@university.edu');

  await prisma.recruiterProfile.upsert({
    where: { userId: recruiter.id },
    update: {},
    create: { userId: recruiter.id, organizationId: org.id, searchScope: 'SAME_ORG' },
  });

  // Rebuild demo documents for the holder.
  await prisma.document.deleteMany({ where: { holderId: holder.id, organizationId: org.id } });

  await prisma.document.create({
    data: {
      type: 'EXPERIENCE_LETTER',
      status: 'REQUESTED',
      holderId: holder.id,
      organizationId: org.id,
      signerMemberId: managerMember.id,
      contentJson: { note: 'Requesting experience letter for a visa application.' },
    },
  });

  const salaryContent = {
    type: ['VerifiableCredential', 'SalaryProof'],
    credentialSubject: { fullName: 'Alice Holder', designation: 'Senior Engineer', baseSalary: 185000, currency: 'USD' },
  };
  const salarySalt = generateSalt();
  await prisma.document.create({
    data: {
      type: 'SALARY_PROOF',
      status: 'PENDING_HR',
      holderId: holder.id,
      organizationId: org.id,
      signerMemberId: managerMember.id,
      contentJson: salaryContent,
      salt: salarySalt,
      documentHash: hashDocument(salaryContent, salarySalt),
    },
  });

  const lorContent = {
    type: ['VerifiableCredential', 'LetterOfRecommendation'],
    credentialSubject: { fullName: 'Alice Holder', recommender: 'Marcus Manager', relationship: 'Direct manager, 3 years' },
  };
  await prisma.document.create({
    data: {
      type: 'LETTER_OF_RECOMMENDATION',
      status: 'DRAFT',
      holderId: holder.id,
      organizationId: org.id,
      signerMemberId: managerMember.id,
      contentJson: lorContent,
    },
  });

  await prisma.notification.create({
    data: {
      userId: holder.id,
      type: 'DOCUMENT_REQUESTED',
      title: 'Experience letter requested',
      body: 'Your experience letter request was sent to Acme Corporation.',
    },
  });

  console.log('Seed complete.');
  console.log(`  Organization: ${org.name} (${org.domain})`);
  console.log(`  Accounts (password "${DEMO_PASSWORD}"): admin@, manager@, hr@, recruiter@acme.example.com; alice@holder.example.com`);
  console.log('  External manager (magic-link only): prof@university.edu');
}

function upsertUser(email: string, fullName: string, passwordHash: string | null, isDiscoverable = false) {
  return prisma.user.upsert({
    where: { email },
    update: { fullName },
    create: { email, fullName, passwordHash, emailVerified: true, isDiscoverable },
  });
}

function upsertMember(
  userId: string,
  organizationId: string,
  role: 'ORG_ADMIN' | 'MANAGER' | 'HR' | 'RECRUITER',
  corporateEmail: string,
) {
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
