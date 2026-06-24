import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiClientService } from '../../services/ai/ai-client.service.js';
import { RecruiterService } from './recruiter.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

const SENIORITY_RANK: Record<string, number> = {
  JUNIOR: 0,
  MID: 1,
  SENIOR: 2,
  LEAD: 3,
};

interface CandidateRow {
  holderId: string;
  holderName: string;
  skills: unknown;
  seniority: string | null;
  years: number | null;
  industries: unknown;
  extractedAt: Date;
  similarity: number;
}

export interface ShapContribution {
  feature: string;
  value: number;
  shap_value: number;
}
interface RankedCandidate {
  holder_id: string;
  match_score: number;
  base_value: number;
  contributions: ShapContribution[];
}
interface RankResponse {
  ranked: RankedCandidate[];
  model_version: string;
}

// Talent matching (full rigor): pgvector cosine retrieval over consented candidates,
// feature engineering, then the ai-service ranker for scores + SHAP explanations, which
// are persisted as TalentMatch rows.
@Injectable()
export class TalentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiClientService,
    private readonly recruiter: RecruiterService,
  ) {}

  async search(user: AuthenticatedUser, jobOpeningId: string) {
    const opening = await this.recruiter.getOwnedOpening(user, jobOpeningId);
    if (opening.closedAt) throw new ConflictException('Job opening is closed');
    const profile = await this.recruiter.ensureProfile(user);

    const jobVecRows = await this.prisma.$queryRaw<
      { embedding: string | null }[]
    >`
      SELECT embedding::text AS embedding FROM recruiter_job_openings WHERE id = ${jobOpeningId}::uuid`;
    const jobVec = jobVecRows[0]?.embedding ?? null;
    if (!jobVec) return { jobOpeningId, modelVersion: null, matches: [] };

    // Org scoping (R6): SAME_ORG recruiters only see their org's discoverable holders.
    const orgScope =
      profile.searchScope === 'SAME_ORG' ? profile.organizationId : null;
    const rows = await this.prisma.$queryRaw<CandidateRow[]>`
      SELECT d.holder_id AS "holderId", u.full_name AS "holderName",
             es.skills_json AS "skills", es.seniority::text AS "seniority",
             es.years_of_experience AS "years", es.industries_json AS "industries",
             es.extracted_at AS "extractedAt",
             1 - (es.embedding <=> ${jobVec}::vector) AS "similarity"
      FROM extracted_skills es
      JOIN documents d ON d.id = es.document_id
      JOIN users u ON u.id = d.holder_id
      WHERE es.embedding IS NOT NULL
        AND u.is_discoverable = true
        AND (${orgScope}::uuid IS NULL OR d.organization_id = ${orgScope}::uuid)
      ORDER BY es.embedding <=> ${jobVec}::vector
      LIMIT 30`;

    // One row per holder (best-matching document), top 10.
    const seen = new Set<string>();
    const top: CandidateRow[] = [];
    for (const row of rows) {
      if (!seen.has(row.holderId)) {
        seen.add(row.holderId);
        top.push(row);
      }
    }
    const candidates = top.slice(0, 10);
    if (candidates.length === 0)
      return { jobOpeningId, modelVersion: null, matches: [] };

    const requiredSkills = asStringArray(opening.requiredSkillsJson);
    const description = opening.description.toLowerCase();
    const rankPayload = {
      job_required_skills: requiredSkills,
      candidates: candidates.map((c) => {
        const industries = asStringArray(c.industries);
        return {
          holder_id: c.holderId,
          skills: asStringArray(c.skills),
          embedding_similarity: clamp01(c.similarity),
          seniority_fit: seniorityFit(opening.seniority, c.seniority),
          industry_overlap: industries.length
            ? industries.filter((i) => description.includes(i.toLowerCase()))
                .length / industries.length
            : 0,
          years_exp_fit: yearsFit(opening.yearsExpMin, c.years),
          recency: recency(c.extractedAt),
        };
      }),
    };

    const ranked = await this.ai.rank<RankResponse>(rankPayload);

    // Only persist/return holders that came from the scoped, consented query — never
    // trust an id the ranker echoes back that we didn't send.
    const allowed = new Set(candidates.map((c) => c.holderId));
    const scored = ranked.ranked.filter((rc) => allowed.has(rc.holder_id));

    // Persist each scored match with its SHAP explanation.
    for (const rc of scored) {
      const explanation = {
        baseValue: rc.base_value,
        contributions: rc.contributions,
      } as unknown as Prisma.InputJsonValue;
      await this.prisma.talentMatch.upsert({
        where: {
          jobOpeningId_holderId: { jobOpeningId, holderId: rc.holder_id },
        },
        create: {
          jobOpeningId,
          holderId: rc.holder_id,
          matchScore: rc.match_score,
          shapExplanationJson: explanation,
        },
        update: {
          matchScore: rc.match_score,
          shapExplanationJson: explanation,
        },
      });
    }

    const byHolder = new Map(candidates.map((c) => [c.holderId, c]));
    const matches = scored.map((rc) => {
      const c = byHolder.get(rc.holder_id);
      return {
        holderId: rc.holder_id,
        holderName: c?.holderName ?? 'Unknown',
        skills: asStringArray(c?.skills),
        matchScore: rc.match_score,
        baseValue: rc.base_value,
        contributions: rc.contributions,
      };
    });
    return { jobOpeningId, modelVersion: ranked.model_version, matches };
  }

  async listMatches(user: AuthenticatedUser, jobOpeningId: string) {
    await this.recruiter.getOwnedOpening(user, jobOpeningId);
    const matches = await this.prisma.talentMatch.findMany({
      // Honor consent revocation at read: hide holders who have since opted out.
      where: { jobOpeningId, holder: { isDiscoverable: true } },
      orderBy: { matchScore: 'desc' },
      include: { holder: { select: { id: true, fullName: true } } },
    });
    const skillsByHolder = await this.skillsByHolder(
      matches.map((m) => m.holderId),
    );
    return matches.map((m) => ({
      holderId: m.holderId,
      holderName: m.holder.fullName,
      skills: skillsByHolder.get(m.holderId) ?? [],
      matchScore: m.matchScore,
      explanation: m.shapExplanationJson,
      createdAt: m.createdAt,
    }));
  }

  private async skillsByHolder(
    holderIds: string[],
  ): Promise<Map<string, string[]>> {
    if (holderIds.length === 0) return new Map();
    const rows = await this.prisma.extractedSkill.findMany({
      where: { document: { holderId: { in: holderIds } } },
      select: { skillsJson: true, document: { select: { holderId: true } } },
    });
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const existing = map.get(row.document.holderId) ?? [];
      map.set(row.document.holderId, [
        ...new Set([...existing, ...asStringArray(row.skillsJson)]),
      ]);
    }
    return map;
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function seniorityFit(job: string | null, candidate: string | null): number {
  if (!job || !candidate) return 0.5;
  return (
    1 -
    Math.abs((SENIORITY_RANK[job] ?? 0) - (SENIORITY_RANK[candidate] ?? 0)) / 3
  );
}

function yearsFit(min: number | null, years: number | null): number {
  if (min == null) return 0.5;
  if (years == null) return 0.3;
  return years >= min ? 1 : clamp01(years / min);
}

function recency(extractedAt: Date): number {
  const days = (Date.now() - new Date(extractedAt).getTime()) / 86_400_000;
  return clamp01(1 - days / 365);
}
