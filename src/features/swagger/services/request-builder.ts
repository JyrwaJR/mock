/**
 * Pure request-building helpers for the swagger live proxy. These functions
 * contain the security-sensitive logic — path sanitization, header
 * allowlisting, and API-key injection — and are intentionally dependency-free
 * so they can be unit-tested in isolation.
 */

/** Header used to inject the env-configured API key upstream. */
export const API_KEY_HEADER = "x-api-key";

/** Incoming headers permitted to travel upstream verbatim. */
export const PASSTHROUGH_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "x-api-key",
] as const;

/**
 * Sanitizes raw path segments from the catch-all route into a safe, joined
 * path string. Rejects traversal (`..`, incl. URL-encoded), segments that
 * contain slashes or embedded double-dots, and empty/`.` segments.
 *
 * @param segments - Raw path segments captured by the route.
 * @returns A slash-joined, sanitized path (may be an empty string).
 */
export function sanitizePathSegments(
  segments: string[] | undefined,
): string {
  if (!segments) return "";
  return segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        !segment.includes("/") &&
        !segment.includes(".."),
    )
    .join("/");
}

/**
 * Builds the upstream target URL by appending sanitized path segments to the
 * env-configured base URL, preserving the base's existing pathname prefix and
 * forwarding all incoming query params. Strips any userinfo the base URL may
 * carry so credentials never leave the server as request userinfo.
 *
 * @param baseUrl - Env-configured `SWAGGER_BASE_URL`.
 * @param pathSegments - Raw path segments from the proxy route.
 * @param query - Incoming query params to forward.
 * @returns A fully-resolved target {@link URL}.
 */
export function buildTargetUrl(
  baseUrl: string,
  pathSegments: string[] | undefined,
  query: URLSearchParams,
): URL {
  const base = new URL(baseUrl);
  const path = sanitizePathSegments(pathSegments);
  if (path) {
    base.pathname = `${base.pathname.replace(/\/+$/, "")}/${path}`;
  }
  for (const [key, value] of query.entries()) {
    base.searchParams.append(key, value);
  }
  base.username = "";
  base.password = "";
  return base;
}

/**
 * Builds the upstream header set from the incoming request. Only
 * {@link PASSTHROUGH_HEADERS} are forwarded; cookies, host, and
 * content-length are never sent upstream. When `apiKey` is provided it is
 * injected as `x-api-key`.
 *
 * @param incoming - The incoming request headers.
 * @param apiKey - Optional env-configured API key.
 * @returns A new {@link Headers} instance safe to send upstream.
 */
export function buildProxyHeaders(
  incoming: Headers,
  apiKey: string | undefined,
): Headers {
  const headers = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  if (apiKey) headers.set(API_KEY_HEADER, apiKey);
  return headers;
}

/**
 * Rewrites a swagger-ui request URL so it targets the same-origin proxy
 * route instead of the upstream server. Handles absolute URLs (strips the
 * origin) and relative URLs (prepends the proxy prefix). Intended for the
 * swagger-ui `requestInterceptor` so Try-it-out calls flow through
 * `/api/swagger/proxy/**`, preserving API-key injection and header
 * allowlisting.
 *
 * @param targetUrl - URL swagger-ui resolved from the spec server + path.
 * @param proxyPrefix - Proxy route prefix (defaults to `/api/swagger/proxy`).
 * @returns A same-origin URL routed through the proxy route.
 */
export function rewriteUrlToProxy(
  targetUrl: string,
  proxyPrefix = "/api/swagger/proxy",
): string {
  let pathAndQuery: string;
  try {
    const url = new URL(targetUrl);
    pathAndQuery = url.pathname === "/" ? "" : `${url.pathname}${url.search}`;
  } catch {
    pathAndQuery = targetUrl.split("#")[0];
  }
  if (!pathAndQuery) return proxyPrefix;
  const withLeadingSlash = pathAndQuery.startsWith("/")
    ? pathAndQuery
    : `/${pathAndQuery}`;
  return `${proxyPrefix}${withLeadingSlash}`;
}