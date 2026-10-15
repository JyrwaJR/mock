import { handleErrors } from "@/src/shared/errors/handle-errors";
import { withValidation } from "@/src/shared/utils/with-validation/with-validation";
import { RpcCallSchema } from "@/src/features/echo/validators";
import { callRpc, clearRpc, listRpc } from "@/src/features/echo/services/rpc";

/**
 * Invokes an RPC method and echoes the mock registered for it.
 *
 * Body: `{ "functionName": "employee_login", "emp_cd": "...", ... }` — the
 * method name may be given as `functionName` (the spelling real RPC clients
 * send) or as `method`, and any other keys are call arguments. Resolves the
 * method to its `/rpc/<method>` registry key and returns the registered `data`
 * at its `status_code` (default `200`), shaped exactly like the HTTP lookup:
 * `{ data, message }` where `message` is `Success` at `200` and `Error`
 * otherwise. An unregistered method falls back to the default entry registered
 * without a selector, then to `404`.
 *
 * Appending `?write=true` captures the call body to the payload store under
 * `/rpc/<method>` before answering, so `GET /api/echo/payload` returns it — the
 * RPC counterpart of the catch-all's `?write=true`. The captured value is the
 * validated body: the caller's arguments (`emp_cd`, `password`, …) are kept as
 * sent, next to the normalized `method` field.
 *
 * A malformed JSON body, a missing method name, or an over-long one yields
 * `400`.
 */
export const POST = withValidation(
  { body: RpcCallSchema },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request, _ctx: any, { body }) => {
    const write = request.nextUrl.searchParams.get("write") === "true";
    return callRpc(body!.method, body, write);
  },
);

/**
 * Lists every registered RPC mock.
 *
 * Returns a `200` JSON record mapping each `/rpc/<method>` key to its
 * `{ data, status_code }` entry. HTTP mocks and the default fallback are
 * omitted — the full registry remains available at `GET /api/echo`.
 */
export const GET = handleErrors(async () => listRpc());

/**
 * Clears every registered RPC mock.
 *
 * Drops only the entries under `/rpc/`, so HTTP mocks and the default fallback
 * survive; use `DELETE /api/echo` to reset the whole registry. The response
 * reports how many RPC entries were dropped as `{ "cleared": n }`. Clearing
 * when none are registered is a no-op that still returns `200` with
 * `cleared: 0`, making the call idempotent and safe to repeat in setup and
 * teardown scripts.
 */
export const DELETE = handleErrors(async () => clearRpc());