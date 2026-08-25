import { EXPIRED_TOKEN } from "@feature/cssp/utils/constants/tokens";
import type { NextRequest } from "next/server";

/**
 * Outcome of a simulated CheckToken authentication attempt.
 *
 * - `{ ok: true }` — request may proceed to variant selection.
 * - `{ ok: false, status, msg }` — respond immediately with this status/body,
 *   mirroring the exact strings emitted by CheckToken.py.
 */
export type AuthResult =
  | { ok: true }
  | { ok: false; status: 202 | 400 | 403; msg: string };

/** Authorization scheme used by the PensionersApp ('accessToken <value>'). */
const SCHEME = "accessToken ";

/**
 * Simulates PensionersApp CheckToken.authenticate (CheckToken.py) using
 * plain mock tokens:
 *
 * - Header must be `Authorization: accessToken <value>` else
 *   400 `' (Unable to process)'`
 * - Literal value 'expired' ({@link EXPIRED_TOKEN}) reproduces the
 *   ExpiredSignature branch → 202 `' (Access denied)'`
 * - Any other non-empty value passes (mock never verifies signatures)
 *
 * @param request - Incoming Next.js route request.
 * @returns AuthResult indicating pass or the exact failure response.
 */
export function simulateCheckToken(request: NextRequest): AuthResult {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith(SCHEME)) {
    return { ok: false, status: 400, msg: " (Unable to process)" };
  }
  const token = header.slice(SCHEME.length).trim();
  if (token.toLowerCase() === EXPIRED_TOKEN) {
    return { ok: false, status: 202, msg: " (Access denied)" };
  }
  return { ok: true };
}

/**
 * Header presence check for POST api/validate_token (renew flow). Mirrors
 * the real view where a missing Authorization header falls into its outer
 * handler: 403 `'Error: Unauthorised access'`. Any present value passes.
 *
 * @param request - Incoming Next.js route request.
 * @returns AuthResult indicating pass or the exact failure response.
 */
export function requireRenewHeader(request: NextRequest): AuthResult {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith(SCHEME)) {
    return { ok: false, status: 403, msg: "Error: Unauthorised access" };
  }
  return { ok: true };
}
