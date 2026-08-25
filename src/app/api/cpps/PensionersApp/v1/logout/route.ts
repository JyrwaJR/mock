import { simulateCheckToken } from "@feature/cssp/validators/auth";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest, NextResponse } from "next/server";

/**
 * Mock of LogOutAPI.post (views/logout.py). Requires 'Authorization:
 * accessToken <mock-token>' header; value 'expired' returns 202.
 *
 * @param request - Incoming request (body ignored).
 * @returns Registry-selected LOGOUT_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const auth = simulateCheckToken(request);
  if (!auth.ok) return NextResponse.json({ msg: auth.msg }, { status: auth.status });
  await request.json().catch(() => ({}));
  return respondWith(resolveVariant("logout"));
}
