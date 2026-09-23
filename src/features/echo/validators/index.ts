import { z } from "zod";

/**
 * Zod schema for the `POST /api/echo` request body.
 *
 * `url` and `status_code` are optional; `data` is required and may be any
 * JSON value. `status_code` must be an integer in the 100–599 range when
 * provided (defaults to `200` at lookup time). Unknown keys are stripped,
 * matching the EIS RPC body pattern.
 */
export const EchoBodySchema = z.object({
  /** Registry key for the mock; omitted to echo `data` without registering. */
  url: z.string().optional(),
  /** Mock response body — any JSON value. */
  data: z.unknown(),
  /** HTTP status code for matched lookups; defaults to `200` when omitted. */
  status_code: z.number().int().min(100).max(599).optional(),
});

/** Inferred type of a valid `POST /api/echo` request body. */
export type EchoBody = z.infer<typeof EchoBodySchema>;