import { NextRequest, NextResponse } from "next/server";
import { getSwaggerEnv } from "@/src/features/swagger/validators";
import {
  buildProxyHeaders,
  buildTargetUrl,
} from "@/src/features/swagger/services/request-builder";
import { callTarget } from "@/src/features/swagger/services/proxy-caller";

/** Never statically cache any proxied response. */
export const dynamic = "force-dynamic";

/** Methods with a forwardable request body. */
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface ProxyRouteContext {
  params: Promise<{ path?: string[] }>;
}

/**
 * Shared handler for every supported HTTP method. Builds the upstream URL
 * from `SWAGGER_BASE_URL` + sanitized path segments + forwarded query params,
 * injects the optional `x-api-key`, forwards allowlisted headers and body,
 * and returns an envelope `{ status, headers, body }` mirroring the upstream
 * response. Upstream HTTP error statuses are forwarded unchanged.
 *
 * @param request - The incoming proxied request.
 * @param context - Route context carrying the catch-all path segments.
 * @returns The envelope JSON response.
 */
async function handleProxy(
  request: NextRequest,
  context: ProxyRouteContext,
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
          "SWAGGER_BASE_URL is not configured. Add it to your .env file.",
      },
      { status: 503 },
    );
  }

  try {
    const url = buildTargetUrl(
      env.SWAGGER_BASE_URL,
      path,
      request.nextUrl.searchParams,
    );
    const headers = buildProxyHeaders(request.headers, env.SWAGGER_API_KEY);

    let body: string | null = null;
    if (METHODS_WITH_BODY.has(request.method)) {
      body = await request.text();
      if (body.length > 0 && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }

    const result = await callTarget(request.method, url, headers, body);
    return NextResponse.json(
      { status: result.status, headers: result.headers, body: result.body },
      {
        status:
          result.status >= 200 && result.status < 600 ? result.status : 502,
      },
    );
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