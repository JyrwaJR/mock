import { NextRequest, NextResponse } from "next/server";

import { signAccessToken } from "@/src/shared/utils/jwt-utils";

export async function POST(request: NextRequest) {
  const accessToken = await signAccessToken("anonymous");

  return NextResponse.json({
    message: "Login successfully",
    access_token: accessToken,
    scope: "scope",
    expire_in: 1200,
    token_type: "Bearer",
  });
}
