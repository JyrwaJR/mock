import { formatPassword } from "@/src/shared/lib/crypto/format-password";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = body.password;
    if (!password) throw new Error("Password missing");
    return NextResponse.json({
      formatted: formatPassword(password),
    });
  } catch (_error) {
    return NextResponse.json({
      message: "Error format password",
    });
  }
}
