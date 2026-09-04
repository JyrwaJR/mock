import { NextResponse } from "next/server";
import {
  getOpenApiSpec,
  SpecUnavailableError,
} from "@/src/features/swagger/services/spec-fetcher";

/** Never statically cache — the spec is dynamic and env-driven. */
export const dynamic = "force-dynamic";

/**
 * Serves the OpenAPI spec fetched from `SWAGGER_API_URL` (TTL-cached
 * server-side) as the raw document, suitable for swagger-ui's `url` prop.
 * Returns a `503` with a user-displayable `error` message on
 * misconfiguration/fetch failure.
 *
 * @example
 *   GET /api/swagger/spec
 *   → 200 { "openapi": "3.0.0", "paths": { ... } }
 */
export async function GET(): Promise<NextResponse> {
  try {
    const spec = await getOpenApiSpec();
    return NextResponse.json(spec);
  } catch (err) {
    const message =
      err instanceof SpecUnavailableError
        ? err.message
        : "Unable to load OpenAPI spec.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}