import bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { TokenContext } from './tokens.service.js';

/**
 * Demo master password gate (regression guard).
 *
 * The master password used to work unconditionally in every environment. It must now be
 * inert unless DEMO_MASTER_PASSWORD_ENABLED is explicitly turned on, so a real deploy that
 * forgets to configure it does not ship a universal backdoor.
 */

const MASTER_PASSWORD = 'Password123@';
const REAL_PASSWORD = 'CorrectHorseBattery9!';
const CTX = {} as TokenContext;

interface UserRow {
  id: string;
  email: string;
  passwordHash: string | null;
  isActive: boolean;
  gdprDeletedAt: Date | null;
}

function makePrisma(users: UserRow[]) {
  return {
    user: {
      findUnique: ({ where }: { where: { email: string } }) =>
        Promise.resolve(users.find((u) => u.email === where.email) ?? null),
      findUniqueOrThrow: ({ where }: { where: { id: string } }) => {
        const user = users.find((u) => u.id === where.id);
        if (!user) throw new Error(`no user ${where.id}`);
        return Promise.resolve({
          ...user,
          fullName: 'Test User',
          memberships: [],
        });
      },
    },
  };
}

const tokens = {
  issueAccessToken: () => Promise.resolve('access-token'),
  issueRefreshToken: () => Promise.resolve('refresh-token'),
};

function makeConfig(enabled: boolean) {
  return {
    get: (key: string) =>
      key === 'DEMO_MASTER_PASSWORD_ENABLED' ? enabled : undefined,
  };
}

describe('AuthService demo master password', () => {
  const buildUser = async (): Promise<UserRow> => ({
    id: 'u-1',
    email: 'holder@example.com',
    passwordHash: await bcrypt.hash(REAL_PASSWORD, 4),
    isActive: true,
    gdprDeletedAt: null,
  });

  it('rejects the master password when the demo flag is off', async () => {
    const user = await buildUser();
    const service = new AuthService(
      makePrisma([user]) as never,
      tokens as never,
      {} as never,
      makeConfig(false) as never,
    );

    await expect(
      service.login({ email: user.email, password: MASTER_PASSWORD }, CTX),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('still allows the real password through when the flag is off', async () => {
    const user = await buildUser();
    const service = new AuthService(
      makePrisma([user]) as never,
      tokens as never,
      {} as never,
      makeConfig(false) as never,
    );

    await expect(
      service.login({ email: user.email, password: REAL_PASSWORD }, CTX),
    ).resolves.toMatchObject({ user: { id: user.id } });
  });

  it('accepts the master password for the user when the demo flag is on', async () => {
    const user = await buildUser();
    const service = new AuthService(
      makePrisma([user]) as never,
      tokens as never,
      {} as never,
      makeConfig(true) as never,
    );

    await expect(
      service.login({ email: user.email, password: MASTER_PASSWORD }, CTX),
    ).resolves.toMatchObject({ user: { id: user.id } });
  });
});
