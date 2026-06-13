import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ConfigService } from '@nestjs/config';

export interface JwtKeys {
  privateKey: string;
  publicKey: string;
}

// RS256 key pair for access tokens. Use env-provided PEM (escaped \n) in production;
// otherwise generate and persist a dev key pair under ./keys so tokens survive restarts.
export function resolveJwtKeys(config: ConfigService): JwtKeys {
  const envPrivate = config.get<string>('JWT_PRIVATE_KEY');
  const envPublic = config.get<string>('JWT_PUBLIC_KEY');
  if (envPrivate && envPublic) {
    return {
      privateKey: envPrivate.replace(/\\n/g, '\n'),
      publicKey: envPublic.replace(/\\n/g, '\n'),
    };
  }

  const dir = join(process.cwd(), 'keys');
  const privatePath = join(dir, 'jwt_private.pem');
  const publicPath = join(dir, 'jwt_public.pem');
  if (existsSync(privatePath) && existsSync(publicPath)) {
    return {
      privateKey: readFileSync(privatePath, 'utf8'),
      publicKey: readFileSync(publicPath, 'utf8'),
    };
  }

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  mkdirSync(dirname(privatePath), { recursive: true, mode: 0o700 });
  writeFileSync(privatePath, privateKey, { mode: 0o600 });
  writeFileSync(publicPath, publicKey, { mode: 0o644 });
  return { privateKey, publicKey };
}
