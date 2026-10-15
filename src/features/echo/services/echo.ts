import {
  NotFoundError,
  PayloadTooLargeError,
} from "@/src/shared/errors/http-errors";
import { readMethodName, type EchoBody } from "@/src/features/echo/validators";
import type { EchoEntry } from "@/src/features/echo/types";
import {
  DEFAULT_ENTRY_KEY,
  getAllEntries,
  getEntry,
  resetStore,
  setEntry,
} from "./store";

/**
 * Maximum accepted registration size in UTF-8 bytes. Keeps the in-memory
 * registry and the persisted JSON file bounded since the endpoint deliberately
 * accepts "any data".
 */
export const MAX_CAPTURE_BYTES = 1024 * 1024; // 1 MiB

/**
 * Returns the UTF-8 byte length of a string.
 *
 * Shared so every size check against {@link MAX_CAPTURE_BYTES} measures the
 * same unit. JavaScript's `String.length` counts UTF-16 code units, which
 * undercounts multi-byte characters — using it here would let a body of
 * non-ASCII text pass a limit stated in bytes.
 *
 * @param value - The serialized string to measure.
 * @returns The number of bytes the string occupies when UTF-8 encoded.
 */
export function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Namespace prefix reserved for RPC method mocks inside the shared registry.
 *
 * Every RPC mock is stored under a key beginning with this prefix, which is
 * what lets `GET`/`DELETE /api/echo/rpc` act on RPC mocks alone while leaving
 * HTTP mocks untouched. The prefix cannot collide with a real HTTP key, since
 * {@link normalizeUrl} guarantees every URL-derived key starts with `/` and
 * `rpc` is not a path a client would register for.
 */
export const RPC_PREFIX = "/rpc/";

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
 * Normalizes an RPC method name into its registry key.
 *
 * Trims surrounding whitespace and strips surrounding slashes, then joins the
 * result under the {@link RPC_PREFIX} namespace. Case is preserved: method
 * names are case-sensitive, so `Employee_Login` and `employee_login` are two
 * distinct methods. Passing a method name that already carries the prefix is
 * idempotent — `/rpc/login` and `login` both resolve to `/rpc/login`.
 *
 * @param method - RPC method name from `method` or `functionName`.
 * @returns The normalized registry key (e.g. `/rpc/employee_login`).
 */
export function rpcKey(method: string): string {
  return normalizeUrl(
    `${RPC_PREFIX}${method.trim().replace(/^\/+|\/+$/g, "")}`,
  );
}

/**
 * Stores an entry under an explicit registry key and echoes its `data` back.
 *
 * The shared write half of mock registration: it enforces the size cap, upserts
 * the entry, and renders the echo response. Both selectors of `POST /api/echo`
 * funnel through here — {@link register} picks the key from `url`, while
 * `./rpc` picks it from the method name — so an RPC mock is bounded and
 * persisted by exactly the same rules as an HTTP mock.
 *
 * The entry is upserted: an existing entry for the same key is overwritten and
 * the JSON file is rewritten, so the change survives a restart.
 *
 * @param key - Normalized registry key (e.g. `/articles/1`, `/rpc/login`).
 * @param body - Validated body carrying `data` and optional `status_code`.
 * @returns A JSON response echoing `body.data` at `body.status_code ?? 200`.
 * @throws PayloadTooLargeError when the serialized body exceeds
 *   {@link MAX_CAPTURE_BYTES}.
 */
export function storeEntryAndEcho(key: string, body: EchoBody): Response {
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
  setEntry(key, entry);

  return Response.json(body.data, { status: body.status_code ?? 200 });
}

/**
 * Registers a mock entry and echoes the submitted `data` back.
 *
 * The registry key is selected from the body: an HTTP `url` is normalized
 * (leading `/`, no trailing `/`) into its key, while an RPC `method` (or its
 * `functionName` alias) is normalized into the `/rpc/<method>` key by the RPC
 * service. When neither selector is present the entry is stored as the
 * **default fallback**: lookups on `/api/echo/*` that match no exact path
 * return this entry's data. The response echoes only the `data` field (the
 * selector is stripped) at the submitted `status_code`, defaulting to `200`
 * when it is omitted.
 *
 * @param body - Validated request body (`{ url? | method?, data, status_code? }`).
 * @returns A JSON response echoing `body.data` at `body.status_code ?? 200`.
 * @throws PayloadTooLargeError when the serialized body exceeds
 *   {@link MAX_CAPTURE_BYTES}.
 */
export function register(body: EchoBody): Response {
  const method = readMethodName(body);
  const key =
    method !== undefined
      ? rpcKey(method)
      : body.url !== undefined
        ? normalizeUrl(body.url)
        : DEFAULT_ENTRY_KEY;

  return storeEntryAndEcho(key, body);
}

/**
 * Renders a matched registry entry as the mock response.
 *
 * The single place the echo envelope is built, shared by the HTTP lookup in
 * {@link lookup} and the RPC lookup in `./rpc`. Keeping one constructor is what
 * makes the two transports echo identically by construction rather than by
 * convention: same `{ data, message }` shape, same `status_code ?? 200`
 * default, same `Success`/`Error` rule.
 *
 * @param entry - The matched registry entry.
 * @returns A JSON response carrying `entry.data` at `entry.status_code ?? 200`.
 */
export function respondWithEntry(entry: EchoEntry): Response {
  const statusCode = entry.status_code ?? 200;

  const data = entry.data;
  return Response.json(data, { status: statusCode });
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

  console.log("ECHO =>", url, entry.status_code ?? 200);
  return respondWithEntry(entry);
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

/**
 * Clears the whole registry: every registered mock — including the default
 * fallback entry — is removed, and the persisted JSON file is deleted.
 *
 * Counts the entries *before* clearing so the response can report how many were
 * dropped. Clearing an already empty registry is not an error: it returns
 * `200` with `cleared: 0`, making the call idempotent and safe to repeat in
 * setup/teardown scripts.
 *
 * @returns A `200` JSON response shaped `{ cleared: number }`, where `cleared`
 *   is the number of entries that existed immediately before the clear.
 */
export function clear(): Response {
  const cleared = Object.keys(getAllEntries()).length;
  resetStore();
  return Response.json({ cleared }, { status: 200 });
}
