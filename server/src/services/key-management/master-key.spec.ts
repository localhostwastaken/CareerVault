import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadMasterKey } from './master-key.js';

// The master key wraps every org signing key and derives the field-encryption KEK (R10),
// so a wrong key strands data rather than merely failing a request. The load-bearing
// guarantee is that a key already on disk is never replaced.
describe('loadMasterKey', () => {
  let dir: string;
  let warnings: string[];
  const logger = {
    warn: (message: string) => {
      warnings.push(message);
    },
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cv-master-key-'));
    warnings = [];
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('returns the KMS_MASTER_KEY bytes without touching the key store', () => {
    const key = randomBytes(32);

    expect(loadMasterKey(key.toString('base64'), dir, logger)).toEqual(key);
    expect(existsSync(join(dir, 'master.key'))).toBe(false);
  });

  it('rejects a KMS_MASTER_KEY that does not decode to 32 bytes', () => {
    expect(() =>
      loadMasterKey(randomBytes(16).toString('base64'), dir, logger),
    ).toThrow(/exactly 32 bytes.*openssl rand -base64 32/);
  });

  it('refuses a corrupt key file and leaves its bytes untouched', () => {
    const file = join(dir, 'master.key');
    writeFileSync(file, randomBytes(16).toString('base64'));
    const before = readFileSync(file);

    expect(() => loadMasterKey(undefined, dir, logger)).toThrow(/corrupt/);
    expect(readFileSync(file)).toEqual(before);
  });

  it('creates an owner-only 32-byte key when none exists and reads it back on the next boot', () => {
    const keysDir = join(dir, 'kms');
    const file = join(keysDir, 'master.key');

    const key = loadMasterKey(undefined, keysDir, logger);

    expect(key).toHaveLength(32);
    expect(Buffer.from(readFileSync(file, 'utf8'), 'base64')).toEqual(key);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(keysDir).mode & 0o777).toBe(0o700);
    expect(warnings).toHaveLength(1);
    expect(loadMasterKey(undefined, keysDir, logger)).toEqual(key);
  });
});
