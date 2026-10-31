import { HttpException, HttpStatus } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';

// Step-up brute-force limit: 5 wrong attempts per user per 15 minutes, across every key
// they hold, so signing for several organisations does not multiply the guesses. Every attempt is
// recorded as FAILED BEFORE any work, so attempts still in flight count against the limit
// and parallel guesses cannot all slip past one check. It is then settled: PASSED on a
// match, REFUSED when the lockout turned it away (so hammering a locked key does not keep
// extending the lock), ERRORED when the KMS or database failed rather than the answers.
// The rows double as the audit trail of who tried to unlock a signing key, and when.

const STEP_UP_FAILED = 'EMPLOYEE_KEY_STEP_UP_FAILED';
export const STEP_UP_PASSED = 'EMPLOYEE_KEY_STEP_UP_PASSED';
export const STEP_UP_ERRORED = 'EMPLOYEE_KEY_STEP_UP_ERRORED';
const STEP_UP_REFUSED = 'EMPLOYEE_KEY_STEP_UP_REFUSED';
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60_000;

/** Records the attempt as failed up front; throws 429 once the window is used up. */
export async function reserveAttempt(
  prisma: PrismaService,
  userId: string,
  keyId: string,
): Promise<string> {
  const { id } = await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorType: 'USER',
      action: STEP_UP_FAILED,
      entityType: 'EMPLOYEE_KEY',
      entityId: keyId,
      retentionTier: 'COMPLIANCE',
    },
  });
  const failures = await prisma.auditLog.count({
    where: {
      actorId: userId,
      action: STEP_UP_FAILED,
      createdAt: { gt: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
    },
  });
  // The count includes this attempt, so the sixth inside the window is refused.
  if (failures > LOCKOUT_ATTEMPTS) {
    await settleAttempt(prisma, id, STEP_UP_REFUSED);
    throw new HttpException(
      {
        code: 'STEP_UP_LOCKED',
        message:
          'Too many incorrect attempts. Signing is locked for 15 minutes.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  return id;
}

export async function settleAttempt(
  prisma: PrismaService,
  attemptId: string,
  action: string,
): Promise<void> {
  await prisma.auditLog.update({
    where: { id: attemptId },
    data: { action },
  });
}
