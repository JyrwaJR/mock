import { NextResponse } from "next/server";
import {
  getOpenApiSpec,
  SpecUnavailableError,
} from "@/src/features/swagger/services/spec-fetcher";

/** Never statically prerender the spec — it reflects runtime env. */
export const dynamic = "force-dynamic";

/**
 * GET /api/swagger/spec — returns the OpenAPI document targeted by
 * `SWAGGER_API_URL`.
 *
 * Requires `SWAGGER_API_URL` to be configured and reachable; responds 503
 * with a displayable error message when the spec cannot be loaded.
 *
 * @returns JSON spec document (200) or error JSON (503).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const spec = await getOpenApiSpec();
    return NextResponse.json(spec);
  } catch (err) {
    if (err instanceof SpecUnavailableError) {
      return NextResponse.json(
        { error: err.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to load OpenAPI spec." },
      { status: 503 },
    );
  }
}