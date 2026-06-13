import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiClientService } from '../../services/ai/ai-client.service.js';
import { toVectorLiteral } from '../../common/utils/pgvector.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Seniority } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { CreateJobOpeningDto } from './dto/create-job-opening.dto.js';

// Recruiter profile + job openings. A job opening is embedded on creation so talent
// search (TalentService) can retrieve candidates by pgvector similarity.
@Injectable()
export class RecruiterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiClientService,
  ) {}

  // Resolve (or lazily provision) the caller's recruiter profile from their membership.
  async ensureProfile(user: AuthenticatedUser) {
    const existing = await this.prisma.recruiterProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) return existing;
    const membership = user.memberships.find((m) => m.role === 'RECRUITER');
    if (!membership) throw new ForbiddenException('Not a recruiter');
    return this.prisma.recruiterProfile.create({
      data: { userId: user.id, organizationId: membership.organizationId },
    });
  }

  async createJobOpening(user: AuthenticatedUser, dto: CreateJobOpeningDto) {
    const profile = await this.ensureProfile(user);
    const opening = await this.prisma.recruiterJobOpening.create({
      data: {
        recruiterProfileId: profile.id,
        organizationId: profile.organizationId,
        title: dto.title,
        description: dto.description,
        requiredSkillsJson:
          dto.requiredSkills as unknown as Prisma.InputJsonValue,
        seniority: (dto.seniority ?? null) as Seniority | null,
        yearsExpMin: dto.yearsExpMin ?? null,
      },
    });
    const embedding = await this.ai.embed(
      [dto.title, dto.description, ...dto.requiredSkills].join(' '),
    );
    await this.prisma
      .$executeRaw`UPDATE recruiter_job_openings SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${opening.id}::uuid`;
    return this.present(opening.id);
  }

  async listJobOpenings(user: AuthenticatedUser) {
    const profile = await this.ensureProfile(user);
    const openings = await this.prisma.recruiterJobOpening.findMany({
      where: { recruiterProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { matches: true } } },
    });
    return openings.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      requiredSkills: o.requiredSkillsJson,
      seniority: o.seniority,
      yearsExpMin: o.yearsExpMin,
      closedAt: o.closedAt,
      createdAt: o.createdAt,
      matchCount: o._count.matches,
    }));
  }

  async getOwnedOpening(user: AuthenticatedUser, id: string) {
    const profile = await this.ensureProfile(user);
    const opening = await this.prisma.recruiterJobOpening.findUnique({
      where: { id },
    });
    if (!opening || opening.recruiterProfileId !== profile.id) {
      throw new NotFoundException('Job opening not found');
    }
    return opening;
  }

  async closeJobOpening(user: AuthenticatedUser, id: string) {
    await this.getOwnedOpening(user, id);
    await this.prisma.recruiterJobOpening.update({
      where: { id },
      data: { closedAt: new Date() },
    });
    return { id, closed: true };
  }

  private async present(id: string) {
    const o = await this.prisma.recruiterJobOpening.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { matches: true } } },
    });
    return {
      id: o.id,
      title: o.title,
      description: o.description,
      requiredSkills: o.requiredSkillsJson,
      seniority: o.seniority,
      yearsExpMin: o.yearsExpMin,
      closedAt: o.closedAt,
      createdAt: o.createdAt,
      matchCount: o._count.matches,
    };
  }
}
