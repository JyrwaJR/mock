import {
  LOG_LEVELS,
  MAX_LOGS_BYTES,
  type LogEntry,
  type LogLevel,
} from "@/src/features/logs/types";
import type { LogEntryInput, LogsBody } from "@/src/features/logs/validators";
import { BadRequestError, PayloadTooLargeError } from "@/src/shared/errors/http-errors";
import { appendLogEntries, clearLogStore, readLogEntries } from "./store";

/** Returns the UTF-8 byte length of a string. */
function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/** Inclusive timestamp bounds and severity/text filters for `GET /api/logs`. */
export interface LogFilters {
  /** Inclusive lower bound on entry timestamps. */
  from?: Date;
  /** Inclusive upper bound on entry timestamps. */
  to?: Date;
  /** Severities to keep; absent keeps every severity (OR semantics). */
  types?: LogLevel[];
  /** Case-insensitive substring matched against `message`; absent matches all. */
  q?: string;
}

/**
 * Returns the epoch milliseconds of an entry's timestamp, or `-Infinity` when
 * the timestamp cannot be parsed (so corrupt rows sink to the end of a sort and
 * never match a range filter).
 */
function entryTime(entry: LogEntry): number {
  const time = Date.parse(entry.timestamp);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/**
 * Filters and sorts stored entries for `GET /api/logs`.
 *
 * Keeps entries matching every provided filter (AND): `from`/`to` are inclusive
 * bounds on the parsed timestamp *instant* (so UTC and offset timestamps compare
 * correctly), `types` matches any listed severity (OR), and `q` is a
 * case-insensitive substring of `message`. Sorts newest-first by timestamp with
 * a stable sort, preserving insertion order for equal timestamps.
 *
 * @param entries - The stored entries read from disk (insertion order).
 * @param filters - Optional bounds, severities, and text query.
 * @returns The matching entries, newest-first.
 */
export function applyLogFilters(entries: LogEntry[], filters: LogFilters): LogEntry[] {
  const from = filters.from?.getTime();
  const to = filters.to?.getTime();
  const q = filters.q?.toLowerCase();

  const matched = entries.filter((entry) => {
    const time = entryTime(entry);
    if (from !== undefined && time < from) return false;
    if (to !== undefined && time > to) return false;
    if (filters.types !== undefined && filters.types.length > 0 && !filters.types.includes(entry.type)) {
      return false;
    }
    if (q !== undefined && !entry.message.toLowerCase().includes(q)) return false;
    return true;
  });

  return matched.sort((a, b) => entryTime(b) - entryTime(a));
}

/** Matches a bare `YYYY-MM-DD` calendar date. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses one `from`/`to` query value into a {@link Date} bound.
 *
 * A bare `YYYY-MM-DD` is treated as a UTC day: start-of-day (`T00:00:00.000Z`)
 * for lower bounds and end-of-day (`T23:59:59.999Z`) for upper bounds so the
 * range is inclusive across the whole calendar date. Anything else is parsed as
 * a full ISO-8601 instant.
 *
 * @param value - The raw query value.
 * @param name - Param name, used in the error message (`from` or `to`).
 * @param endOfDay - Whether a date-only value means the end of that UTC day.
 * @returns The parsed bound.
 * @throws BadRequestError when the value is neither a date nor a parseable instant.
 */
function parseDateParam(value: string, name: string, endOfDay: boolean): Date {
  if (DATE_ONLY.test(value)) {
    return new Date(endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`Invalid '${name}' bound: ${value}`);
  }
  return date;
}

/**
 * Parses and validates the `GET /api/logs` query string.
 *
 * Accepts `from`/`to` (each `YYYY-MM-DD`, treated as a UTC day, or a full
 * ISO-8601 instant), repeated `type` params (`debug|info|warn|error`, OR
 * semantics), and `q` (case-insensitive message substring). Unknown params are
 * ignored. Date-only values are interpreted as UTC, matching the server-stamped
 * `Z` timestamps.
 *
 * @param searchParams - Raw query params from the route's `request.nextUrl`.
 * @returns The validated filters for {@link applyLogFilters}.
 * @throws BadRequestError when a bound is unparseable, a `type` value is not a
 * known severity, or `from` is after `to`.
 */
export function parseLogFilters(searchParams: URLSearchParams): LogFilters {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fromDate = from !== null ? parseDateParam(from, "from", false) : undefined;
  const toDate = to !== null ? parseDateParam(to, "to", true) : undefined;

  if (fromDate !== undefined && toDate !== undefined && fromDate.getTime() > toDate.getTime()) {
    throw new BadRequestError("'from' must not be after 'to'");
  }

  const types = searchParams
    .getAll("type")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  for (const type of types) {
    if (!LOG_LEVELS.includes(type as LogLevel)) {
      throw new BadRequestError(`Invalid 'type' filter: ${type}`);
    }
  }

  const q = searchParams.get("q")?.trim();

  return {
    ...(fromDate !== undefined ? { from: fromDate } : {}),
    ...(toDate !== undefined ? { to: toDate } : {}),
    ...(types.length > 0 ? { types: types as LogLevel[] } : {}),
    ...(q !== undefined && q.length > 0 ? { q } : {}),
  };
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
 * Returns stored log entries as a bare JSON array (newest-first).
 *
 * Applies {@link applyLogFilters} with the given filters; calling with no
 * filters returns every entry ordered newest-first by timestamp. No envelope,
 * matching the echo feature's unwrapped responses.
 *
 * @param filters - Optional timestamp bounds, severities, and message query.
 * @returns A `200` JSON response carrying `LogEntry[]`.
 */
export async function listLogs(filters: LogFilters = {}): Promise<Response> {
  return Response.json(applyLogFilters(await readLogEntries(), filters), {
    status: 200,
  });
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
