import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleEmailService } from './console-email.service.js';
import { EmailService } from './email.service.js';

@Module({
  providers: [
    ConsoleEmailService,
    {
      provide: EmailService,
      useFactory: (
        config: ConfigService,
        console: ConsoleEmailService,
      ): EmailService => {
        const driver = config.get<string>('EMAIL_DRIVER');
        if (driver === 'console') return console;
        throw new Error(
          `EMAIL_DRIVER="${driver}" not implemented (only "console")`,
        );
      },
      inject: [ConfigService, ConsoleEmailService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
