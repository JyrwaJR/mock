import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PayloadRegistry } from "@/src/features/echo/types";

/**
 * Route prefix stripped from captured payload keys so a request path and the
 * bare slug a client registered produce the same key.
 */
const ECHO_PREFIX = "/api/echo";

/** File name of the JSON document that persists captured payloads. */
const PAYLOAD_FILE = "payload.json";

/**
 * Normalizes a captured request path into a payload registry key.
 *
 * Mirrors `normalizeUrl()` in `./echo` so that this service and the mock
 * registry agree on the key for the same request:
 * `/api/echo/facial_registration` and `/facial_registration` both resolve to
 * `/facial_registration`. Strips the `/api/echo` route prefix, ensures a
 * leading `/`, and strips trailing slashes so `"/facial_registration"` and
 * `"/facial_registration/"` are one key. An empty or slash-only input
 * yields `/`.
 *
 * @param url - Raw request path or registered slug.
 * @returns The normalized payload key (e.g. `/facial_registration`).
 */
export function normalizePayloadKey(url: string): string {
  const trimmed = url.trim();
  const withoutPrefix = trimmed.startsWith(ECHO_PREFIX)
    ? trimmed.slice(ECHO_PREFIX.length)
    : trimmed;

  if (!withoutPrefix) {
    return "/";
  }
  const withSlash = withoutPrefix.startsWith("/")
    ? withoutPrefix
    : `/${withoutPrefix}`;

  return withSlash.replace(/\/+$/, "") || "/";
}

/**
 * Resolves the JSON file that persists captured payloads.
 *
 * Honors `PAYLOAD_DATA_DIR` first, then `ECHO_REGISTRY_FILE`, and otherwise
 * defaults to `data/echo/payload.json` under the current working directory.
 * Resolved lazily on each call — never cached at module scope — so callers
 * (e.g. tests or a fresh server session) can repoint it via the environment
 * after this module has already been imported.
 *
 * @returns The absolute path of the payload JSON file.
 */
export function payloadFilePath(): string {
  const dataDir = process.env.PAYLOAD_DATA_DIR;
  if (dataDir) {
    // The path is env-overridable, so Turbopack's trace analysis cannot
    // statically scope it; the default below is already scoped to the project
    // `data/` dir, so opt out of whole-project tracing here.
    return path.join(dataDir, PAYLOAD_FILE);
  }

  const registryDir = process.env.ECHO_REGISTRY_FILE;
  if (registryDir) {
    // The path is env-overridable, so Turbopack's trace analysis cannot
    // statically scope it; the default below is already scoped to the project
    // `data/` dir, so opt out of whole-project tracing here.
    return path.join(registryDir, PAYLOAD_FILE);
  }

  // Statically scoped under the project `data/` dir so Turbopack's trace
  // analysis does not pull the whole project into the server bundle.
  return path.join(process.cwd(), "data", "echo", PAYLOAD_FILE);
}

/**
 * Reads and parses the persisted payload file.
 *
 * A missing file yields an empty registry; a corrupt file logs a warning and
 * also yields an empty registry so a bad file never crashes the API. Never
 * throws.
 *
 * @param filePath - Absolute path of the payload JSON file to read.
 * @returns The parsed registry, or `{}` when absent or unparseable.
 */
async function loadFromFile(filePath: string): Promise<PayloadRegistry> {
  let raw: string;
  try {
    // The path may be overridden via PAYLOAD_DATA_DIR or ECHO_REGISTRY_FILE, so
    // Turbopack's trace analysis cannot statically scope it; the default is
    // already scoped to the project `data/` dir, so opt out of whole-project
    // tracing here.
    raw = await readFile(/*turbopackIgnore: true*/ filePath, "utf8");
  } catch {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as PayloadRegistry;
    }
  } catch {
    console.warn(`[echo] Ignoring corrupt payload file at ${filePath}`);
  }

  return {};
}

/**
 * Tail of the in-process write queue.
 *
 * `writePayload` is a read-modify-write cycle: it loads the whole registry,
 * merges one key, and writes the result back. Run concurrently, each call
 * would load a snapshot taken before its neighbours wrote and then persist
 * only its own key, so captures aimed at *different* paths would silently
 * discard one another. Chaining the cycles through this promise makes each one
 * observe the previous one's result.
 *
 * Scoped to the process on purpose — a mock server is a single Node process,
 * and a cross-process lock would buy nothing here.
 */
let writeChain: Promise<void> = Promise.resolve();

/**
 * Runs `task` after every write already queued, and queues it for the ones
 * that follow.
 *
 * A rejected task must not stall the queue, so the chain is advanced past the
 * failure while the caller still receives the original rejection.
 */
function enqueueWrite(task: () => Promise<void>): Promise<void> {
  const result = writeChain.then(task);
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/**
 * Atomically writes the whole payload registry to the JSON file.
 *
 * Writes to a sibling temp file first, then renames it over the target so a
 * crash mid-write can never leave a truncated file behind. Creates parent
 * directories as needed.
 *
 * The temp name carries a random suffix rather than a fixed `.tmp`: two
 * captures dispatched concurrently would otherwise share one temp path, and
 * the loser's `rename` would fail with `ENOENT` while the two interleaved
 * writes could produce a file that no longer parses — which reads back as an
 * empty store, silently discarding every capture. A unique name per write
 * makes concurrent writes independent, leaving a benign last-writer-wins.
 *
 * @param filePath - Absolute path of the payload JSON file to write.
 * @param registry - The full registry to serialize.
 */
async function persist(
  filePath: string,
  registry: PayloadRegistry,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmpPath, JSON.stringify(registry, null, 2), "utf8");
    await rename(tmpPath, filePath);
  } catch (error) {
    // The rename is atomic, so a failure here leaves the live store intact.
    // Drop the orphan so repeated failures cannot accumulate temp files.
    await rm(tmpPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

/**
 * Upserts a captured payload under its normalized key and persists the store.
 *
 * Reads the existing registry, merges this value in, and rewrites the file, so
 * a repeat request to the same path replaces its payload while every other
 * key is preserved. An unparseable existing file is warned about and treated
 * as empty rather than raising.
 *
 * Concurrent calls are serialized within the process, so captures racing for
 * the store each observe their predecessors and none is silently dropped.
 *
 * @param url - Request path or slug to key the payload by. Defaults to `/`.
 * @param value - The captured payload, stored verbatim.
 */
export async function writePayload(
  value: unknown,
  url: string = "/",
): Promise<void> {
  const filePath = payloadFilePath();
  const key = normalizePayloadKey(url);

  return enqueueWrite(async () => {
    const registry = await loadFromFile(filePath);
    registry[key] = value;
    await persist(filePath, registry);
  });
}

/**
 * Returns every captured payload keyed by its normalized request path.
 *
 * Reads straight from disk on each call rather than serving an in-memory
 * cache, so a write, delete, or clear in the same process is immediately
 * visible. A missing or corrupt file yields `{}`. Never throws.
 *
 * @returns The full payload registry, or `{}` when absent or unparseable.
 */
export async function readPayloads(): Promise<PayloadRegistry> {
  return loadFromFile(payloadFilePath());
}

/**
 * Returns the payload captured for a single key, or `undefined` when absent.
 *
 * The stored value is returned verbatim, so a captured `null` comes back as
 * `null` and is distinguishable from an absent key, which yields `undefined`.
 * Callers can therefore test presence with `=== undefined`. Use
 * `readPayloads` to read the whole store in one call.
 *
 * @param key - Request path or slug to look up. Normalized before lookup.
 * @returns The stored payload, or `undefined` when the key is not present.
 */
export async function getPayload(key: string): Promise<unknown | undefined> {
  const registry = await readPayloads();

  return registry[normalizePayloadKey(key)];
}

/**
 * Removes a single captured payload and persists the result.
 *
 * A missing key is a no-op rather than an error: the store is left untouched
 * and `false` is returned without writing, which keeps repeated deletes safe.
 *
 * @param key - Request path or slug to remove. Normalized before deletion.
 * @returns `true` when the key existed and was removed, `false` otherwise.
 */
export async function deletePayload(key: string): Promise<boolean> {
  const filePath = payloadFilePath();
  const registry = await loadFromFile(filePath);
  const normalized = normalizePayloadKey(key);

  if (!Object.hasOwn(registry, normalized)) {
    return false;
  }

  delete registry[normalized];
  await persist(filePath, registry);

  return true;
}

/**
 * Clears every captured payload by removing the persisted JSON file.
 *
 * Counts the keys *before* clearing so callers can report how many were
 * dropped. Clearing an already empty store is not an error: it returns `0` and
 * throws nothing, which makes the call idempotent and safe to repeat in
 * setup/teardown scripts. An absent or unremovable file is non-fatal.
 *
 * @returns The number of keys that existed immediately before the clear.
 */
export async function clearPayloads(): Promise<number> {
  const filePath = payloadFilePath();
  const cleared = Object.keys(await loadFromFile(filePath)).length;

  try {
    await rm(filePath, { force: true });
  } catch {
    // Best effort — an absent or unremovable file is a non-fatal condition.
  }

  return cleared;
}
