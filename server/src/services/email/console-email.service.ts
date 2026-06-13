import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailService } from './email.service.js';

// Dev email sink — logs instead of sending. Magic links / notifications are visible
// in the server console during development.
@Injectable()
export class ConsoleEmailService extends EmailService {
  private readonly logger = new Logger('Email');

  send(message: EmailMessage): Promise<void> {
    this.logger.log(`[email] to=${message.to} subject="${message.subject}"`);
    // dev sink: surface the body (incl. magic-link URLs) so links are actionable locally
    this.logger.log(message.html);
    return Promise.resolve();
  }
}
