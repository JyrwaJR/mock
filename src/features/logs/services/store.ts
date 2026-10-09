import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { MAX_LOGS_BYTES, type LogEntry } from "@/src/features/logs/types";

/** File name of the JSON array that persists captured logs. */
const LOGS_FILE = "logs.json";

/** Returns the UTF-8 byte length of a string. */
function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Resolves the JSON file that persists captured logs.
 *
 * Honors `LOGS_DATA_DIR` when set; otherwise defaults to `data/logs/logs.json`
 * under the current working directory. Resolved lazily on each call — never
 * cached at module scope — so tests or a fresh server session can repoint it via
 * the environment after this module has been imported.
 *
 * @returns The absolute path of the logs JSON file.
 */
export function logsFilePath(): string {
  const dataDir = process.env.LOGS_DATA_DIR;
  if (dataDir) {
    // Env-overridable, so opt out of Turbopack's whole-project trace analysis.
    return path.join(/*turbopackIgnore: true*/ dataDir, LOGS_FILE);
  }
  return path.join(process.cwd(), "data", "logs", LOGS_FILE);
}

/**
 * Reads and parses the persisted logs file. Never throws.
 *
 * A missing file, unparseable JSON, or well-formed JSON that is not an array
 * all yield an empty array, so a bad file never crashes the API.
 *
 * @param filePath - Absolute path of the logs JSON file to read.
 * @returns The stored entries in order, or `[]` when absent/corrupt.
 */
async function loadFromFile(filePath: string): Promise<LogEntry[]> {
  let raw: string;
  try {
    raw = await readFile(/*turbopackIgnore: true*/ filePath, "utf8");
  } catch {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as LogEntry[];
    }
  } catch {
    console.warn(`[logs] Ignoring corrupt logs file at ${filePath}`);
  }
  return [];
}

/**
 * Evicts the oldest entries until the persisted array fits within
 * {@link MAX_LOGS_BYTES}.
 *
 * Measures the *pretty-printed* form — the exact bytes {@link persist} writes —
 * so the cap bounds the real file size, not a smaller compact estimate. Returns
 * the surviving suffix and how many leading entries were dropped.
 */
function trimToCap(entries: LogEntry[]): {
  entries: LogEntry[];
  dropped: number;
} {
  let start = 0;
  while (
    start < entries.length &&
    byteLength(JSON.stringify(entries.slice(start), null, 2)) > MAX_LOGS_BYTES
  ) {
    start += 1;
  }
  return { entries: entries.slice(start), dropped: start };
}

/**
 * Tail of the in-process write queue. `appendLogEntries` is a read-modify-write
 * cycle; chaining the cycles makes each one observe its predecessor's result so
 * concurrent appends are not silently lost. Scoped to the single Node process.
 */
let writeChain: Promise<void> = Promise.resolve();

/**
 * Runs `task` after every queued write and queues it for the ones that follow.
 *
 * A rejected task must not stall the queue, so the chain is advanced past the
 * failure while the caller still receives the original result.
 */
function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const result = writeChain.then(task);
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/**
 * Atomically writes the whole log array to disk.
 *
 * Writes to a uniquely named temp file first, then renames it over the target,
 * so a crash mid-write cannot leave a truncated file and concurrent writes keep
 * independent temp paths. Creates parent directories as needed. A failed write
 * removes its orphan temp file and rethrows.
 */
async function persist(filePath: string, entries: LogEntry[]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmpPath, JSON.stringify(entries, null, 2), "utf8");
    await rename(tmpPath, filePath);
  } catch (error) {
    await rm(tmpPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

/**
 * Appends entries to the store and persists the result.
 *
 * Loads the current array, concatenates the new entries on the end, evicts the
 * oldest entries until the serialized store fits within {@link MAX_LOGS_BYTES},
 * and atomically rewrites the file. Concurrent calls are serialized in-process.
 *
 * @param entries - Fully-formed entries (timestamps already stamped).
 * @returns `{ stored, dropped }` — the number appended and evicted respectively.
 */
export async function appendLogEntries(
  entries: LogEntry[],
): Promise<{ stored: number; dropped: number }> {
  const filePath = logsFilePath();

  return enqueueWrite(async () => {
    const existing = await loadFromFile(filePath);
    const { entries: trimmed, dropped } = trimToCap([...existing, ...entries]);
    await persist(filePath, trimmed);
    return { stored: entries.length, dropped };
  });
}

/**
 * Returns every stored log entry in insertion order, read straight from disk so
 * writes/clears in the same process are immediately visible. Never throws.
 *
 * @returns The stored entries, or `[]` when absent/corrupt.
 */
export async function readLogEntries(): Promise<LogEntry[]> {
  return loadFromFile(logsFilePath());
}

/**
 * Removes the persisted logs file and reports how many entries it held.
 *
 * Counts before deleting so callers can report the number dropped. Clearing an
 * already empty store returns `0` and throws nothing (idempotent).
 *
 * @returns The number of entries that existed immediately before the clear.
 */
export async function clearLogStore(): Promise<number> {
  const filePath = logsFilePath();
  const cleared = (await loadFromFile(filePath)).length;
  try {
    await rm(filePath, { force: true });
  } catch {
    // Best effort — an absent or unremovable file is non-fatal.
  }
  return cleared;
}
