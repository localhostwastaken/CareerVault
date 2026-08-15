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

// PRIVACY — third-party LLM egress boundary.
//
// buildText produces the ONLY payload that leaves CareerVault for Groq's API. The consent
// the holder grants says "read skills from this document" and nothing more, so this is a
// default-DENY allowlist: a field is sent because it is named below as skill signal, never
// because it merely happens to be a scalar. The previous recursive walk shipped every
// scalar in the signed subject — compensation, statutory IDs and third-party names
// included — which the consent copy never covered.
//
// Fields deliberately withheld (all present in the signed subjects, none skill signal):
//   compensation  — every *Paise key (basicPaise, annualCtcPaise, lastDrawnCtcPaise, …)
//   statutory IDs — panMasked, uanNumber, employeeCode
//   identities    — employeeName, candidateName, recommenderName/Email/Phone,
//                   signatoryName, signatoryDesignation, reportingManager
//   provenance    — referenceNumber, salt/hash fields, dates, placeOfIssue
//
// Kept flat on purpose: no recursion means a nested object added to a subject later cannot
// silently start leaking scalars — it is simply not sent until allowlisted here.
//
// Residual, accepted: the two prose fields (conductSummary, overallAssessment) are written
// by humans and typically name the subject inline ("Priya led the payments migration").
// That prose IS the skill signal, so it cannot be dropped without defeating extraction; it
// is squarely within what "read skills from this document" covers. Structured identity,
// compensation and statutory fields are what must never travel, and none of them do.
const SKILL_TEXT_FIELDS = [
  'jobTitle',
  'designation',
  'candidateTitle',
  'department',
  'employmentType',
  'workLocation',
  'organizationContext',
  'conductSummary',
  'overallAssessment',
  'keyStrengths',
] as const;

// Defense in depth: even if one of the keys above is later reused for something sensitive,
// or an allowlisted name collides with a sensitive field in a future subject type, these
// patterns drop it. The allowlist is the control; this is the backstop.
const DENIED_KEY =
  /(paise$|^pan|uan|employeecode|employeename|candidatename|email|phone|mobile|salt|hash|^signatory|referencenumber|aadhaar|accountnumber)/i;

// Flatten the skill-relevant slice of a document's content into a text blob for
// extraction/embedding.
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
  for (const key of SKILL_TEXT_FIELDS) {
    if (DENIED_KEY.test(key)) continue;
    // Only strings and string arrays are emitted: no numeric field is skill signal here,
    // so refusing numbers outright keeps money/identifier values unsendable by construction.
    const value = subject[key];
    if (typeof value === 'string') {
      if (value.trim()) parts.push(value.trim());
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) parts.push(item.trim());
      }
    }
  }
  return parts.join('. ');
}
