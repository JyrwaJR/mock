import { simulateCheckToken } from "@feature/cssp/validators/auth";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest, NextResponse } from "next/server";

/**
 * Mock of VerificationAPI.post (views/verification.py). accessToken header
 * required; value 'expired' reproduces the real 202 ' (Access denied)'.
 * Image payloads are ignored by the mock.
 *
 * @param request - Incoming request (image_1/image_2 ignored).
 * @returns Registry-selected VERIFICATION_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const auth = simulateCheckToken(request);
  if (!auth.ok) return NextResponse.json({ msg: auth.msg }, { status: auth.status });
  await request.json().catch(() => ({}));
  return respondWith(resolveVariant("verification"));
}
