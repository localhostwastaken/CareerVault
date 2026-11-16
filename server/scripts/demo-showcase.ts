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
import { AiClientService } from '../src/services/ai/ai-client.service.js';
import { checkResetTarget } from './reset-guard.js';
import { SHOWCASE } from './showcase-content.js';

// Same guard as the reset: production data is only ever written to the host the operator
// confirmed with CONFIRM_RESET_HOST.
const guard = checkResetTarget(
  process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  process.env.NODE_ENV === 'production' ? 'production' : 'local',
  process.env.CONFIRM_RESET_HOST,
);
if (!guard.ok) {
  console.error(guard.reason);
  process.exit(1);
}

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});
const prisma = app.get(PrismaService);
const documents = app.get(DocumentService);

async function actor(email: string): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: {
      memberships: {
        where: { isActive: true },
        include: { organization: { select: { name: true } } },
      },
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
  await documents.sign(requested.id, manager, {
    contentJson: item.subject,
    stepUp: SHOWCASE.stepUp,
  });
  await documents.approve(requested.id, hr, { stepUp: SHOWCASE.stepUp });
  return requested.id;
}

// The AI service loads its embedding model lazily on the first /embed, which can take
// minutes on a cold Render instance and outlasts the client's timeout (it failed the
// 16 Nov reset). Warm it through the app's own client, which sends the service secret,
// retrying while the model loads server-side.
async function warmAiService(attempts = 6): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await app.get(AiClientService).embed('warm up');
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
      console.log(
        `AI service still waking (attempt ${attempt}/${attempts}); retrying in 20s…`,
      );
      await new Promise((resolve) => setTimeout(resolve, 20_000));
    }
  }
}

try {
  const techCorp = await prisma.organization.findUniqueOrThrow({
    where: { domain: 'techcorp.example.com' },
  });
  const [alice, bob, marcus, hannah, riya] = await Promise.all(
    [
      SHOWCASE.emails.alice,
      SHOWCASE.emails.bob,
      SHOWCASE.emails.marcus,
      SHOWCASE.emails.hr,
      SHOWCASE.emails.recruiter,
    ].map(actor),
  );
  const holders = { alice, bob };

  await warmAiService();
  const issued: Record<string, string> = {};
  for (const item of SHOWCASE.documents) {
    issued[item.label] = await issue(
      holders[item.holder],
      marcus,
      hannah,
      item,
      techCorp.id,
    );
    if (item.enableSkillExtraction)
      await app.get(SkillService).extractForDocument(issued[item.label]);
  }

  const batch = await app.get(MerkleService).runBatch(techCorp.id);
  const opening = await app
    .get(RecruiterService)
    .createJobOpening(riya, SHOWCASE.jobOpening);

  console.log('Showcase ready.');
  for (const [label, id] of Object.entries(issued))
    console.log(`  ${label.padEnd(28)} ${id}`);
  console.log(`  Anchor batch                 ${JSON.stringify(batch)}`);
  console.log(`  Job opening                  ${opening.id}`);
} catch (error) {
  console.error(
    'Showcase failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
} finally {
  await app.close();
}
