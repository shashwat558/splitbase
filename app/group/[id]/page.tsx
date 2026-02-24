"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ExpenseForm } from "@/components/ExpenseForm";
import { BalanceSummary } from "@/components/BalanceSummary";
import { SettleButton } from "@/components/SettleButton";
import { SettlementHistory } from "@/components/SettlementHistory";
import { ShareLink } from "@/components/ShareLink";
import { TreasuryPanel } from "@/components/TreasuryPanel";
import { useGroupRealtime } from "@/hooks/useGroupRealtime";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { formatUSDC } from "@/lib/usdc";
import type { Expense, Group, Settlement } from "@/types";

interface GroupDetail extends Group {
  members: string[];
}

export default function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { address, isConnected } = useWallet();
  const { authFetch, isSigning } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMember, setAddMember] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [groupRes, expensesRes, settlementsRes] = await Promise.all([
      fetch(`/api/groups/${id}`),
      fetch(`/api/groups/${id}/expenses`),
      fetch(`/api/groups/${id}/settlements`),
    ]);

    if (groupRes.ok) setGroup(await groupRes.json());
    if (expensesRes.ok) setExpenses(await expensesRes.json());
    if (settlementsRes.ok) setSettlements(await settlementsRes.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live updates — fires fetchData whenever any change lands in Supabase
  useGroupRealtime(id, fetchData);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberError(null);
    const wallet = addMember.trim().toLowerCase();
    if (!wallet.startsWith("0x") || wallet.length !== 42) {
      setMemberError("Invalid wallet address");
      return;
    }

    setAddingMember(true);
    try {
      const res = await authFetch(`/api/groups/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add member");
      }
      setAddMember("");
      fetchData();
    } catch (err) {
      setMemberError((err as Error).message);
    } finally {
      setAddingMember(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    await authFetch(
      `/api/groups/${id}/expenses?expense_id=${expenseId}`,
      { method: "DELETE" }
    );
    fetchData();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-1/3 bg-card" />
            <div className="h-5 w-1/4 bg-card" />
          </div>
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-base text-red-500 font-mono mb-6">ERROR: GROUP_NOT_FOUND</p>
          <Link href="/dashboard" className="btn-primary px-6 py-3 text-sm uppercase tracking-widest">
            ← RETURN_DASHBOARD
          </Link>
        </main>
      </div>
    );
  }

  const members = (group.members ?? []).map((m) => m.toLowerCase());
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const isMember = address ? members.includes(address.toLowerCase()) : false;
  const isAdmin = address
    ? group.created_by?.toLowerCase() === address.toLowerCase()
    : false;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20 transition-colors duration-300">
      <Header />

      {isSigning && (
        <div className="bg-card border-b border-border px-6 py-3 text-center text-sm font-mono text-muted">
          <span className="animate-pulse mr-2">●</span> WAITING_FOR_SIGNATURE...
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {/* Breadcrumb + Header */}
        <div className="mb-12 border-b border-border pb-8">
          <div className="flex items-center gap-3 text-xs font-mono text-muted mb-4 uppercase tracking-widest">
            <Link href="/dashboard" className="hover:text-foreground transition-colors underline decoration-dotted">
              DASHBOARD
            </Link>
            <span>/</span>
            <span>GROUP: {group.id.slice(0, 6)}...</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-bold tracking-tighter text-foreground uppercase">
                  {group.name}
                </h1>
                {isAdmin && (
                  <span className="border border-border text-xs font-mono px-3 py-1 text-muted bg-card font-bold">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-sm font-mono text-muted">
                MEMBERS: {members.length} // EXPENSES: {expenses.length} // TOTAL: {formatUSDC(totalExpenses)}
                <span className="ml-4 inline-flex items-center gap-1.5 text-xs text-accent">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  LIVE
                </span>
              </p>
            </div>
            <ShareLink groupId={id} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Expenses & History */}
          <div className="lg:col-span-2 space-y-10">
            {/* Expense List */}
            <div className="minimal-card bg-card p-6">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6 border-b border-border pb-2">
                Expenses
              </h3>
              {expenses.length === 0 ? (
                <p className="text-sm font-mono text-muted py-4">NO_EXPENSES_YET — add one as admin</p>
              ) : (
                <ul className="space-y-3">
                  {expenses.map((exp) => {
                    const date = new Date(exp.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    return (
                      <li key={exp.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{exp.description}</p>
                          <p className="text-xs font-mono text-muted mt-1">
                            PAID_BY:{" "}
                            {exp.paid_by.toLowerCase() === address?.toLowerCase()
                              ? "YOU"
                              : `${exp.paid_by.slice(0, 6)}…${exp.paid_by.slice(-4)}`}
                            {" "}//{" "}{date}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-foreground font-mono">
                            {formatUSDC(exp.amount)}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-xs text-muted hover:text-red-500 transition-colors font-mono"
                              title="Delete expense"
                            >
                              [DEL]
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <SettlementHistory settlements={settlements} currentAddress={address ?? undefined} />
          </div>

          {/* Right: Actions & Members */}
          <div className="space-y-10">
            {/* Add Expense (admin only) */}
            {address && isAdmin && (
              <ExpenseForm
                groupId={id}
                paidBy={address}
                members={members}
                authFetch={authFetch}
                onCreated={fetchData}
              />
            )}

            {/* Balance Summary */}
            <BalanceSummary
              expenses={expenses}
              settlements={settlements}
              members={members}
              currentAddress={address ?? undefined}
            />

            {/* Settle */}
            {address && isMember && (
              <SettleButton
                groupId={id}
                expenses={expenses}
                settlements={settlements}
                members={members}
                currentAddress={address}
                authFetch={authFetch}
                onSettled={fetchData}
              />
            )}

            {/* Treasury */}
            {address && isMember && (
              <TreasuryPanel
                groupId={id}
                treasuryAddress={group.treasury_address}
                members={members}
                expenses={expenses}
                settlements={settlements}
                currentAddress={address}
                isAdmin={isAdmin}
                authFetch={authFetch}
                onRefresh={fetchData}
              />
            )}

            {/* Members */}
            <div className="minimal-card bg-card p-6">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6 border-b border-border pb-2">
                Group_Members
              </h3>
              <ul className="mb-6 space-y-3">
                {members.map((m) => {
                  const isYou = m.toLowerCase() === address?.toLowerCase();
                  const isMemberAdmin = m.toLowerCase() === group.created_by?.toLowerCase();
                  return (
                    <li
                      key={m}
                      className="flex items-center justify-between text-xs font-mono text-muted border-b border-border pb-2 last:border-0"
                    >
                      <span className={isYou ? "text-foreground font-bold" : ""}>
                        {isYou ? `${m} (YOU)` : m}
                      </span>
                      {isMemberAdmin && (
                        <span className="text-muted uppercase tracking-wider font-bold">[ADMIN]</span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {isAdmin && (
                <div className="pt-4 border-t border-border">
                  <form onSubmit={handleAddMember} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="0x...ADDR"
                      value={addMember}
                      onChange={(e) => setAddMember(e.target.value)}
                      className="minimal-input w-full font-mono text-xs"
                    />
                    <button
                      type="submit"
                      disabled={addingMember}
                      className="btn-primary px-4 py-2 text-xs uppercase font-mono font-bold"
                    >
                      {addingMember ? "..." : "ADD"}
                    </button>
                  </form>
                  {memberError && (
                    <p className="mt-3 text-xs text-red-500 font-mono border-l-2 border-red-500 pl-3">
                      {memberError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
