import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiClientService } from '../../services/ai/ai-client.service.js';
import { toVectorLiteral } from '../../common/utils/pgvector.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Seniority } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

const SENIORITY = new Set<string>(['JUNIOR', 'MID', 'SENIOR', 'LEAD']);
const EMBEDDING_DIM = 384;

// Skill extraction + embeddings for talent matching. Consent (Document.enableSkill
// extraction) is enforced by the caller (document issuance). Embeddings live in the
// pgvector column written via raw SQL, since Prisma models it as Unsupported.
@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiClientService,
  ) {}

  // Single chokepoint for extraction. Enforces consent (privacy rule #1) and that the
  // document is actually issued — so neither the auto-trigger nor the manual endpoint
  // can extract from a non-consented or unissued document.
  async extractForDocument(documentId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (!doc.enableSkillExtraction) {
      throw new ForbiddenException(
        'Skill extraction is not enabled for this document',
      );
    }
    if (doc.status !== 'ISSUED' && doc.status !== 'ANCHORED') {
      throw new ConflictException('Only issued documents can be processed');
    }
    const text = buildText(doc.contentJson);
    if (!text.trim()) return;

    const result = await this.ai.extractSkills(text);
    const seniority =
      result.seniority && SENIORITY.has(result.seniority)
        ? (result.seniority as Seniority)
        : null;
    const data = {
      skillsJson: result.skills as unknown as Prisma.InputJsonValue,
      confidenceScores: (result.confidenceScores ??
        {}) as Prisma.InputJsonValue,
      jobTitle: result.jobTitle ?? null,
      seniority,
      yearsOfExperience: result.yearsOfExperience ?? null,
      industriesJson: (result.industries ??
        []) as unknown as Prisma.InputJsonValue,
      nlpModelVersion: 'ai-service/extract',
    };
    const skill = await this.prisma.extractedSkill.upsert({
      where: { documentId },
      create: { documentId, ...data },
      update: { ...data, extractedAt: new Date() },
    });

    // Embed the semantic profile (title + skills + industries) and store the vector.
    const embedText =
      [result.jobTitle, ...result.skills, ...(result.industries ?? [])]
        .filter(Boolean)
        .join(' ') || text;
    const embedding = await this.ai.embed(embedText);
    if (embedding.length !== EMBEDDING_DIM) {
      // Don't write a wrong-length vector into the vector(384) column — leave it null
      // (the holder simply isn't searchable until a valid embedding exists).
      this.logger.warn(
        `Skipping embedding for ${documentId}: got ${embedding.length} dims`,
      );
      return;
    }
    await this.prisma
      .$executeRaw`UPDATE extracted_skills SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${skill.id}::uuid`;
    this.logger.log(
      `Extracted ${result.skills.length} skill(s) for document ${documentId}`,
    );
  }

  async extractOwned(
    user: AuthenticatedUser,
    documentId: string,
  ): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { holderId: true },
    });
    if (!doc || doc.holderId !== user.id)
      throw new NotFoundException('Document not found');
    // extractForDocument enforces consent + issued-status for both call sites.
    await this.extractForDocument(documentId);
  }

  async listForHolder(user: AuthenticatedUser) {
    const skills = await this.prisma.extractedSkill.findMany({
      where: { document: { holderId: user.id } },
      orderBy: { extractedAt: 'desc' },
      include: {
        document: {
          select: { type: true, organization: { select: { name: true } } },
        },
      },
    });
    const me = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isDiscoverable: true },
    });
    return {
      isDiscoverable: me?.isDiscoverable ?? false,
      skills: skills.map((s) => ({
        documentId: s.documentId,
        documentType: s.document.type,
        organizationName: s.document.organization.name,
        skills: s.skillsJson,
        jobTitle: s.jobTitle,
        seniority: s.seniority,
        yearsOfExperience: s.yearsOfExperience,
        industries: s.industriesJson,
        extractedAt: s.extractedAt,
      })),
    };
  }

  async setDiscoverability(user: AuthenticatedUser, enabled: boolean) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isDiscoverable: enabled },
    });
    return { isDiscoverable: enabled };
  }
}

// Flatten a document's content into a text blob for extraction/embedding. Recurses so
// nested credential fields aren't silently dropped.
function buildText(contentJson: Prisma.JsonValue): string {
  if (
    !contentJson ||
    typeof contentJson !== 'object' ||
    Array.isArray(contentJson)
  )
    return '';
  const root = contentJson as Record<string, unknown>;
  const subject =
    root.credentialSubject &&
    typeof root.credentialSubject === 'object' &&
    !Array.isArray(root.credentialSubject)
      ? (root.credentialSubject as Record<string, unknown>)
      : root;
  const parts: string[] = [];
  collectScalars(subject, parts);
  return parts.join('. ');
}

function collectScalars(value: unknown, out: string[]): void {
  if (value == null) return;
  if (typeof value === 'string' || typeof value === 'number') {
    out.push(String(value));
  } else if (Array.isArray(value)) {
    for (const item of value) collectScalars(item, out);
  } else if (typeof value === 'object') {
    for (const item of Object.values(value)) collectScalars(item, out);
  }
}
