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
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { useGroupRealtime } from "@/hooks/useGroupRealtime";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
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
  const { authFetch, isSigning } = useAuth();  const { toast } = useToast();  const router = useRouter();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMember, setAddMember] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");

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
      toast("Member added! 👥", "success");
    } catch (err) {
      setMemberError((err as Error).message);
      toast((err as Error).message, "error");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      await authFetch(
        `/api/groups/${id}/expenses?expense_id=${expenseId}`,
        { method: "DELETE" }
      );
      fetchData();
      toast("Expense removed", "info");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-24 bg-card rounded-lg" />
            <div className="h-9 w-1/3 bg-card rounded-lg" />
            <div className="h-4 w-1/2 bg-card rounded-lg" />
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-48 bg-card rounded-xl" />
                <div className="h-32 bg-card rounded-xl" />
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-card rounded-xl" />
                <div className="h-32 bg-card rounded-xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <div className="text-5xl mb-6">🔍</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Group not found</h2>
          <p className="text-sm text-muted mb-8">
            This group doesn&apos;t exist or you may not have access to it.
          </p>
          <Link href="/dashboard" className="btn-primary px-6 py-3 text-sm font-semibold rounded-lg inline-flex items-center gap-2">
            ← Back to Dashboard
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
        <div className="bg-accent/5 border-b border-accent/20 px-6 py-3 text-center text-sm text-accent font-medium flex items-center justify-center gap-2">
          <span className="animate-spin-slow inline-block">⟳</span>
          Waiting for your wallet signature…
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Breadcrumb + Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted mb-4">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span className="text-border">›</span>
            <span className="text-foreground font-medium">{group.name}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-2xl font-bold text-foreground">
                  {group.name}
                </h1>
                {isAdmin && (
                  <span className="bg-accent/10 border border-accent/30 text-accent text-xs px-2.5 py-1 rounded-full font-semibold">
                    Admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted">
                <span>{members.length} members</span>
                <span>{expenses.length} expenses</span>
                <span>{formatUSDC(totalExpenses)} total</span>
                <span className="inline-flex items-center gap-1.5 text-accent text-xs">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Live
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Tab Toggle */}
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "overview"
                      ? "bg-foreground text-background font-semibold"
                      : "bg-card text-muted hover:text-foreground"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "analytics"
                      ? "bg-foreground text-background font-semibold"
                      : "bg-card text-muted hover:text-foreground"
                  }`}
                >
                  Analytics
                </button>
              </div>
              <ShareLink groupId={id} />
            </div>
          </div>
        </div>

        {/* ── Analytics Tab ── */}
        {activeTab === "analytics" && (
          <AnalyticsDashboard
            expenses={expenses}
            settlements={settlements}
            members={members}
            currentAddress={address ?? undefined}
          />
        )}

        {/* ── Overview Tab ── */}
        <div className={activeTab === "overview" ? "grid grid-cols-1 lg:grid-cols-3 gap-8" : "hidden"}>
          {/* Left: Expenses & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expense List */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">
                Expenses
              </h3>
              {expenses.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border rounded-lg">
                  <p className="text-sm text-muted">
                    No expenses yet.{isAdmin ? " Add the first one using the form →" : " The admin will add expenses here."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {expenses.map((exp) => {
                    const date = new Date(exp.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    return (
                      <li key={exp.id} className="flex items-center justify-between py-3 border-b border-border/60 last:border-0 group">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{exp.description}</p>
                          <p className="text-xs text-muted mt-0.5">
                            Paid by{" "}
                            <span className="font-medium">
                              {exp.paid_by.toLowerCase() === address?.toLowerCase()
                                ? "you"
                                : `${exp.paid_by.slice(0, 6)}…${exp.paid_by.slice(-4)}`}
                            </span>
                            {" · "}{date}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-foreground font-mono">
                            {formatUSDC(exp.amount)}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-xs text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 px-1"
                              title="Delete expense"
                            >
                              ×
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
          <div className="space-y-6">
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
              groupId={id}
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
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                Members
                <span className="text-xs text-muted font-normal">{members.length} people</span>
              </h3>
              <ul className="mb-4 space-y-2">
                {members.map((m) => {
                  const isYou = m.toLowerCase() === address?.toLowerCase();
                  const isMemberAdmin = m.toLowerCase() === group.created_by?.toLowerCase();
                  return (
                    <li
                      key={m}
                      className="flex items-center justify-between text-sm py-2 border-b border-border/60 last:border-0"
                    >
                      <span className={`font-mono text-xs ${isYou ? "text-foreground font-semibold" : "text-muted"}`}>
                        {isYou ? "You" : `${m.slice(0, 6)}…${m.slice(-4)}`}
                        {isYou && " (you)"}
                      </span>
                      <div className="flex items-center gap-2">
                        {isMemberAdmin && (
                          <span className="text-xs bg-accent/10 border border-accent/30 text-accent px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {isAdmin && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted mb-3">Add a member by their wallet address:</p>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x... wallet address"
                      value={addMember}
                      onChange={(e) => setAddMember(e.target.value)}
                      className="minimal-input w-full text-xs rounded-lg font-mono"
                    />
                    <button
                      type="submit"
                      disabled={addingMember}
                      className="btn-primary px-3 py-2 text-xs font-semibold rounded-lg shrink-0 disabled:opacity-50"
                    >
                      {addingMember ? "…" : "Add"}
                    </button>
                  </form>
                  {memberError && (
                    <p className="mt-3 text-xs text-red-400 flex items-start gap-1.5">
                      <span>⚠️</span>
                      <span>{memberError}</span>
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

