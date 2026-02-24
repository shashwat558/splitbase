import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/** GET /api/groups/[id] — full group detail with members */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  const [groupRes, membersRes] = await Promise.all([
    db.from("groups").select("*").eq("id", id).single(),
    db.from("group_members").select("wallet_address").eq("group_id", id),
  ]);

  if (groupRes.error) {
    return NextResponse.json({ error: groupRes.error.message }, { status: 404 });
  }

  return NextResponse.json({
    ...groupRes.data,
    members: membersRes.data?.map((m) => m.wallet_address) ?? [],
  });
}

/** DELETE /api/groups/[id] — delete a group (creator only, enforced client-side for MVP) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  const { error } = await db.from("groups").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
