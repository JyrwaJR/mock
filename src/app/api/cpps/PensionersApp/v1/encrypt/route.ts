import { encryptFields } from "@/src/shared/lib/crypto/transform";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const encrypted = encryptFields(body);

    return NextResponse.json(encrypted);
  } catch (error) {
    console.error("Encryption failed:", error);

    return NextResponse.json(
      {
        error: "Failed to encrypt request",
      },
      {
        status: 400,
      },
    );
  }
}
