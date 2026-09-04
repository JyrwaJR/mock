import { swaggerEnvSchema } from "../validators";
import type { OpenApiSpec } from "../types";

/** How long a fetched spec is reused before a refresh (milliseconds). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Upstream spec fetch hard timeout (milliseconds). */
const SPEC_FETCH_TIMEOUT_MS = 15 * 1000;

interface SpecCacheEntry {
  spec: OpenApiSpec;
  fetchedAt: number;
}

let cache: SpecCacheEntry | null = null;

/**
 * Error thrown when the OpenAPI spec cannot be loaded (missing env, fetch
 * failure, or malformed document). Carries a user-displayable message.
 */
export class SpecUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpecUnavailableError";
  }
}

/**
 * Fetches (and TTL-caches) the OpenAPI spec from `SWAGGER_API_URL`.
 *
 * Server-only. Throws {@link SpecUnavailableError} when the env var is
 * missing/invalid, the fetch fails, or the document has no `paths` object.
 *
 * @returns The validated {@link OpenApiSpec} document.
 * @throws {SpecUnavailableError} On any load failure.
 */
export async function getOpenApiSpec(): Promise<OpenApiSpec> {
  const parsed = swaggerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const apiUrlIssue = parsed.error.issues.find(
      (issue) => issue.path.join(".") === "SWAGGER_API_URL",
    );
    if (apiUrlIssue?.code === "invalid_type") {
      throw new SpecUnavailableError(
        "SWAGGER_API_URL is not configured. Add SWAGGER_API_URL to your .env file.",
      );
    }
    const reasons = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
      .join("; ");
    throw new SpecUnavailableError(`Invalid SWAGGER_API_URL: ${reasons}`);
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.spec;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SPEC_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(parsed.data.SWAGGER_API_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new SpecUnavailableError(
        `Spec fetch failed: ${response.status} ${response.statusText}`,
      );
    }
    const spec = (await response.json()) as OpenApiSpec;
    if (!spec || typeof spec !== "object" || !spec.paths) {
      throw new SpecUnavailableError(
        "Fetched document is not a valid OpenAPI spec (missing paths).",
      );
    }
    cache = { spec, fetchedAt: Date.now() };
    return spec;
  } catch (err) {
    if (err instanceof SpecUnavailableError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new SpecUnavailableError("Spec fetch timed out.");
    }
    throw new SpecUnavailableError(
      `Unable to fetch OpenAPI spec: ${(err as Error).message}`,
    );
  } finally {
    clearTimeout(timer);
  }
}