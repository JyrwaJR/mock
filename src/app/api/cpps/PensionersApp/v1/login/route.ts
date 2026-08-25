import { tryDecrypt } from "@feature/cssp/utils/crypto";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest } from "next/server";

/**
 * Mock of LoginAPI.post (views/login.py). No auth required. Encrypted
 * username/password/version are decrypted for parity; responses carry the
 * registry-selected variant with fixed mock tokens.
 *
 * @param request - Incoming request with optional encrypted credentials.
 * @returns Registry-selected LOGIN_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  void tryDecrypt(body.username);
  void tryDecrypt(body.password);
  void tryDecrypt(body.version);
  return respondWith(resolveVariant("login"));
}
