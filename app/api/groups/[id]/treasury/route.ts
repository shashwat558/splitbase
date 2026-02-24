import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * POST /api/groups/[id]/treasury
 * Body: { treasury_address: "0x..." }
 * Persists the deployed treasury contract address to the group row.
 * Called by `useDeployTreasury` after the on-chain tx confirms.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { treasury_address } = await req.json();

  if (!treasury_address || !treasury_address.startsWith("0x")) {
    return NextResponse.json({ error: "Invalid treasury_address" }, { status: 400 });
  }

  const db = createServiceClient();

  const { data, error } = await db
    .from("groups")
    .update({ treasury_address: treasury_address.toLowerCase() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 200 });
}
