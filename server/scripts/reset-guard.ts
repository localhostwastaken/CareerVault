// First step of demo:reset and demo:reset-prod, before anything destructive runs. It names
// the database about to be wiped (host only, never credentials) and refuses unless that is
// what the operator meant: local mode only touches localhost, and production mode needs
// CONFIRM_RESET_HOST set to the exact host printed here.
//   npx tsx scripts/reset-guard.ts --mode=local|production
import { pathToFileURL } from 'node:url';

export type ResetMode = 'local' | 'production';
export type GuardResult =
  | { ok: true; host: string }
  | { ok: false; reason: string };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function checkResetTarget(
  databaseUrl: string | undefined,
  mode: ResetMode,
  confirmHost: string | undefined,
): GuardResult {
  if (!databaseUrl)
    return { ok: false, reason: 'No DIRECT_URL or DATABASE_URL is set.' };
  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return { ok: false, reason: 'The database URL could not be parsed.' };
  }
  const isLocal = LOCAL_HOSTS.has(host);
  if (mode === 'local') {
    return isLocal
      ? { ok: true, host }
      : {
          ok: false,
          reason: `Local reset refused: the database is on ${host}, not localhost.`,
        };
  }
  if (isLocal)
    return {
      ok: false,
      reason:
        'Production reset refused: the database is on localhost. Is the right env file loaded?',
    };
  if (confirmHost !== host) {
    return {
      ok: false,
      reason: `Production reset refused. This would permanently wipe the database on ${host}. To proceed, re-run with CONFIRM_RESET_HOST=${host}`,
    };
  }
  return { ok: true, host };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await import('dotenv/config');
  const mode: ResetMode = process.argv.includes('--mode=production')
    ? 'production'
    : 'local';
  const result = checkResetTarget(
    process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    mode,
    process.env.CONFIRM_RESET_HOST,
  );
  if (!result.ok) {
    console.error(result.reason);
    process.exit(1);
  }
  console.log(`Resetting the ${mode} database on ${result.host}.`);
}
