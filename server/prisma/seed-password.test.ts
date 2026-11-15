import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seedPassword } from './seed-password.js';

// The local-dev default password is published in the README. A production seed must never
// fall back to it: anyone could sign in as the org admin on the public site.

test('local development falls back to the published default', () => {
  assert.equal(seedPassword({}), 'Password123@');
});

test('an explicit SEED_DEMO_PASSWORD always wins', () => {
  assert.equal(
    seedPassword({
      NODE_ENV: 'production',
      SEED_DEMO_PASSWORD: 'x7-Long-Secret',
    }),
    'x7-Long-Secret',
  );
});

test('a production seed without SEED_DEMO_PASSWORD is refused', () => {
  assert.throws(
    () => seedPassword({ NODE_ENV: 'production' }),
    /SEED_DEMO_PASSWORD/,
  );
});
