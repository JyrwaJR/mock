import { NextRequest, NextResponse } from "next/server";
import { getSwaggerEnv } from "@/src/features/swagger/validators";
import {
  buildProxyHeaders,
  buildTargetUrl,
} from "@/src/features/swagger/services/request-builder";
import { callTarget } from "@/src/features/swagger/services/proxy-caller";

/** Never statically prerender the proxy — it forwards every request. */
export const dynamic = "force-dynamic";

/** HTTP methods forwarded upstream with a request body. */
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Proxies a request to the env-configured `SWAGGER_BASE_URL` upstream.
 *
 * The incoming path (after `/api/swagger/proxy/`) is sanitized and appended
 * to the base URL; query params are forwarded; only allowlisted headers pass
 * through; `SWAGGER_API_KEY` (if set) is injected as `x-api-key`. The
 * response is a JSON envelope `{ status, headers, body }` whose HTTP status
 * mirrors the upstream status. Returns 503 when env is missing/malformed and
 * 502 when the upstream cannot be reached.
 *
 * @param request - The incoming proxied request.
 * @param context - Route context carrying the catch-all path segments.
 * @returns The envelope JSON response.
 */
async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;

  let env;
  try {
    env = getSwaggerEnv();
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 503 },
    );
  }
  if (!env.SWAGGER_BASE_URL) {
    return NextResponse.json(
      {
        error:
          "SWAGGER_BASE_URL is not configured. Add SWAGGER_BASE_URL to your .env file.",
      },
      { status: 503 },
    );
  }

  const target = buildTargetUrl(
    env.SWAGGER_BASE_URL,
    path,
    request.nextUrl.searchParams,
  );
  const headers = buildProxyHeaders(request.headers, env.SWAGGER_API_KEY);
  const body = BODY_METHODS.has(request.method)
    ? await request.text()
    : null;

  try {
    const result = await callTarget(request.method, target, headers, body);
    return NextResponse.json(result, { status: result.status });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 },
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;