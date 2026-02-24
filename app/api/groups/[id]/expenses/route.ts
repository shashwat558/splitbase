import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { CreateExpensePayload } from "@/types";

/** GET /api/groups/[id]/expenses — list all expenses for a group */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServiceClient();

  const { data, error } = await db
    .from("expenses")
    .select("*")
    .eq("group_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

/** POST /api/groups/[id]/expenses — add a new expense (admin only) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = req.headers.get("x-wallet-address")?.toLowerCase();

  const body: CreateExpensePayload = await req.json();
  const { paid_by, amount, description, splits } = body;

  if (!paid_by || !amount || !description) {
    return NextResponse.json(
      { error: "paid_by, amount, and description are required" },
      { status: 400 }
    );
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
  }

  // Validate splits if provided: amounts must be positive and sum must equal total
  if (splits && splits.length > 0) {
    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    const diff = Math.abs(sum - amount);
    if (diff > 0.01) {
      return NextResponse.json(
        { error: `Split amounts (${sum.toFixed(4)}) must equal total (${amount.toFixed(4)})` },
        { status: 400 }
      );
    }
  }

  const db = createServiceClient();

  // Only the group admin (creator) can add expenses
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
      { error: "Only the trip admin can add expenses" },
      { status: 403 }
    );
  }

  const { data, error } = await db
    .from("expenses")
    .insert({
      group_id: id,
      paid_by: paid_by.toLowerCase(),
      amount,
      description: description.trim(),
      splits: splits && splits.length > 0 ? splits : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

/** DELETE /api/groups/[id]/expenses?expense_id=... — remove an expense (admin only) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = req.headers.get("x-wallet-address")?.toLowerCase();
  const expenseId = req.nextUrl.searchParams.get("expense_id");

  if (!expenseId) {
    return NextResponse.json({ error: "expense_id query param required" }, { status: 400 });
  }

  const db = createServiceClient();

  // Only the group admin (creator) can delete expenses
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
      { error: "Only the trip admin can delete expenses" },
      { status: 403 }
    );
  }

  const { error } = await db
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
