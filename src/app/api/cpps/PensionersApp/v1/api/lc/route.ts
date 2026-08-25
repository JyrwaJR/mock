import { simulateCheckToken } from "@feature/cssp/validators/auth";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest, NextResponse } from "next/server";

/**
 * Mock of LcAPI.post (views/lc.py) — Life Certificate submission.
 * accessToken header required; value 'expired' returns 202. DLC body
 * fields are ignored by the mock.
 *
 * @param request - Incoming request (DLC declaration fields ignored).
 * @returns Registry-selected LC_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const auth = simulateCheckToken(request);
  if (!auth.ok) return NextResponse.json({ msg: auth.msg }, { status: auth.status });
  await request.json().catch(() => ({}));
  return respondWith(resolveVariant("lc"));
}
