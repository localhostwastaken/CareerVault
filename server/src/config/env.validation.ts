import Joi from 'joi';

// Validated at startup (fail-fast). Secrets are optional in dev — adapters/auth
// provision local dev keys when absent. DATABASE_URL is the only hard requirement.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(9900),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  WORKER: Joi.boolean().truthy('true').falsy('false').default(false),

  DATABASE_URL: Joi.string().required(),

  JWT_PRIVATE_KEY: Joi.string().allow('').optional(),
  JWT_PUBLIC_KEY: Joi.string().allow('').optional(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  KMS_MASTER_KEY: Joi.string().allow('').optional().custom((value) => {
    if (value && value.trim()) {
      const buf = Buffer.from(value.trim(), 'base64');
      if (buf.length !== 32)
        throw new Error(
          `KMS_MASTER_KEY must be a base64-encoded 32-byte key (256 bits). ` +
          `Got ${buf.length} bytes. Generate with: openssl rand -base64 32`,
        );
    }
    return value;
  }),

  KEY_MANAGEMENT_DRIVER: Joi.string().valid('local', 'aws').default('local'),
  BLOCKCHAIN_DRIVER: Joi.string().valid('local', 'amoy').default('local'),
  PAYMENT_DRIVER: Joi.string().valid('mock', 'stripe').default('mock'),
  EMAIL_DRIVER: Joi.string().valid('console', 'gmail', 'ses').default('console'),
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
}).unknown(true);
