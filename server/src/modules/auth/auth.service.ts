import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { MagicLinkService } from './magic-link.service.js';
import { TokensService, type TokenContext } from './tokens.service.js';

const BCRYPT_ROUNDS = 12;

export interface AuthResult {
  token: string;
  user: AuthenticatedUser;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly magicLink: MagicLinkService,
  ) {}

  async register(dto: RegisterDto, ctx: TokenContext): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
    });
    return this.buildResult(user.id, user.email, ctx);
  }

  async login(dto: LoginDto, ctx: TokenContext): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash || !user.isActive)
      throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.buildResult(user.id, user.email, ctx);
  }

  async loginWithMagicLink(
    token: string,
    ctx: TokenContext,
  ): Promise<AuthResult> {
    const { email } = await this.magicLink.verifyAndConsume(
      token,
      'EMAIL_VERIFY',
    );
    // Magic links sign in existing accounts only — never silently provision one (which
    // would let a deleted/erased email be reconstituted). New users register explicitly.
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.gdprDeletedAt) {
      throw new UnauthorizedException('No active account for this email');
    }
    return this.buildResult(user.id, user.email, ctx);
  }

  async refresh(
    rawToken: string | undefined,
    ctx: TokenContext,
  ): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedException('Missing refresh token');
    const rotated = await this.tokens.rotate(rawToken, ctx);
    if (!rotated) throw new UnauthorizedException('Invalid refresh token');
    const token = await this.tokens.issueAccessToken(
      rotated.userId,
      rotated.email,
    );
    return {
      token,
      user: await this.loadUser(rotated.userId),
      refreshToken: rotated.refreshToken,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) await this.tokens.revoke(rawToken);
  }

  me(userId: string): Promise<AuthenticatedUser> {
    return this.loadUser(userId);
  }

  private async buildResult(
    userId: string,
    email: string,
    ctx: TokenContext,
  ): Promise<AuthResult> {
    const token = await this.tokens.issueAccessToken(userId, email);
    const refreshToken = await this.tokens.issueRefreshToken(userId, ctx);
    return { token, user: await this.loadUser(userId), refreshToken };
  }

  private async loadUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: { select: { name: true } } },
        },
      },
    });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role,
      })),
    };
  }
}
