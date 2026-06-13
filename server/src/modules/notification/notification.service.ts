import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../../services/email/email.service.js';
import { escapeHtml } from '../../common/utils/html.js';
import type { PaginationDto } from '../../common/dtos/pagination.dto.js';
import type { NotificationType } from '../../generated/prisma/enums.js';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // Creates the in-app record and (optionally) sends the email — the single entry
  // point for user-facing notifications across the platform.
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    options?: { emailTo?: string },
  ): Promise<void> {
    await this.prisma.notification.create({
      data: { userId, type, title, body },
    });
    if (options?.emailTo) {
      // body is plain text (the client renders it as text); escape before HTML email.
      await this.email.send({
        to: options.emailTo,
        subject: title,
        html: `<p>${escapeHtml(body)}</p>`,
      });
    }
  }

  async list(userId: string, pagination: PaginationDto) {
    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return {
      data: items,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        unreadCount,
      },
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { id, isRead: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}
