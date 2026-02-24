import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/** GET /api/groups/[id]/members — list members of a group */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  const { data, error } = await db
    .from("group_members")
    .select("wallet_address")
    .eq("group_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data?.map((r) => r.wallet_address) ?? []);
}

/** POST /api/groups/[id]/members — add a member to a group (admin only) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = req.headers.get("x-wallet-address")?.toLowerCase();
  const { wallet_address }: { wallet_address: string } = await req.json();

  if (!wallet_address) {
    return NextResponse.json({ error: "wallet_address is required" }, { status: 400 });
  }

  const db = createServiceClient();
  const wallet = wallet_address.toLowerCase();

  // Only the group admin (creator) can add members
  const { data: group, error: groupErr } = await db
    .from("groups")
    .select("created_by")
    .eq("id", id)
    .single();

  if (groupErr || !group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (caller !== group.created_by.toLowerCase()) {
    return NextResponse.json(
      { error: "Only the trip admin can add members" },
      { status: 403 }
    );
  }

  // Upsert user
  await db
    .from("users")
    .upsert({ wallet_address: wallet }, { onConflict: "wallet_address", ignoreDuplicates: true });

  const { error } = await db
    .from("group_members")
    .insert({ group_id: id, wallet_address: wallet });

  if (error) {
    // 23505 = unique violation (already a member)
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
