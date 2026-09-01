import { NextResponse } from "next/server";
import { RpcResponse } from "@/src/features/eis/types";
import { encrypt } from "@/src/features/eis/utils/encryption";

/**
 * Serialises an EIS RPC mock result by encrypting its JSON with the shared
 * AES cipher, then wrapping it in a `NextResponse` whose body is
 * `{ response: <ciphertext> }` — the exact envelope the real EIS backend
 * returns to mobile clients.
 *
 * @param data - The {@link RpcResponse} to encrypt and return.
 * @returns A `200` JSON response carrying the encrypted payload with a
 *   `plain/text` content type, byte-compatible with the upstream backend.
 */
export function respondWith(data: RpcResponse): NextResponse {
  const encrypted = encrypt(JSON.stringify(data));
  return NextResponse.json(
    { response: encrypted },
    {
      status: 200,
      headers: {
        "Content-Type": "plain/text",
      },
    },
  );
}
