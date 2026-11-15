import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkResetTarget } from './reset-guard.js';

// demo:reset and demo:reset-prod destroy a database. The guard runs first and must refuse
// any target the operator did not name explicitly.

const LOCAL = 'postgresql://postgres:pw@localhost:5432/careervault';
const REMOTE =
  'postgresql://postgres.ref:pw@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';

test('local mode accepts a localhost database', () => {
  assert.deepEqual(checkResetTarget(LOCAL, 'local', undefined), {
    ok: true,
    host: 'localhost',
  });
});

test('local mode refuses a remote database (a production env file loaded by mistake)', () => {
  const result = checkResetTarget(REMOTE, 'local', undefined);
  assert.equal(result.ok, false);
});

test('production mode refuses until the operator confirms the exact host', () => {
  const result = checkResetTarget(REMOTE, 'production', undefined);
  assert.equal(result.ok, false);
  assert.match(
    result.ok ? '' : result.reason,
    /CONFIRM_RESET_HOST=aws-1-ap-northeast-1\.pooler\.supabase\.com/,
  );
});

test('production mode refuses a confirmation for a different host', () => {
  assert.equal(checkResetTarget(REMOTE, 'production', 'localhost').ok, false);
});

test('production mode accepts the confirmed host', () => {
  const host = 'aws-1-ap-northeast-1.pooler.supabase.com';
  assert.deepEqual(checkResetTarget(REMOTE, 'production', host), {
    ok: true,
    host,
  });
});

test('production mode refuses a localhost database (the wrong env file)', () => {
  assert.equal(checkResetTarget(LOCAL, 'production', 'localhost').ok, false);
});

test('a missing database URL is refused, and the error never contains the password', () => {
  const missing = checkResetTarget(undefined, 'local', undefined);
  assert.equal(missing.ok, false);
  const remote = checkResetTarget(REMOTE, 'production', undefined);
  assert.doesNotMatch(remote.ok ? '' : remote.reason, /pw/);
});
