import {
  NotFoundError,
  PayloadTooLargeError,
} from "@/src/shared/errors/http-errors";
import type { EchoBody } from "@/src/features/echo/validators";
import type { EchoEntry } from "@/src/features/echo/types";
import { DEFAULT_ENTRY_KEY, getAllEntries, getEntry, setEntry } from "./store";

/**
 * Maximum accepted registration size in UTF-8 bytes. Keeps the in-memory
 * registry and the persisted JSON file bounded since the endpoint deliberately
 * accepts "any data".
 */
export const MAX_CAPTURE_BYTES = 1024 * 1024; // 1 MiB

/** Returns the UTF-8 byte length of a string. */
function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Normalizes a URL-like key for registry lookups and storage.
 *
 * Trims surrounding whitespace, ensures a leading `/`, and strips trailing
 * slashes so `"articles/1"`, `"/articles/1/"`, and `"/articles/1"` all map to
 * the same key `/articles/1`. An empty or slash-only input yields `/`.
 *
 * @param input - Raw URL string from the request body or slug segments.
 * @returns The normalized registry key (e.g. `/articles/1`).
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "/";
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

/**
 * Registers a mock entry and echoes the submitted `data` back.
 *
 * When the body carries a `url`, the entry (`data` plus optional
 * `status_code`) is upserted into the persisted registry under the normalized
 * URL — an existing entry for the same URL is overwritten and the JSON file is
 * rewritten. When `url` is omitted, the entry is stored as the **default
 * fallback**: lookups on `/api/echo/*` that match no exact path return this
 * entry's data. The response echoes only the `data` field (the `url` is
 * stripped) at the submitted `status_code`, defaulting to `200` when it is
 * omitted.
 *
 * @param body - Validated request body (`{ url?, data, status_code? }`).
 * @returns A JSON response echoing `body.data` at `body.status_code ?? 200`.
 * @throws PayloadTooLargeError when the serialized body exceeds
 *   {@link MAX_CAPTURE_BYTES}.
 */
export function register(body: EchoBody): Response {
  const serialized = JSON.stringify(body);
  if (byteLength(serialized) > MAX_CAPTURE_BYTES) {
    throw new PayloadTooLargeError(
      `Payload exceeds ${MAX_CAPTURE_BYTES} bytes`,
    );
  }

  const entry: EchoEntry = {
    data: body.data,
    status_code: body.status_code,
  };
  setEntry(
    body.url !== undefined ? normalizeUrl(body.url) : DEFAULT_ENTRY_KEY,
    entry,
  );

  return Response.json(body.data, { status: body.status_code ?? 200 });
}

/**
 * Looks up a mock entry by its request path and returns its `data`.
 *
 * The slug segments (e.g. `["articles", "1"]` for `/api/echo/articles/1`) are
 * joined into a normalized URL and matched exactly against the registry. On a
 * hit the response body is the entry's `data` and the HTTP status is the
 * entry's `status_code` (default `200`). When no exact path match exists, the
 * fallback entry registered without a `url` is returned instead (its own
 * `status_code` applies).
 *
 * @param slug - Catch-all route segments following `/api/echo/`.
 * @returns A JSON response carrying the matched (or fallback) entry's `data`.
 * @throws NotFoundError when neither a matching entry nor a fallback entry is
 *   registered.
 */
export function lookup(slug: string[]): Response {
  const url = normalizeUrl(`/${slug.join("/")}`);
  const entry = getEntry(url) ?? getEntry(DEFAULT_ENTRY_KEY);
  if (!entry) {
    throw new NotFoundError(`No mock registered for "${url}"`);
  }
  const statusCode = entry.status_code ?? 200;
  console.log({
    url,
    status_code: statusCode,
  });

  return Response.json(entry.data, { status: statusCode });
}

/**
 * Lists every registered mock entry as a `url -> { data, status_code }`
 * record. Includes entries persisted by previous server sessions.
 *
 * @returns A `200` JSON response mapping each normalized URL to its entry.
 */
export function list(): Response {
  return Response.json(getAllEntries(), { status: 200 });
}
