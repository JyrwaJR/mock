import { tryDecrypt } from "@feature/cssp/utils/crypto";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest } from "next/server";

/**
 * Mock of GetRegistrationStatusAPI.post (views/get_registration_status.py).
 * Decrypts ppo_no/version for parity; response comes from the registry.
 *
 * @param request - Incoming request with optional encrypted ppo_no.
 * @returns Registry-selected REGISTRATION_STATUS_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  void tryDecrypt(body.ppo_no);
  void tryDecrypt(body.version);
  return respondWith(resolveVariant("get_registration_status"));
}
