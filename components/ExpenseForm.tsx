"use client";

import { useState, useEffect } from "react";
import type { CreateExpensePayload, ExpenseSplit } from "@/types";
import { useToast } from "@/components/Toast";

interface Props {
  groupId: string;
  paidBy: string;
  members: string[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onCreated: () => void;
}

export function ExpenseForm({ groupId, paidBy, members, authFetch, onCreated }: Props) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const otherMembers = members.filter((m) => m.toLowerCase() !== paidBy.toLowerCase());

  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(otherMembers.map((m) => [m, ""]))
  );

  useEffect(() => {
    setSplitAmounts((prev) =>
      Object.fromEntries(otherMembers.map((m) => [m, prev[m] ?? ""]))
    );
  }, [members.join(","), paidBy]);

  const total = otherMembers.reduce((sum, m) => {
    const v = parseFloat(splitAmounts[m] || "0");
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  function handleSplitChange(member: string, value: string) {
    setSplitAmounts((prev) => ({ ...prev, [member]: value }));
  }

  function handleEqualSplit() {
    if (otherMembers.length === 0 || total <= 0) return;
    const share = (total / otherMembers.length).toFixed(4);
    setSplitAmounts(Object.fromEntries(otherMembers.map((m) => [m, share])));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) { setError("Description is required."); return; }
    if (total <= 0) { setError("Enter at least one non-zero amount."); return; }

    const splits: ExpenseSplit[] = otherMembers
      .map((m) => ({ wallet_address: m, amount: parseFloat(splitAmounts[m] || "0") }))
      .filter((s) => s.amount > 0);

    setLoading(true);
    try {
      const payload: CreateExpensePayload = {
        group_id: groupId,
        paid_by: paidBy,
        amount: total,
        description: description.trim(),
        splits,
      };

      const res = await authFetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add expense");
      }

      toast("Expense added! 🧾", "success");
      setDescription("");
      setSplitAmounts(Object.fromEntries(otherMembers.map((m) => [m, ""])));
      onCreated();
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
        ➕ Add Expense
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">What was this for?</label>
          <input
            type="text"
            placeholder="e.g. Dinner, Hotel, Taxi, Groceries…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="minimal-input w-full rounded-lg text-sm"
            disabled={loading}
          />
        </div>

        {/* Per-member splits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              How much does each person owe?
            </label>
            {otherMembers.length > 1 && total > 0 && (
              <button
                type="button"
                onClick={handleEqualSplit}
                className="text-xs text-accent border border-accent/30 bg-accent/5 px-2.5 py-1 rounded-md hover:bg-accent/10 transition-colors"
              >
                ÷ Split equally
              </button>
            )}
          </div>

          {otherMembers.length === 0 ? (
            <div className="text-sm text-muted bg-card/50 border border-dashed border-border p-4 rounded-lg text-center">
              Add members to the group first, then you can split expenses between them.
            </div>
          ) : (
            <ul className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden">
              {otherMembers.map((m) => (
                <li key={m} className="flex items-center gap-3 px-4 py-3 bg-background/50">
                  <span className="flex-1 font-mono text-xs text-muted truncate">
                    {m.slice(0, 6)}…{m.slice(-4)}
                  </span>
                  <span className="text-xs text-muted shrink-0">owes</span>
                  <input
                    type="number"
                    placeholder="0.0000"
                    min="0"
                    step="0.0001"
                    value={splitAmounts[m] ?? ""}
                    onChange={(e) => handleSplitChange(m, e.target.value)}
                    className="minimal-input w-28 font-mono text-sm text-right rounded-md"
                    disabled={loading}
                  />
                  <span className="text-xs text-muted shrink-0">USDC</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Running total */}
        {total > 0 && (
          <div className="flex items-center justify-between bg-accent/5 border border-accent/20 px-4 py-3 rounded-lg">
            <span className="text-sm text-accent font-medium">Total expense</span>
            <span className="font-bold text-base text-accent font-mono">
              {total.toFixed(4)} USDC
            </span>
          </div>
        )}

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 rounded-lg flex items-start gap-2">
            <span className="shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || total <= 0 || !description.trim()}
          className="btn-primary w-full py-3 text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Adding…" : "Add Expense"}
        </button>
      </form>
    </div>
  );
}
