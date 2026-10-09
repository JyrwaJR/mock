import { MAX_LOGS_BYTES, type LogEntry } from "@/src/features/logs/types";
import type { LogEntryInput, LogsBody } from "@/src/features/logs/validators";
import { PayloadTooLargeError } from "@/src/shared/errors/http-errors";
import { appendLogEntries, clearLogStore, readLogEntries } from "./store";

/** Returns the UTF-8 byte length of a string. */
function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Normalizes a validated input entry into a stored {@link LogEntry}.
 *
 * Stamps `now` as the ISO-8601 timestamp when the input omits one, and copies
 * `content` only when present so an absent payload is not stored as `undefined`.
 *
 * @param input - A validated entry from the request body.
 * @param now - Injected clock, defaulting to the current time (deterministic tests).
 * @returns The fully-formed entry ready for persistence.
 */
export function toLogEntry(
  input: LogEntryInput,
  now: Date = new Date(),
): LogEntry {
  return {
    app: input.app,
    type: input.type,
    message: input.message,
    ...(input.content !== undefined ? { content: input.content } : {}),
    timestamp: input.timestamp ?? now.toISOString(),
  };
}

/**
 * Validates and stores a batch of log entries.
 *
 * Stamps timestamps that were omitted, then rejects the whole batch with `413`
 * when its serialized form exceeds {@link MAX_LOGS_BYTES} (mirroring the echo
 * endpoint's size guard). Otherwise appends to the store; the store evicts the
 * oldest entries to stay within the cap and reports how many were dropped.
 *
 * @param body - The validated request body (a non-empty array of entries).
 * @returns A `200` JSON response shaped `{ stored, dropped }`.
 * @throws PayloadTooLargeError when the serialized batch exceeds the byte cap.
 */
export async function writeLogs(body: LogsBody): Promise<Response> {
  const now = new Date();
  const entries = body.map((entry) => toLogEntry(entry, now));

  if (byteLength(JSON.stringify(entries)) > MAX_LOGS_BYTES) {
    throw new PayloadTooLargeError(`Log batch exceeds ${MAX_LOGS_BYTES} bytes`);
  }

  const result = await appendLogEntries(entries);
  return Response.json(result, { status: 200 });
}

/**
 * Returns every stored log entry as a bare JSON array (oldest first). No
 * envelope, matching the echo feature's unwrapped responses.
 *
 * @returns A `200` JSON response carrying `LogEntry[]`.
 */
export async function listLogs(): Promise<Response> {
  return Response.json(await readLogEntries(), { status: 200 });
}

/**
 * Clears every stored log entry by deleting the persisted file.
 *
 * Counts the entries before clearing so the response can report how many were
 * dropped. Idempotent: clearing an empty store returns `200 { cleared: 0 }`.
 *
 * @returns A `200` JSON response shaped `{ cleared: number }`.
 */
export async function clearLogs(): Promise<Response> {
  return Response.json({ cleared: await clearLogStore() }, { status: 200 });
}
