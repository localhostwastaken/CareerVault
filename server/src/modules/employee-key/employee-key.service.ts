import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { EmployeeKey } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KeyManagementService } from '../../services/key-management/key-management.service.js';
import type {
  EmployeeSecretsDto,
  EnrollEmployeeKeyDto,
} from './dto/employee-secrets.dto.js';
import {
  deriveEmployeeKey,
  KDF_ITERATIONS,
  newKdfSalt,
  secretMaterial,
} from './key-derivation.js';
import { questionText } from './security-questions.js';
import {
  reserveAttempt,
  settleAttempt,
  STEP_UP_ERRORED,
  STEP_UP_PASSED,
} from './step-up-lockout.js';

const SIGNING_ROLES = new Set(['MANAGER', 'HR']);

export interface UnlockedKey {
  keyId: string;
  key: Buffer;
}

// Per-signer employee keys: enrolment, the step-up that unlocks a key to sign, and opening a
// pinned key to verify. Derivation is in key-derivation.ts and wrapping in the KMS adapter;
// this service owns the rows and the rules around them.
@Injectable()
export class EmployeeKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kms: KeyManagementService,
  ) {}

  /** Each organisation where the user signs (MANAGER or HR), with their key status there. */
  async listForUser(user: AuthenticatedUser) {
    const orgs = new Map(
      user.memberships
        .filter((m) => SIGNING_ROLES.has(m.role))
        .map((m) => [m.organizationId, m.organizationName]),
    );
    const keys = await this.prisma.employeeKey.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      select: {
        organizationId: true,
        version: true,
        questionIds: true,
        createdAt: true,
      },
    });
    return [...orgs].map(([organizationId, organizationName]) => {
      const key = keys.find((k) => k.organizationId === organizationId);
      return {
        organizationId,
        organizationName,
        isEnrolled: Boolean(key),
        enrolledAt: key?.createdAt ?? null,
        version: key?.version ?? null,
        questions: (key?.questionIds ?? []).map((id) => ({
          id,
          text: questionText(id),
        })),
      };
    });
  }

  // Re-enrolling retires the previous key instead of deleting it: documents it sealed pin its
  // id, and verifying them needs it for as long as they exist.
  async enroll(user: AuthenticatedUser, dto: EnrollEmployeeKeyDto) {
    const { organizationId } = dto;
    if (
      !user.memberships.some(
        (m) => m.organizationId === organizationId && SIGNING_ROLES.has(m.role),
      )
    )
      throw new ForbiddenException(
        'Only managers and HR of this organisation sign documents',
      );

    const active = await this.prisma.employeeKey.findFirst({
      where: { userId: user.id, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (active) {
      if (!dto.currentStepUp)
        throw new ForbiddenException({
          code: 'CURRENT_ANSWERS_REQUIRED',
          message:
            'Enter your current details to replace your signing key. Forgot them? Ask an organisation admin to reset it.',
        });
      (await this.unlock(user.id, organizationId, dto.currentStepUp)).key.fill(
        0,
      );
    }

    const questionIds = dto.answers.map((answer) => answer.questionId);
    const kdfSalt = newKdfSalt();
    const key = await deriveEmployeeKey(
      secretMaterial(dto, questionIds),
      kdfSalt,
      KDF_ITERATIONS,
    );
    try {
      await this.prisma.$transaction(async (tx) => {
        const latest = await tx.employeeKey.findFirst({
          where: { userId: user.id, organizationId },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        const version = (latest?.version ?? 0) + 1;
        await tx.employeeKey.updateMany({
          where: { userId: user.id, organizationId, status: 'ACTIVE' },
          data: { status: 'RETIRED', retiredAt: new Date() },
        });
        const created = await tx.employeeKey.create({
          data: {
            userId: user.id,
            organizationId,
            version,
            kdfSalt,
            kdfIterations: KDF_ITERATIONS,
            questionIds,
            wrappedKey: await this.kms.wrapEmployeeKey(key, {
              organizationId,
              userId: user.id,
              version,
            }),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            actorType: 'USER',
            action: 'EMPLOYEE_KEY_ENROLLED',
            entityType: 'EMPLOYEE_KEY',
            entityId: created.id,
            retentionTier: 'COMPLIANCE',
            newValue: { organizationId, version },
          },
        });
      });
    } finally {
      key.fill(0);
    }
    const status = await this.listForUser(user);
    return status.find((entry) => entry.organizationId === organizationId);
  }

  /**
   * Step-up: re-derives the signer's key from what they just typed and compares it, in
   * constant time, with the stored one. Only a match releases the key for signing.
   */
  async unlock(
    userId: string,
    organizationId: string,
    secrets: EmployeeSecretsDto,
  ): Promise<UnlockedKey> {
    const row = await this.prisma.employeeKey.findFirst({
      where: { userId, organizationId, status: 'ACTIVE' },
    });
    if (!row)
      throw new ConflictException({
        code: 'EMPLOYEE_KEY_REQUIRED',
        message:
          'Set up your signing security in your profile before you sign documents.',
      });
    const attempt = await reserveAttempt(this.prisma, userId, row.id);

    let stored: Buffer;
    let derived: Buffer | null;
    try {
      stored = await this.kms.unwrapEmployeeKey(row.wrappedKey, {
        organizationId,
        userId,
        version: row.version,
      });
      derived = await this.derive(secrets, row);
    } catch (error) {
      // An infrastructure fault, not a wrong answer: it must not count toward the lockout.
      await settleAttempt(this.prisma, attempt, STEP_UP_ERRORED);
      throw error;
    }
    const isMatch = derived !== null && timingSafeEqual(stored, derived);
    derived?.fill(0);
    if (!isMatch) {
      stored.fill(0);
      throw new ForbiddenException({
        code: 'STEP_UP_FAILED',
        message:
          'Those details do not match your signing key. Check your date of birth, ID and answers.',
      });
    }
    await settleAttempt(this.prisma, attempt, STEP_UP_PASSED);
    return { keyId: row.id, key: stored };
  }

  /** Opens a pinned key for verification; null when it can no longer be opened. */
  async open(row: EmployeeKey): Promise<Buffer | null> {
    try {
      return await this.kms.unwrapEmployeeKey(row.wrappedKey, {
        organizationId: row.organizationId,
        userId: row.userId,
        version: row.version,
      });
    } catch {
      return null;
    }
  }

  private async derive(
    secrets: EmployeeSecretsDto,
    row: EmployeeKey,
  ): Promise<Buffer | null> {
    try {
      return await deriveEmployeeKey(
        secretMaterial(secrets, row.questionIds),
        row.kdfSalt,
        row.kdfIterations,
      );
    } catch (error) {
      // Answers to other questions than the enrolled ones count as a wrong answer.
      if (error instanceof TypeError) return null;
      throw error;
    }
  }
}
