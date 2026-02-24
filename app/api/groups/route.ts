import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { CreateGroupPayload } from "@/types";

/** GET /api/groups?wallet=0x... — list groups the wallet belongs to */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) {
    return NextResponse.json({ error: "wallet query param required" }, { status: 400 });
  }

  const db = createServiceClient();

  const { data: memberRows, error: mErr } = await db
    .from("group_members")
    .select("group_id")
    .eq("wallet_address", wallet);

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const groupIds = memberRows?.map((r) => r.group_id) ?? [];
  if (groupIds.length === 0) return NextResponse.json([]);

  const { data: groups, error: gErr } = await db
    .from("groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  return NextResponse.json(groups ?? []);
}

/** POST /api/groups — create a group and add initial members */
export async function POST(req: NextRequest) {
  const body: CreateGroupPayload = await req.json();
  const { name, created_by, members } = body;

  if (!name || !created_by || !members?.length) {
    return NextResponse.json({ error: "name, created_by, and members are required" }, { status: 400 });
  }

  const db = createServiceClient();

  // Upsert all member wallets into users table
  const userRows = [...new Set([created_by, ...members].map((m) => m.toLowerCase()))].map(
    (w) => ({ wallet_address: w })
  );
  await db.from("users").upsert(userRows, { onConflict: "wallet_address", ignoreDuplicates: true });

  // Create group
  const { data: group, error: gErr } = await db
    .from("groups")
    .insert({ name: name.trim(), created_by: created_by.toLowerCase() })
    .select()
    .single();

  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  // Add members
  const memberRows = userRows.map((u) => ({
    group_id: group.id,
    wallet_address: u.wallet_address,
  }));

  const { error: mErr } = await db.from("group_members").insert(memberRows);
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  return NextResponse.json(group, { status: 201 });
}
