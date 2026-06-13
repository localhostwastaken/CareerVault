import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { RecruiterService } from './recruiter.service.js';
import type { MessageResponse } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { SendMessageDto } from './dto/send-message.dto.js';

// Recruiter → holder outreach. Holders reply with an interest signal. The holder is
// notified in-app + email on a new message.
@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recruiter: RecruiterService,
    private readonly notifications: NotificationService,
  ) {}

  async send(user: AuthenticatedUser, dto: SendMessageDto) {
    const profile = await this.recruiter.ensureProfile(user);
    const holder = await this.prisma.user.findUnique({
      where: { id: dto.holderId },
      select: { id: true, email: true, isDiscoverable: true },
    });
    if (!holder) throw new NotFoundException('Recipient not found');
    // Outreach is only allowed to a still-discoverable holder the recruiter has actually
    // matched (which already enforced consent + org-scope at match time). This blocks
    // messaging arbitrary/out-of-scope users by UUID.
    if (!holder.isDiscoverable)
      throw new ForbiddenException('This candidate is not discoverable');
    const match = await this.prisma.talentMatch.findFirst({
      where: {
        holderId: dto.holderId,
        jobOpening: { recruiterProfileId: profile.id },
      },
    });
    if (!match)
      throw new ForbiddenException(
        'You can only message candidates matched to your openings',
      );

    const message = await this.prisma.recruiterMessage.create({
      data: {
        recruiterProfileId: profile.id,
        holderId: dto.holderId,
        jobOpeningId: dto.jobOpeningId ?? null,
        subject: dto.subject,
        body: dto.body,
      },
    });
    await this.notifications.notify(
      dto.holderId,
      'RECRUITER_MESSAGE',
      'New recruiter message',
      `${user.fullName} sent you a message: ${dto.subject}`,
      { emailTo: holder.email },
    );
    return { id: message.id, sentAt: message.sentAt };
  }

  async listSent(user: AuthenticatedUser) {
    const profile = await this.recruiter.ensureProfile(user);
    const messages = await this.prisma.recruiterMessage.findMany({
      where: { recruiterProfileId: profile.id },
      orderBy: { sentAt: 'desc' },
      include: {
        holder: { select: { fullName: true } },
        jobOpening: { select: { title: true } },
      },
    });
    return messages.map((m) => ({
      id: m.id,
      holderName: m.holder.fullName,
      subject: m.subject,
      body: m.body,
      jobTitle: m.jobOpening?.title ?? null,
      sentAt: m.sentAt,
      readAt: m.readAt,
      responseType: m.responseType,
    }));
  }

  async listReceived(user: AuthenticatedUser) {
    const messages = await this.prisma.recruiterMessage.findMany({
      where: { holderId: user.id },
      orderBy: { sentAt: 'desc' },
      include: {
        recruiterProfile: {
          select: {
            user: { select: { fullName: true } },
            organization: { select: { name: true } },
          },
        },
        jobOpening: { select: { title: true } },
      },
    });
    return messages.map((m) => ({
      id: m.id,
      recruiterName: m.recruiterProfile.user.fullName,
      organizationName: m.recruiterProfile.organization.name,
      subject: m.subject,
      body: m.body,
      jobTitle: m.jobOpening?.title ?? null,
      sentAt: m.sentAt,
      responseType: m.responseType,
    }));
  }

  async respond(
    user: AuthenticatedUser,
    messageId: string,
    responseType: MessageResponse,
  ) {
    const message = await this.prisma.recruiterMessage.findUnique({
      where: { id: messageId },
    });
    if (!message || message.holderId !== user.id)
      throw new NotFoundException('Message not found');
    await this.prisma.recruiterMessage.update({
      where: { id: messageId },
      data: { responseType, readAt: new Date() },
    });
    return { id: messageId, responseType };
  }
}
