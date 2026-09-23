/**
 * Request body accepted by `POST /api/echo`.
 *
 * `data` is echoed back verbatim (minus `url`); when `url` is present the
 * entry is registered in the persisted mock registry so later requests to
 * `/api/echo/<url>` return the same `data`. When `url` is omitted the entry
 * is stored as the default fallback for unmatched lookup paths.
 */
export type EchoRequestBody = {
  /**
   * Registry key. Normalized (leading `/`, no trailing `/`) before storage.
   * When omitted, the entry is registered as the default fallback returned by
   * lookups that match no exact path.
   */
  url?: string;
  /** Arbitrary JSON value returned as the mock response body. */
  data: unknown;
  /**
   * HTTP status code for matched lookups. Defaults to `200` when omitted.
   * Must be an integer between 100 and 599.
   */
  status_code?: number;
};

/**
 * A single registered mock entry, keyed by its normalized URL.
 *
 * `status_code` is the HTTP status returned when the entry's URL is matched;
 * it defaults to `200` when omitted.
 */
export type EchoEntry = {
  /** Mock response body returned on a matched lookup. */
  data: unknown;
  /** HTTP status code for matched lookups; defaults to `200`. */
  status_code?: number;
};

/**
 * The persisted mock registry: maps a normalized URL (e.g. `/articles/1`)
 * to its {@link EchoEntry} (`{ data, status_code }`).
 */
export type EchoRegistry = Record<string, EchoEntry>;