import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

// Employee signing keys at rest. Each organisation gets its own key-encryption key, derived
// from KMS_MASTER_KEY with HKDF (salt = organisation id), so no one key wraps every org's
// employees and no key here is reused for any other purpose. The derived employee key is
// sealed with AES-256-GCM under that KEK with a fresh 12-byte IV, and the AAD names the row
// it belongs to: an envelope copied onto another user, org or key version fails to open.
// Shared by the local and Supabase KMS drivers, which differ only in where org RSA keys live.

const KEK_INFO = 'careervault/employee-kek/v1';
const PREFIX = 'ekw1';

export interface EmployeeKeyContext {
  organizationId: string;
  userId: string;
  version: number;
}

function kekFor(master: Buffer, organizationId: string): Buffer {
  return Buffer.from(
    hkdfSync(
      'sha256',
      master,
      Buffer.from(organizationId, 'utf8'),
      KEK_INFO,
      32,
    ),
  );
}

function aadFor(ctx: EmployeeKeyContext): Buffer {
  return Buffer.from(
    `careervault|employee-key|${ctx.organizationId}|${ctx.userId}|v${ctx.version}`,
    'utf8',
  );
}

export function wrapEmployeeKey(
  master: Buffer,
  key: Buffer,
  ctx: EmployeeKeyContext,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    kekFor(master, ctx.organizationId),
    iv,
  );
  cipher.setAAD(aadFor(ctx));
  const body = Buffer.concat([cipher.update(key), cipher.final()]);
  return [PREFIX, iv, body, cipher.getAuthTag()]
    .map((part) =>
      typeof part === 'string' ? part : part.toString('base64url'),
    )
    .join(':');
}

/** Throws when the envelope is malformed, edited, or belongs to another row or master key. */
export function unwrapEmployeeKey(
  master: Buffer,
  wrapped: string,
  ctx: EmployeeKeyContext,
): Buffer {
  const parts = wrapped.split(':');
  if (parts.length !== 4 || parts[0] !== PREFIX)
    throw new Error('Not an employee key envelope');
  const [, iv, body, tag] = parts.map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv(
    'aes-256-gcm',
    kekFor(master, ctx.organizationId),
    iv,
  );
  decipher.setAAD(aadFor(ctx));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}
