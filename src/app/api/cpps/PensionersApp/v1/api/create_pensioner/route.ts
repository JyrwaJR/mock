import { tryDecrypt } from "@feature/cssp/utils/crypto";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest } from "next/server";

/**
 * Mock of CreatePensionerAPI.post (views/create_pensioner.py). Decrypts
 * ppo_no/password/bank_account_number/dob for parity; response comes from
 * the registry.
 *
 * @param request - Incoming request with optional encrypted fields.
 * @returns Registry-selected CREATE_PENSIONER_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  void tryDecrypt(body.ppo_no);
  void tryDecrypt(body.password);
  void tryDecrypt(body.bank_account_number);
  void tryDecrypt(body.dob);
  return respondWith(resolveVariant("create_pensioner"));
}
