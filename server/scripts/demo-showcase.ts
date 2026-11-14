// Showcase data for the recorded demo (docs/superpowers/specs/2026-11-14-presentation-scope-cut-design.md §6.4).
//
// Issued documents need real seals and signatures, so they cannot be inserted by the seed.
// This script boots the API's own services (no HTTP, no passwords) and drives the same
// request → sign → approve path the app uses, then anchors once and opens Riya's job.
// Run after `npm run db:seed` on an empty database: `npm run demo:showcase`.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import type { AuthenticatedUser } from '../src/common/types/authenticated-user.js';
import { DocumentService } from '../src/modules/document/document.service.js';
import { MerkleService } from '../src/modules/merkle/merkle.service.js';
import { RecruiterService } from '../src/modules/recruiter/recruiter.service.js';
import { SkillService } from '../src/modules/skill/skill.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SHOWCASE } from './showcase-content.js';

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--yes-reset-production')) {
  console.error('Refusing to write showcase data to production without --yes-reset-production.');
  process.exit(1);
}

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
const prisma = app.get(PrismaService);
const documents = app.get(DocumentService);

async function actor(email: string): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: {
      memberships: { where: { isActive: true }, include: { organization: { select: { name: true } } } },
    },
  });
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    hasPassword: user.passwordHash !== null,
    memberships: user.memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      role: m.role,
    })),
  };
}

async function issue(
  holder: AuthenticatedUser,
  manager: AuthenticatedUser,
  hr: AuthenticatedUser,
  item: (typeof SHOWCASE.documents)[number],
  organizationId: string,
): Promise<string> {
  const requested = await documents.request(holder, {
    type: item.type,
    organizationId,
    managerUserId: manager.id,
    enableSkillExtraction: item.enableSkillExtraction,
  });
  await documents.sign(requested.id, manager, { contentJson: item.subject, stepUp: SHOWCASE.stepUp });
  await documents.approve(requested.id, hr, { stepUp: SHOWCASE.stepUp });
  return requested.id;
}

async function waitForAiService(): Promise<void> {
  const base = process.env.AI_SERVICE_URL ?? 'http://localhost:9910';
  for (let attempt = 0; attempt < 36; attempt++) {
    const body = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
    if (body?.status === 'ok' && body.embedding_model !== 'loading') return;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error('AI service did not become ready within 3 minutes');
}

try {
  const techCorp = await prisma.organization.findUniqueOrThrow({ where: { domain: 'techcorp.example.com' } });
  const [alice, bob, marcus, hannah, riya] = await Promise.all(
    [SHOWCASE.emails.alice, SHOWCASE.emails.bob, SHOWCASE.emails.marcus, SHOWCASE.emails.hr, SHOWCASE.emails.recruiter].map(actor),
  );
  const holders = { alice, bob };

  await waitForAiService();
  const issued: Record<string, string> = {};
  for (const item of SHOWCASE.documents) {
    issued[item.label] = await issue(holders[item.holder], marcus, hannah, item, techCorp.id);
    if (item.enableSkillExtraction) await app.get(SkillService).extractForDocument(issued[item.label]);
  }

  const batch = await app.get(MerkleService).runBatch(techCorp.id);
  const opening = await app.get(RecruiterService).createJobOpening(riya, SHOWCASE.jobOpening);

  console.log('Showcase ready.');
  for (const [label, id] of Object.entries(issued)) console.log(`  ${label.padEnd(28)} ${id}`);
  console.log(`  Anchor batch                 ${JSON.stringify(batch)}`);
  console.log(`  Job opening                  ${opening.id}`);
} catch (error) {
  console.error('Showcase failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
