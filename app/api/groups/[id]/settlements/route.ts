import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { CreateSettlementPayload } from "@/types";

/**
 * GET /api/groups/[id]/settlements — list all settlements for a group
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  const { data, error } = await db
    .from("settlements")
    .select("*")
    .eq("group_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/groups/[id]/settlements — record settlements after on-chain tx confirms
 * Body: { transfers: [{paid_by, paid_to, amount}], tx_hash }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body: CreateSettlementPayload = await req.json();
  const { transfers, tx_hash } = body;

  if (!transfers?.length) {
    return NextResponse.json({ error: "transfers array required" }, { status: 400 });
  }

  const db = createServiceClient();

  // Upsert all wallets involved as users
  const wallets = [
    ...new Set(transfers.flatMap((t) => [t.paid_by.toLowerCase(), t.paid_to.toLowerCase()])),
  ].map((w) => ({ wallet_address: w }));
  await db.from("users").upsert(wallets, { onConflict: "wallet_address", ignoreDuplicates: true });

  const rows = transfers.map((t) => ({
    group_id: id,
    paid_by: t.paid_by.toLowerCase(),
    paid_to: t.paid_to.toLowerCase(),
    amount: t.amount,
    tx_hash: tx_hash ?? null,
  }));

  const { data, error } = await db
    .from("settlements")
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
