import { z } from "zod";

/**
 * Zod schema for the EIS RPC request body. The mobile app posts
 * `app_id` and an AES-encrypted `request_data` JSON payload.
 */
export const RpcBodySchema = z.object({
  app_id: z.string(),
  request_data: z.string(),
});

/** Inferred type of a valid EIS RPC request body. */
export type RpcBody = z.infer<typeof RpcBodySchema>;
