import { simulateCheckToken } from "@feature/cssp/validators/auth";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest, NextResponse } from "next/server";

/**
 * Mock of VerificationStatusAPI.post (views/verification_status.py).
 * accessToken header required; value 'expired' returns 202.
 *
 * @param request - Incoming request (body ignored).
 * @returns Registry-selected VERIFICATION_STATUS_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const auth = simulateCheckToken(request);
  if (!auth.ok) return NextResponse.json({ msg: auth.msg }, { status: auth.status });
  await request.json().catch(() => ({}));
  return respondWith(resolveVariant("verification_status"));
}
