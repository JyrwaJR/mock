import { LogsBodySchema } from "@/src/features/logs/validators";
import {
  clearLogs,
  listLogs,
  writeLogs,
} from "@/src/features/logs/services/logs";
import { handleErrors } from "@/src/shared/errors/handle-errors";
import { withValidation } from "@/src/shared/utils/with-validation/with-validation";

/**
 * Ingests a batch of frontend log entries.
 *
 * Body: an array of `{ app, type, message, content?, timestamp? }`. `type` is one
 * of `debug | info | warn | error`. Malformed JSON or an invalid entry returns
 * `400`; a batch whose serialized form exceeds 1 MiB returns `413`. On success
 * the entries are appended to the persisted JSON log array and the response is
 * `200 { stored, dropped }`, where `dropped` counts oldest entries evicted to
 * keep the file within the byte cap.
 */
export const POST = withValidation(
  { body: LogsBodySchema },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (_request, _ctx: any, { body }) => writeLogs(body!),
);

/**
 * Lists every stored log entry as a bare JSON array (oldest first), read from
 * `data/logs/logs.json` so entries from previous server sessions are included.
 * A missing or corrupt store yields `[]` at `200` rather than an error.
 */
export const GET = handleErrors(async () => listLogs());

/**
 * Clears every stored log entry and deletes the persisted file, so nothing
 * survives a server restart. Reports `{ cleared: n }`; clearing an already empty
 * store returns `200 { cleared: 0 }` (idempotent).
 */
export const DELETE = handleErrors(async () => clearLogs());
