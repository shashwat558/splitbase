import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { signJWT, isNonceValid, generateNonce } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

/**
 * POST /api/auth/verify
 * Body: { address: string, signature: string }
 *
 * Verifies the wallet signature and issues a JWT.
 */
export async function POST(req: NextRequest) {
  const { address, signature } = await req.json();

  if (!address || !signature) {
    return NextResponse.json({ error: "address and signature required" }, { status: 400 });
  }

  const addr = address.toLowerCase() as `0x${string}`;
  const nonce = generateNonce(addr);
  const message = `Sign in to SplitBase\n\nWallet: ${addr}\nNonce: ${nonce}`;

  // Verify the signature using viem
  let valid = false;
  try {
    valid = await verifyMessage({ address: addr, message, signature });
  } catch {
    // also try previous time window (handle ~2min clock skew)
    try {
      const prevBucket = Math.floor(Date.now() / 120_000) - 1;
      const prevNonce = `${addr}-${prevBucket}`;
      if (isNonceValid(addr, prevNonce)) {
        const prevMessage = `Sign in to SplitBase\n\nWallet: ${addr}\nNonce: ${prevNonce}`;
        valid = await verifyMessage({ address: addr, message: prevMessage, signature });
      }
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Upsert user in DB
  const db = createServiceClient();
  await db
    .from("users")
    .upsert({ wallet_address: addr }, { onConflict: "wallet_address", ignoreDuplicates: true });

  const token = await signJWT(addr);

  const response = NextResponse.json({ token, address: addr });
  response.cookies.set("sb_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24h
    path: "/",
  });

  return response;
}
