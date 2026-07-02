import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { envValidationSchema } from './config/env.validation.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ServicesModule } from './services/services.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { MemberModule } from './modules/member/member.module.js';
import { UserModule } from './modules/user/user.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { DocumentModule } from './modules/document/document.module.js';
import { MerkleModule } from './modules/merkle/merkle.module.js';
import { VerificationModule } from './modules/verification/verification.module.js';
import { PaymentsModule } from './modules/payment/payments.module.js';
import { ShareLinkModule } from './modules/share-link/share-link.module.js';
import { SubscriptionModule } from './modules/subscription/subscription.module.js';
import { SkillModule } from './modules/skill/skill.module.js';
import { RecruiterModule } from './modules/recruiter/recruiter.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuditModule } from './modules/audit/audit.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    ServicesModule,
    HealthModule,
    AuthModule,
    OrganizationModule,
    MemberModule,
    UserModule,
    NotificationModule,
    DocumentModule,
    MerkleModule,
    VerificationModule,
    PaymentsModule,
    ShareLinkModule,
    SubscriptionModule,
    SkillModule,
    RecruiterModule,
    MaintenanceModule,
    AnalyticsModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // ThrottlerGuard first so even @Public routes (verify, auth) are rate-limited.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
