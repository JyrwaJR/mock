import { withValidation } from "@/src/shared/utils/with-validation/with-validation";
import z from "zod";
import { runMockRpc } from "@/src/features/eis/services/mock-rpc";
import { RpcBodySchema } from "@/src/features/eis/validators";

/**
 * Shared EIS RPC mock route. This route is intentionally thin: it only wires
 * the shared request-validation middleware to the EIS feature's RPC service,
 * so all EIS-specific logic (auth, decryption, response selection, encryption)
 * lives inside `src/features/eis/`.
 *
 * The body carries `app_id` and an AES-encrypted `request_data` payload; the
 * response is an encrypted envelope produced by the EIS service.
 */
export const POST = withValidation(
  { body: RpcBodySchema, query: z.object({}).strict() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request, _ctx: any, { body }) => {
    return runMockRpc(request, body!);
  },
);
