import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleEmailService } from './console-email.service.js';
import { EmailService } from './email.service.js';
import { GmailEmailService } from './gmail-email.service.js';

@Module({
  providers: [
    ConsoleEmailService,
    GmailEmailService,
    {
      provide: EmailService,
      useFactory: (
        config: ConfigService,
        console: ConsoleEmailService,
        gmail: GmailEmailService,
      ): EmailService => {
        const driver = config.get<string>('EMAIL_DRIVER');
        if (driver === 'console') return console;
        if (driver === 'gmail') return gmail;
        throw new Error(
          `EMAIL_DRIVER="${driver}" not implemented`,
        );
      },
      inject: [ConfigService, ConsoleEmailService, GmailEmailService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
