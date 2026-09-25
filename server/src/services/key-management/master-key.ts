import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Logger } from '@nestjs/common';

// Root of key custody for R3 signing and R10 field encryption: every org signing key file
// is wrapped under this key and the field KEK is derived from it. A different key cannot
// open anything the old one wrapped, so this loader fails loudly instead of guessing.
export function loadMasterKey(
  envKey: string | undefined,
  keysDir: string,
  logger: Pick<Logger, 'warn'>,
): Buffer {
  if (envKey && envKey.trim()) {
    const key = Buffer.from(envKey, 'base64');
    if (key.length !== 32)
      throw new Error(
        `KMS_MASTER_KEY must decode to exactly 32 bytes (256 bits); got ${key.length}. ` +
          `Generate with: openssl rand -base64 32`,
      );
    return key;
  }

  const file = join(keysDir, 'master.key');
  if (existsSync(file)) {
    const key = Buffer.from(readFileSync(file, 'utf8'), 'base64');
    // Never regenerate over a bad file: a fresh key silently orphans every wrapped signing
    // key and every encrypted DB field, turning a restorable fault into permanent loss.
    if (key.length !== 32)
      throw new Error(
        `Master key file ${file} is corrupt (${key.length} bytes, expected 32). Restore it ` +
          `from backup or set KMS_MASTER_KEY to the key it held; it is never regenerated.`,
      );
    return key;
  }

  const key = randomBytes(32);
  mkdirSync(keysDir, { recursive: true, mode: 0o700 });
  // 'wx' for the same reason: a process that booted first may already be wrapping keys
  // under its file, and overwriting it would orphan them.
  writeFileSync(file, key.toString('base64'), {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  });
  logger.warn(
    `KMS_MASTER_KEY not set — generated a dev master key at ${file}. ` +
      `Every org key and encrypted field wrapped under it is unreadable if this file is ` +
      `lost, so on ephemeral storage (containers without a mounted disk) signing and ` +
      `field decryption break after the next restart.`,
  );
  return key;
}
