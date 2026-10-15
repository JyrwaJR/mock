import { z } from "zod";

/**
 * Maximum accepted length of an RPC method name, in characters.
 *
 * Bounds registry keys and payload-store keys: an unbounded method name would
 * let a single request grow the persisted JSON file without limit.
 */
export const RPC_METHOD_MAX_LENGTH = 200;

/**
 * A single RPC method name, normalized to its trimmed form.
 *
 * Trimmed so `"  employee_login  "` and `"employee_login"` are one method, and
 * bounded to {@link RPC_METHOD_MAX_LENGTH} non-empty characters. Case is
 * preserved — RPC method names are case-sensitive, so `Employee_Login` and
 * `employee_login` are two distinct methods.
 */
const rpcMethodField = z.string().trim().min(1).max(RPC_METHOD_MAX_LENGTH);

/**
 * Zod schema for the `POST /api/echo` request body.
 *
 * A mock is registered under exactly one of three selectors, and `url` remains
 * the HTTP one:
 * - `url` — mock an HTTP path; `GET /api/echo/<url>` serves it.
 * - `method` / `functionName` — mock an RPC method; `POST /api/echo/rpc` serves
 *   it. Both spellings are accepted because real clients send `functionName`
 *   while the REST-facing mock API documents `method`; they are equivalent.
 *
 * Supplying more than one selector is rejected, since two of them would make
 * the registry key ambiguous. Supplying none registers the `*` default
 * fallback returned by lookups that match no exact path — unchanged behaviour.
 *
 * `data` is required and may be any JSON value. `status_code` must be an
 * integer in the 100–599 range when provided (defaults to `200` at lookup
 * time). Unknown keys are stripped, matching the EIS RPC body pattern.
 */
export const EchoBodySchema = z
  .object({
    /** Registry key for an HTTP mock; omitted for RPC or fallback mocks. */
    url: z.string().optional(),
    /** RPC method to mock. Mutually exclusive with `url`. */
    method: rpcMethodField.optional(),
    /**
     * Alias of `method` matching the wire shape real RPC clients send. Mutually
     * exclusive with `url`, and with `method`.
     */
    functionName: rpcMethodField.optional(),
    /** Mock response body — any JSON value. */
    data: z.unknown(),
    /** HTTP status code for matched lookups; defaults to `200` when omitted. */
    status_code: z.number().int().min(100).max(599).optional(),
  })
  .refine(
    (body) =>
      [body.url, body.method, body.functionName].filter(
        (selector) => selector !== undefined,
      ).length <= 1,
    {
      message:
        "Provide at most one of `url`, `method`, or `functionName` to pick the registry key",
      path: ["method"],
    },
  );

/** Inferred type of a valid `POST /api/echo` request body. */
export type EchoBody = z.infer<typeof EchoBodySchema>;

/**
 * Zod schema for the `POST /api/echo/rpc` request body.
 *
 * Built with `looseObject` so unrecognized keys are **preserved** rather than
 * stripped. A real RPC client posts its arguments as siblings of the method
 * name — e.g. `{ functionName, emp_cd, password }` — and `?write=true` must be
 * able to capture those arguments, exactly as `[...slug]` does. Stripping them
 * would silently discard every argument.
 *
 * The final `transform` folds `functionName` into a guaranteed-present
 * `method`, so the route reads `body.method` as a plain `string` with no
 * fallback logic and no non-null assertion. A consequence worth knowing: the
 * validated body carries that normalized `method` alongside the caller's
 * original `functionName`, so a `?write=true` capture records both. That is
 * additive — no caller-supplied key is dropped or altered.
 */
export const RpcCallSchema = z
  .looseObject({
    /** RPC method to invoke. Takes precedence over `functionName`. */
    method: rpcMethodField.optional(),
    /** Alias of `method`; the spelling real RPC clients send. */
    functionName: rpcMethodField.optional(),
    /** Optional conventional argument container. Never read by the handler. */
    params: z.unknown().optional(),
  })
  .refine((body) => body.method !== undefined || body.functionName !== undefined, {
    message: "`method` (or `functionName`) is required to select an RPC method",
    path: ["method"],
  })
  .transform((body) => ({
    ...body,
    method: body.method ?? (body.functionName as string),
  }));

/** Inferred type of a valid `POST /api/echo/rpc` request body. */
export type RpcCall = z.infer<typeof RpcCallSchema>;

/**
 * Reads the RPC method name from a validated body, accepting either spelling.
 *
 * `method` wins over `functionName` when both are present so a client that
 * sends both is resolved deterministically rather than by object key order.
 *
 * @param body - A body carrying `method` or `functionName`.
 * @returns The method name, or `undefined` when neither field is set.
 */
export function readMethodName(
  body: { method?: string; functionName?: string },
): string | undefined {
  return body.method ?? body.functionName;
}