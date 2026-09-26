import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleEmailService } from './console-email.service.js';
import { EmailService } from './email.service.js';
import { GmailEmailService } from './gmail-email.service.js';

@Module({
  providers: [
    {
      provide: EmailService,
      // ConsoleEmailService/GmailEmailService are constructed here, not listed as ordinary providers — GmailEmailService's constructor requires GMAIL_USER/GMAIL_APP_PASSWORD, and Nest eagerly instantiates every provider in a module's list regardless of which one a factory picks, so EMAIL_DRIVER=console would still crash the app on boot if those Gmail vars were unset. Only build the driver actually selected.
      useFactory: (config: ConfigService): EmailService => {
        const driver = config.get<string>('EMAIL_DRIVER');
        if (driver === 'console') return new ConsoleEmailService();
        if (driver === 'gmail') return new GmailEmailService(config);
        throw new Error(`EMAIL_DRIVER="${driver}" not implemented`);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
