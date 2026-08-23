import { z } from 'zod';

export function createEnvSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

export function validateEnv<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): z.infer<z.ZodObject<T>> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Environment validation failed: ${missing}`);
  }
  return result.data;
}

export const nextAuthEnvSchema = createEnvSchema({
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

export const expressEnvSchema = createEnvSchema({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const sharedEnvSchema = createEnvSchema({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_BASE_URL: z.string().url('API_BASE_URL must be a valid URL').optional(),
});
