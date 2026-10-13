import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  PORT: z.coerce.number().default(3000),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  // If running in test mode without DATABASE_URL, supply safe mock test env
  if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) {
    return envSchema.parse({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://root:password@localhost:3306/resto_test',
      JWT_SECRET: 'test_jwt_secret_with_more_than_32_characters_long!',
    });
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('[Config Error] Invalid environment variables configuration:');
    for (const issue of result.error.issues) {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    }
    // In test environment, fallback or throw clear error
    if (process.env.NODE_ENV === 'test') {
      return envSchema.parse({
        NODE_ENV: 'test',
        DATABASE_URL: 'mysql://root:password@localhost:3306/resto_test',
        JWT_SECRET: 'test_jwt_secret_with_more_than_32_characters_long!',
      });
    }
    throw new Error('Environment configuration validation failed');
  }

  return result.data;
}

export const env: Env = parseEnv();
