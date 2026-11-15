// The password every seeded account gets. The local-dev default is published in the README,
// so a production seed must bring its own non-public SEED_DEMO_PASSWORD or stop.
export const LOCAL_DEFAULT_PASSWORD = 'Password123@';

export function seedPassword(env: NodeJS.ProcessEnv): string {
  if (env.SEED_DEMO_PASSWORD) return env.SEED_DEMO_PASSWORD;
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to seed production with the published default password: set SEED_DEMO_PASSWORD.',
    );
  }
  return LOCAL_DEFAULT_PASSWORD;
}
