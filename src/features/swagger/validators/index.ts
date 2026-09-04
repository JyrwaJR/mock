import { z } from "zod";

/** Producer for a URL validator that rejects embedded credentials (userinfo). */
const urlWithoutCredentials = (label: string) =>
  z
    .string()
    .url(`${label} must be a valid URL`)
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return parsed.username === "" && parsed.password === "";
      } catch {
        return false;
      }
    }, `${label} must not contain credentials`);

/**
 * Zod schema for the swagger feature environment variables.
 *
 * `SWAGGER_API_URL` is required (spec location). `SWAGGER_BASE_URL` is
 * optional at parse time but REQUIRED by the proxy route at call time.
 * `SWAGGER_API_KEY` is optional and injected as `x-api-key` upstream.
 */
export const swaggerEnvSchema = z.object({
  SWAGGER_API_URL: urlWithoutCredentials("SWAGGER_API_URL"),
  SWAGGER_BASE_URL: urlWithoutCredentials("SWAGGER_BASE_URL").optional(),
  SWAGGER_API_KEY: z.string().min(1).optional(),
});

/** Parsed swagger environment values. */
export interface SwaggerEnv {
  SWAGGER_API_URL: string;
  SWAGGER_BASE_URL?: string;
  SWAGGER_API_KEY?: string;
}

/**
 * Parses and validates the swagger env vars from the supplied environment
 * (defaults to `process.env`).
 *
 * @param env - Environment record to validate; defaults to `process.env`.
 * @returns The validated {@link SwaggerEnv}.
 * @throws {Error} When any configured swagger env var is invalid.
 */
export function getSwaggerEnv(
  env: Record<string, string | undefined> = process.env,
): SwaggerEnv {
  const parsed = swaggerEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid swagger configuration: ${issues}`);
  }
  return parsed.data;
}