import { handleErrors } from "@/src/shared/errors/handle-errors";
import {
  clearPayloads,
  readPayloads,
} from "@/src/features/echo/services/payload";

/**
 * Lists every payload captured for a `/api/echo/<path>` request.
 *
 * Returns a `200` JSON record mapping each normalized path to the payload
 * captured for it, read straight from `data/echo/payload.json` so entries
 * written by previous server sessions are included. The shape matches
 * `GET /api/echo` — a bare record, no wrapper object and no envelope — so
 * the payload store and the mock registry are interchangeable from a
 * caller's point of view. A missing or corrupt store yields `{}` at `200`
 * rather than an error.
 *
 * @returns A `200` JSON response carrying the raw `path -> payload` record.
 */
export const GET = handleErrors(async () =>
  Response.json(await readPayloads(), { status: 200 }),
);

/**
 * Clears every captured payload.
 *
 * Drops all captured payloads and deletes the persisted
 * `data/echo/payload.json` file, so nothing survives a server restart. This is
 * the reset switch for the payload store: after it, `GET /api/echo/payload`
 * returns `{}` and no captured payload is served. The response reports how many
 * payloads were dropped as `{ "cleared": n }`; clearing an already empty store
 * is a no-op that still returns `200` with `cleared: 0`, making the call
 * idempotent and safe to repeat in setup and teardown scripts.
 *
 * @returns A `200` JSON response shaped `{ cleared: number }`, where `cleared`
 *   is the number of payloads that existed immediately before the clear.
 */
export const DELETE = handleErrors(async () =>
  Response.json({ cleared: await clearPayloads() }, { status: 200 }),
);
