import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationService } from '../notification/notification.service.js';

@Injectable()
export class EmployeeKeyResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // The admin's path for an employee who forgot their answers: retire the active key so they
  // can enrol afresh. Documents it sealed still verify (the key is kept, only retired), and
  // the employee is told, since a reset they did not ask for means someone else did.
  async reset(
    admin: AuthenticatedUser,
    organizationId: string,
    userId: string,
  ) {
    if (
      !admin.memberships.some(
        (m) => m.organizationId === organizationId && m.role === 'ORG_ADMIN',
      )
    )
      throw new ForbiddenException(
        'Only an admin of this organisation can reset signing keys',
      );
    // A reset skips the current-answers check on re-enrolment, so an admin resetting their
    // own key would be exactly the bypass that check exists to stop.
    if (userId === admin.id)
      throw new ForbiddenException(
        'Ask another administrator to reset your own signing key',
      );
    const signer = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        isActive: true,
        role: { in: ['MANAGER', 'HR'] },
      },
      select: { id: true },
    });
    if (!signer)
      throw new ForbiddenException(
        'Only a manager or HR member of this organisation has a signing key',
      );
    const retired = await this.prisma.employeeKey.updateMany({
      where: { userId, organizationId, status: 'ACTIVE' },
      data: { status: 'RETIRED', retiredAt: new Date() },
    });
    if (retired.count === 0)
      throw new ConflictException('This member has no active signing key');
    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorType: 'USER',
        action: 'EMPLOYEE_KEY_RESET',
        entityType: 'USER',
        entityId: userId,
        retentionTier: 'COMPLIANCE',
        newValue: { organizationId },
      },
    });
    await this.notifications.notify(
      userId,
      'SECURITY_ALERT',
      'Your signing key was reset',
      `${admin.fullName} reset your signing key. Set up your signing security again before you sign. If you did not ask for this, tell your administrator.`,
    );
    return { reset: true };
  }
}
