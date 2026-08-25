import { simulateCheckToken } from "@feature/cssp/validators/auth";
import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";
import { NextRequest, NextResponse } from "next/server";

/**
 * Mock of ChangePasswordAPI.post (views/change_password.py). Requires
 * 'Authorization: accessToken <mock-token>' header; value 'expired'
 * returns 202. Body fields are ignored by the mock.
 *
 * @param request - Incoming request (oldPassword/newPassword ignored).
 * @returns Registry-selected CHANGE_PASSWORD_VARIANTS response.
 */
export async function POST(request: NextRequest) {
  const auth = simulateCheckToken(request);
  if (!auth.ok) return NextResponse.json({ msg: auth.msg }, { status: auth.status });
  await request.json().catch(() => ({}));
  return respondWith(resolveVariant("change_password"));
}
