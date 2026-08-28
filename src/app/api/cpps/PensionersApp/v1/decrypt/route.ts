import { decryptFields } from "@/src/shared/lib/crypto/transform";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const decrypted = decryptFields(body);

    return NextResponse.json(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);

    return NextResponse.json(
      {
        message: "Failed to decrypt request",
      },
      {
        status: 400,
      },
    );
  }
}
