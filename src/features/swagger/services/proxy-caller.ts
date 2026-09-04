/** Upstream proxied request hard timeout (milliseconds). */
const UPSTREAM_TIMEOUT_MS = 30 * 1000;

/** Normalized upstream result returned to the caller. */
export interface ProxyResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  contentType: string | null;
}

/**
 * Executes a single upstream proxy request using the global `fetch`.
 *
 * Buffers the response body, parses JSON bodies when the content-type
 * indicates JSON, and returns status/headers/body. Throws on network errors
 * and 30-second timeouts (upstream HTTP error statuses are NOT thrown — they
 * are returned as-is so the proxy can forward them).
 *
 * @param method - HTTP method to use (e.g. `GET`, `POST`).
 * @param url - Fully-resolved target {@link URL}.
 * @param headers - Pre-built upstream headers.
 * @param body - Optional request body text; `null` sends no body.
 * @returns The normalized {@link ProxyResult}.
 * @throws {Error} On network failure or timeout.
 */
export async function callTarget(
  method: string,
  url: URL,
  headers: Headers,
  body: string | null,
): Promise<ProxyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      cache: "no-store",
    };
    if (body !== null) {
      init.body = body;
    }
    const response = await fetch(url, init);

    const bodyText = await response.text();
    const contentType = response.headers.get("content-type");
    let parsed: unknown = bodyText;
    if (contentType?.includes("application/json")) {
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = bodyText;
      }
    }
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    return {
      status: response.status,
      headers: headersObj,
      body: parsed,
      contentType,
    };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Upstream request timed out.");
    }
    throw new Error(`Upstream request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}