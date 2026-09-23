import { handleErrors } from "@/src/shared/errors/handle-errors";
import { withValidation } from "@/src/shared/utils/with-validation/with-validation";
import { EchoBodySchema } from "@/src/features/echo/validators";
import { list, register } from "@/src/features/echo/services/echo";

/**
 * Registers a mock and echoes its `data` back.
 *
 * Body: `{ "url": "/articles/1", "data": { ... }, "status_code": 201 }` —
 * `url` and `status_code` are optional. When `url` is present the entry is
 * upserted into the persisted registry (overwriting any existing entry for
 * that URL and writing through to the JSON file); the response is always
 * `200` with only the `data` field echoed. Malformed JSON or a body missing
 * `data` returns `400`.
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