/**
 * Request body accepted by `POST /api/echo`.
 *
 * `data` is echoed back verbatim (minus the selector); when a selector is
 * present the entry is registered in the persisted mock registry so later
 * requests resolve to the same `data`. Exactly one selector may be given:
 * - `url` — keyed by HTTP path; `GET /api/echo/<url>` serves it.
 * - `method` / `functionName` — keyed by RPC method; `POST /api/echo/rpc`
 *   serves it.
 *
 * When no selector is given the entry is stored as the default fallback for
 * unmatched lookup paths.
 */
export type EchoRequestBody = {
  /**
   * Registry key for an HTTP mock. Normalized (leading `/`, no trailing `/`)
   * before storage. When omitted and no RPC selector is given, the entry is
   * registered as the default fallback returned by lookups that match no exact
   * path.
   */
  url?: string;
  /**
   * RPC method to mock. Normalized into the `/rpc/<method>` registry key. An
   * alias of {@link EchoRequestBody.functionName}; mutually exclusive with
   * `url` and with `functionName`.
   */
  method?: string;
  /**
   * RPC method to mock, in the spelling real RPC clients send. An alias of
   * {@link EchoRequestBody.method}; mutually exclusive with `url` and `method`.
   */
  functionName?: string;
  /** Arbitrary JSON value returned as the mock response body. */
  data: unknown;
  /**
   * HTTP status code for matched lookups. Defaults to `200` when omitted.
   * Must be an integer between 100 and 599.
   */
  status_code?: number;
};

/**
 * Request body accepted by `POST /api/echo/rpc`.
 *
 * Mirrors the body real RPC clients send: the method name lives under
 * `functionName` (or its `method` alias) and the call's arguments ride along
 * as sibling keys — `emp_cd`, `password`, `params`, and anything else the
 * caller sends. Unknown keys are preserved so `?write=true` can capture the
 * body verbatim, matching `[...slug]`.
 */
export type RpcCallRequestBody = {
  /** RPC method to invoke. Alias of {@link RpcCallRequestBody.functionName}. */
  method?: string;
  /** RPC method to invoke, in the spelling real clients send. */
  functionName?: string;
  /**
   * Optional conventional argument container. Not read by the handler — the
   * mock registry is keyed by method name alone, so arguments never affect
   * resolution. Accepted so a caller may group arguments if it prefers to.
   */
  params?: unknown;
};

/**
 * A single registered mock entry, keyed by its normalized URL or RPC method.
 *
 * `status_code` is the HTTP status returned when the entry's key is matched;
 * it defaults to `200` when omitted. RPC mocks use the same entry shape as HTTP
 * mocks — they are stored under the `/rpc/<method>` key in the same registry,
 * which is why they are indistinguishable at this layer.
 */
export type EchoEntry = {
  /** Mock response body returned on a matched lookup. */
  data: unknown;
  /** HTTP status code for matched lookups; defaults to `200`. */
  status_code?: number;
};

/**
 * The persisted mock registry: maps a normalized URL (e.g. `/articles/1`) to
 * its {@link EchoEntry} (`{ data, status_code }`).
 *
 * RPC mocks share this record under the `/rpc/` key prefix (e.g.
 * `/rpc/employee_login`), which is what lets `GET /api/echo` and
 * `DELETE /api/echo` report and reset the whole registry without knowing
 * whether an entry is an HTTP mock or an RPC method.
 */
export type EchoRegistry = Record<string, EchoEntry>;

/**
 * The persisted payload store: maps a normalized request path (e.g.
 * `/facial_registration`) to the raw JSON value captured for it.
 *
 * Unlike {@link EchoRegistry}, whose entries are `{ data, status_code }`
 * objects, each value here is stored verbatim as it was received, so any JSON
 * value is legal — including `null` and arrays.
 */
export type PayloadRegistry = Record<string, unknown>;