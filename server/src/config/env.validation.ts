import Joi from 'joi';

// Boot-time honesty check: the trust model depends on REAL DNS TXT verification,
// and real revenue/comms depend on real payment/email providers. Drivers stay
// configurable (a demo may intentionally run mocks), so this NEVER hard-fails —
// but in production it emits a LOUD, un-missable warning so a mocked deploy is
// always a deliberate choice, never a silent accident. Runs during Joi
// validation, i.e. at process boot alongside the fail-fast env check below.
function warnUnsafeProductionDrivers(env: Record<string, unknown>): void {
  if (env.NODE_ENV !== 'production') return;

  const dns = (env.DNS_DRIVER as string | undefined) ?? 'local';
  const payment = (env.PAYMENT_DRIVER as string | undefined) ?? 'mock';
  const email = (env.EMAIL_DRIVER as string | undefined) ?? 'console';

  const mocked: string[] = [];
  if (dns !== 'real')
    mocked.push(
      'DNS_DRIVER=local — domain verification is BYPASSED: ANY domain ' +
        '"verifies", so documents can be signed as anyone (google.com, etc.). ' +
        'Set DNS_DRIVER=real for genuine TXT-record checks.',
    );
  if (payment === 'mock')
    mocked.push(
      'PAYMENT_DRIVER=mock — paid features are granted for free (no real ' +
        'charges). Set PAYMENT_DRIVER=stripe for real billing.',
    );
  if (email === 'console')
    mocked.push(
      'EMAIL_DRIVER=console — magic-link tokens are printed to stdout instead ' +
        'of emailed (anyone reading logs can log in). Set EMAIL_DRIVER=gmail — ' +
        'the "ses" value is accepted by this schema but its adapter is not written yet.',
    );
  if (env.DEMO_MASTER_PASSWORD_ENABLED === true)
    mocked.push(
      'DEMO_MASTER_PASSWORD_ENABLED=true — ANY active account can be logged into with the ' +
        "demo master password, bypassing that user's real password entirely. Set it to " +
        'false (the default) for a real deploy.',
    );
  // Not a mock, but the same class of silent trap: with the local driver the org signing
  // keys are FILES. If STORAGE_LOCAL_DIR is not a mounted volume they vanish on every
  // deploy while the database keeps pointing at them, and signing breaks org-wide.
  if (
    ((env.KEY_MANAGEMENT_DRIVER as string | undefined) ?? 'local') === 'local'
  )
    mocked.push(
      'KEY_MANAGEMENT_DRIVER=local — org signing keys are files under ' +
        `STORAGE_LOCAL_DIR (${(env.STORAGE_LOCAL_DIR as string | undefined) ?? './storage'}). ` +
        'That path MUST be durable storage; on an ephemeral container every key is lost on ' +
        'redeploy and no document can be signed.',
    );
  if (mocked.length === 0) return;

  const banner = '='.repeat(74);
  console.warn(`\n${banner}`);
  console.warn('  !!  PRODUCTION IS RUNNING WITH MOCKED INTEGRATIONS  !!');
  console.warn(banner);
  for (const line of mocked) console.warn(`  * ${line}`);
  console.warn(`${banner}\n`);
}

// Validated at startup (fail-fast). Secrets are optional in dev — adapters/auth
// provision local dev keys when absent. DATABASE_URL is the only hard requirement.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(9900),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  WORKER: Joi.boolean().truthy('true').falsy('false').default(false),

  // Demo / investor walkthrough convenience: gates the master password in AuthService.
  // Defaults off; when true in production, warnUnsafeProductionDrivers below shouts about it
  // at boot rather than letting it be an accidental, undocumented backdoor.
  DEMO_MASTER_PASSWORD_ENABLED: Joi.boolean().default(false),

  DATABASE_URL: Joi.string().required(),

  JWT_PRIVATE_KEY: Joi.string().allow('').optional(),
  JWT_PUBLIC_KEY: Joi.string().allow('').optional(),
  JWT_ACCESS_TTL: Joi.string().default('1d'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  // Required in production, optional elsewhere. LocalKmsService wraps every org signing key
  // with this; when it is unset it mints a random one per process, so on a container without
  // durable storage each deploy silently orphans every key it wrote — which is precisely how
  // manager signing started failing with an unexplained 500. Failing to boot is the honest
  // outcome: an unsigned deploy is worse than no deploy. It is no longer only signing keys at
  // stake either (R10): this same master key derives the field-encryption KEK, so losing it
  // also makes every encrypted DB column and every stored PDF permanently unreadable. Back it
  // up offline.
  KMS_MASTER_KEY: Joi.string()
    .custom((value: string) => {
      if (value && value.trim()) {
        const buf = Buffer.from(value.trim(), 'base64');
        if (buf.length !== 32)
          throw new Error(
            `KMS_MASTER_KEY must be a base64-encoded 32-byte key (256 bits). ` +
              `Got ${buf.length} bytes. Generate with: openssl rand -base64 32`,
          );
      }
      return value;
    })
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string()
        .required()
        .messages({
          'any.required':
            'KMS_MASTER_KEY is required in production — without it every org signing key, ' +
            'every R10-encrypted database field and every stored PDF becomes unreadable ' +
            'after a restart. Generate with: openssl rand -base64 32',
          'string.empty':
            'KMS_MASTER_KEY must not be empty in production. Generate with: openssl rand -base64 32',
        }),
      otherwise: Joi.string().allow('').optional(),
    }),

  KEY_MANAGEMENT_DRIVER: Joi.string().valid('local', 'aws').default('local'),
  BLOCKCHAIN_DRIVER: Joi.string().valid('local', 'amoy').default('local'),
  PAYMENT_DRIVER: Joi.string().valid('mock', 'stripe').default('mock'),
  EMAIL_DRIVER: Joi.string()
    .valid('console', 'gmail', 'ses')
    .default('console'),
  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  DNS_DRIVER: Joi.string().valid('local', 'real').default('local'),

  REDIS_URL: Joi.string().allow('').optional(),
  AI_SERVICE_URL: Joi.string().default('http://localhost:9910'),
  AI_SERVICE_SECRET: Joi.string().allow('').optional(),

  POLYGON_RPC_URL: Joi.string().allow('').optional(),
  ANCHOR_REGISTRY_ADDRESS: Joi.string().allow('').optional(),
  ANCHOR_PRIVATE_KEY: Joi.string().allow('').optional(),
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  STORAGE_LOCAL_DIR: Joi.string().default('./storage'),
})
  .unknown(true)
  // Runs after keys are validated + defaults applied; returns the value
  // unchanged (warn-only, never a validation error).
  .custom((value: Record<string, unknown>) => {
    warnUnsafeProductionDrivers(value);
    return value;
  });
