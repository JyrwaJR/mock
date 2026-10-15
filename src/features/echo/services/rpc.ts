import {
  NotFoundError,
  PayloadTooLargeError,
} from "@/src/shared/errors/http-errors";
import type { EchoRegistry } from "@/src/features/echo/types";
import { writePayload } from "@/src/features/echo/services/payload";
import {
  DEFAULT_ENTRY_KEY,
  deleteEntriesByPrefix,
  getAllEntries,
  getEntry,
} from "@/src/features/echo/services/store";
import {
  MAX_CAPTURE_BYTES,
  RPC_PREFIX,
  byteLength,
  respondWithEntry,
  rpcKey,
} from "@/src/features/echo/services/echo";

/**
 * Returns every RPC mock, keyed by its `/rpc/<method>` registry key.
 *
 * Filters the shared registry rather than keeping a second store, so an entry
 * registered through either selector — `method` or `functionName` — shows up
 * here without any extra bookkeeping. The result is a new object: the live
 * registry is never handed out for mutation by callers.
 *
 * @returns The RPC-only subset of the registry; `{}` when none are registered.
 */
export function rpcEntries(): EchoRegistry {
  const entries: EchoRegistry = {};

  for (const [key, entry] of Object.entries(getAllEntries())) {
    if (key.startsWith(RPC_PREFIX)) {
      entries[key] = entry;
    }
  }

  return entries;
}

/**
 * Invokes an RPC method and echoes the mock registered for it.
 *
 * Resolution mirrors the HTTP lookup exactly: the method name is normalized to
 * its `/rpc/<method>` key, matched against the registry, and falls back to the
 * `*` default entry when no method matches. The response is built by the same
 * {@link respondWithEntry} constructor the HTTP path uses, so both transports
 * return an identical `{ data, message }` envelope at the entry's
 * `status_code ?? 200`.
 *
 * When `write` is true the request body is captured to the payload store under
 * the method's key before the mock is returned, mirroring the `?write=true`
 * behaviour of `/api/echo/[...slug]`. The key is passed explicitly rather than
 * derived from the request path: every RPC call shares the path
 * `/api/echo/rpc`, so deriving it would make all methods overwrite one another.
 * The captured value is the validated body, so a caller's arguments survive
 * intact alongside the normalized `method` field.
 *
 * The capture is bounded by {@link MAX_CAPTURE_BYTES}. The HTTP catch-all's
 * `?write=true` has no such cap; enforcing it here keeps an oversized RPC call
 * from growing the payload file without limit.
 *
 * @param method - RPC method name (either spelling; normalized by `rpcKey`).
 * @param body - The validated request body, captured only when `write` is true.
 * @param write - Whether to capture `body` to the payload store.
 * @returns A JSON response carrying the matched (or fallback) entry's `data`.
 * @throws PayloadTooLargeError when `write` is true and the serialized body
 *   exceeds {@link MAX_CAPTURE_BYTES}.
 * @throws NotFoundError when neither a matching method nor a fallback entry is
 *   registered.
 */
export async function callRpc(
  method: string,
  body?: unknown,
  write = false,
): Promise<Response> {
  const key = rpcKey(method);

  if (write) {
    // Measured in UTF-8 bytes, matching MAX_CAPTURE_BYTES and the registration
    // cap in storeEntryAndEcho. String.length would count UTF-16 code units and
    // undercount multi-byte text.
    if (byteLength(JSON.stringify(body ?? null)) > MAX_CAPTURE_BYTES) {
      throw new PayloadTooLargeError(
        `Payload exceeds ${MAX_CAPTURE_BYTES} bytes`,
      );
    }
    await writePayload(body, key);
  }

  const entry = getEntry(key) ?? getEntry(DEFAULT_ENTRY_KEY);

  if (!entry) {
    throw new NotFoundError(`No mock registered for "${key}"`);
  }

  // Only the key and status are logged — never the body, which carries caller
  // arguments such as credentials.
  console.log("RPC ECHO =>", key, entry.status_code ?? 200);
  return respondWithEntry(entry);
}

/**
 * Lists every registered RPC mock.
 *
 * Returns a `200` JSON record mapping each `/rpc/<method>` key to its
 * `{ data, status_code }` entry. HTTP mocks and the default fallback are
 * omitted, so the listing describes the RPC surface alone.
 *
 * @returns A `200` JSON response with the RPC-only subset of the registry.
 */
export function listRpc(): Response {
  return Response.json(rpcEntries(), { status: 200 });
}

/**
 * Clears every registered RPC mock, leaving HTTP mocks intact.
 *
 * Removes only the keys under {@link RPC_PREFIX}, so `/api/echo/<url>` mocks and
 * the `*` default fallback survive. Counts the entries *before* clearing so the
 * response can report how many were dropped. Clearing when nothing is
 * registered is not an error: it returns `cleared: 0` without writing, making
 * the call idempotent and safe to repeat in setup/teardown scripts.
 *
 * @returns A `200` JSON response shaped `{ cleared: number }`, where `cleared`
 *   is the number of RPC entries that existed immediately before the clear.
 */
export function clearRpc(): Response {
  return Response.json({ cleared: deleteEntriesByPrefix(RPC_PREFIX) }, { status: 200 });
}