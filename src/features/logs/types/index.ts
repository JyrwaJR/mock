/** Accepted log severity levels, ordered from least to most severe. */
export const LOG_LEVELS = ["debug", "info", "warn", "error", "log"] as const;

/** Union of the accepted log severity levels. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * A single stored log entry.
 *
 * `app` identifies the originating frontend app; `type` is the severity;
 * `message` is the human-readable line; `content` is an optional arbitrary JSON
 * payload for structured context; `timestamp` is an ISO-8601 instant stamped by
 * the server when the client omits it.
 */
export interface LogEntry {
  /** Short identifier of the app that emitted the log (e.g. `pensioners`). */
  app: string;
  /** Severity of the entry. */
  type: LogLevel;
  /** Human-readable log line. */
  message: string;
  /** Optional arbitrary JSON payload carrying structured context. */
  content?: unknown;
  /** ISO-8601 instant the entry was recorded. */
  timestamp: string;
}

/**
 * Upper bound on the serialized log store, in UTF-8 bytes (1 MiB).
 *
 * Shared by the service (rejects an oversized incoming batch) and the store
 * (evicts the oldest entries until the persisted array fits), so the file can
 * never grow without bound.
 */
export const MAX_LOGS_BYTES = 1024 * 1024;
