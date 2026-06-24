import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MagicLinkService } from './magic-link.service.js';
import { TokensService } from './tokens.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { resolveJwtKeys } from './jwt-keys.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const keys = resolveJwtKeys(config);
        // expiresIn's type is ms's StringValue; the env value is a valid ms duration at runtime.
        const accessTtl = (config.get<string>('JWT_ACCESS_TTL') ??
          '15m') as `${number}${'m' | 'h' | 'd'}`;
        return {
          privateKey: keys.privateKey,
          publicKey: keys.publicKey,
          signOptions: { algorithm: 'RS256', expiresIn: accessTtl },
          verifyOptions: { algorithms: ['RS256'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, MagicLinkService, JwtStrategy],
  exports: [MagicLinkService],
})
export class AuthModule {}
