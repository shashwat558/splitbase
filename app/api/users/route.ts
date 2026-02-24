import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/** POST /api/users — upsert a user on first wallet connect */
export async function POST(req: NextRequest) {
  const { wallet_address }: { wallet_address: string } = await req.json();

  if (!wallet_address) {
    return NextResponse.json({ error: "wallet_address required" }, { status: 400 });
  }

  const db = createServiceClient();

  const { data, error } = await db
    .from("users")
    .upsert(
      { wallet_address: wallet_address.toLowerCase() },
      { onConflict: "wallet_address", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? { wallet_address: wallet_address.toLowerCase() });
}
