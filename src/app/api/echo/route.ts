import { handleErrors } from "@/src/shared/errors/handle-errors";
import { withValidation } from "@/src/shared/utils/with-validation/with-validation";
import { EchoBodySchema } from "@/src/features/echo/validators";
import { list, register, clear } from "@/src/features/echo/services/echo";

/**
 * Registers a mock and echoes its `data` back.
 *
 * Body: `{ "url": "/articles/1", "data": { ... }, "status_code": 201 }` —
 * `url` and `status_code` are optional. When `url` is present the entry is
 * upserted into the persisted registry (overwriting any existing entry for
 * that URL and writing through to the JSON file); the response echoes only
 * the `data` field at the submitted `status_code` (default `200`). Malformed
 * JSON or a body missing `data` returns `400`.
 */
export const POST = withValidation(
  { body: EchoBodySchema },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (_request, _ctx: any, { body }) => register(body!),
);

/**
 * Lists all registered mock entries.
 *
 * Returns a `200` JSON record mapping each normalized URL to its
 * `{ data, status_code }` entry, including entries persisted by previous
 * server sessions (loaded from the JSON file on first access).
 */
export const GET = handleErrors(async () => list());

/**
 * Clears every registered mock.
 *
 * Drops all entries from the registry — including the default fallback
 * registered without a `url` — and deletes the persisted
 * `data/echo/registry.json` file, so nothing survives a server restart. This is
 * the reset switch for the mock registry: after it, `GET /api/echo` returns
 * `{}` and every `/api/echo/<url>` lookup answers `404`. The response reports
 * how many entries were dropped as `{ "cleared": n }`; clearing an already
 * empty registry is a no-op that still returns `200`.
 */
export const DELETE = handleErrors(async () => clear());