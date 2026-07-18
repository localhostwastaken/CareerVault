import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { EmailMessage, EmailService } from './email.service.js';

// Gmail SMTP transport via App Passwords — free for up to 500 recipients/day.
// Requires 2FA enabled on the Google account and a generated App Password
// (https://myaccount.google.com/apppasswords). Does NOT require a custom domain
// or credit card, so it's the right choice for localhost prototypes.
//
// Gmail silently rewrites the From address to the authenticated Gmail account,
// so `message.to` is the only meaningful addressing field here.
@Injectable()
export class GmailEmailService extends EmailService {
  private readonly logger = new Logger('Email');
  private readonly transporter: Transporter;

  constructor(config: ConfigService) {
    super();
    const user = config.getOrThrow<string>('GMAIL_USER');
    const pass = config.getOrThrow<string>('GMAIL_APP_PASSWORD');

    this.transporter = createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS
      auth: { user, pass },
    });

    this.logger.log(`Gmail transport ready for ${user}`);
  }

  async send(message: EmailMessage): Promise<void> {
    // Gmail rewrites From — omit it so the authenticated user is used.
    await this.transporter.sendMail({
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    this.logger.log(`[email] sent to=${message.to} subject="${message.subject}"`);
  }
}
