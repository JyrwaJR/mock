import { requireRenewHeader } from "@feature/cssp/validators/auth";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest, NextResponse } from "next/server";

/**
 * Mock of ValidateTokenAPI.post (views/validate_token.py). Requires any
 * 'Authorization: accessToken <mock-token>' header; absence returns 403,
 * mirroring the real view's outer exception handler.
 *
 * @param request - Incoming request (uid body field ignored).
 * @returns Registry-selected VALIDATE_TOKEN_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const auth = requireRenewHeader(request);
  if (!auth.ok) return NextResponse.json({ msg: auth.msg }, { status: auth.status });
  await request.json().catch(() => ({}));
  return respondWith(resolveVariant("validate_token"));
}
