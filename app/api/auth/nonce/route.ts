import { NextRequest, NextResponse } from "next/server";
import { buildSignMessage } from "@/lib/auth";

/**
 * GET /api/auth/nonce?address=0x...
 * Returns the message the frontend should sign.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();

  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return NextResponse.json({ error: "Valid address required" }, { status: 400 });
  }

  const message = buildSignMessage(address);
  return NextResponse.json({ message });
}
