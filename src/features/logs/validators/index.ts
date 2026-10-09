import { z } from "zod";

import { LOG_LEVELS } from "@/src/features/logs/types";

/** Maximum number of entries accepted in one `POST /api/logs` batch. */
export const MAX_BATCH_ENTRIES = 1000;

/**
 * Zod schema for one log entry in a `POST /api/logs` batch.
 *
 * `content` is optional and may be any JSON value. `timestamp` is optional;
 * when omitted the server stamps the current time. `app` is trimmed and capped
 * at 100 chars, `message` at 10,000 chars. Unknown keys are stripped.
 */
export const LogEntrySchema = z.object({
  /** Short identifier of the emitting app. Trimmed; 1–100 chars. */
  app: z.string().trim().min(1).max(100),
  /** Severity level. */
  type: z.enum(LOG_LEVELS).transform((v) => v.toLowerCase()),
  /** Human-readable log line; 1–10,000 chars. */
  message: z.string().min(1).max(10_000),
  /** Optional arbitrary JSON payload. */
  content: z.unknown().optional(),
  /** Optional ISO-8601 instant; the server stamps one when omitted. */
  timestamp: z.iso.datetime({ offset: true }).optional(),
});

/**
 * Zod schema for the `POST /api/logs` request body: a non-empty array of log
 * entries, capped at {@link MAX_BATCH_ENTRIES} items.
 */
export const LogsBodySchema = z
  .array(LogEntrySchema)
  .min(1)
  .max(MAX_BATCH_ENTRIES);

/** Inferred type of a single validated log entry (as received). */
export type LogEntryInput = z.infer<typeof LogEntrySchema>;

/** Inferred type of a valid `POST /api/logs` request body. */
export type LogsBody = z.infer<typeof LogsBodySchema>;
