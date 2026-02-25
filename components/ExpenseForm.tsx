"use client";

import { useState, useEffect } from "react";
import type { CreateExpensePayload, ExpenseSplit } from "@/types";

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

      setDescription("");
      setSplitAmounts(Object.fromEntries(otherMembers.map((m) => [m, ""])));
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="minimal-card bg-card">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6 border-b border-border pb-2">
        Record_Transaction
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-muted uppercase">Description</label>
          <input
            type="text"
            placeholder="DINNER, HOTEL, TICKETS..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="minimal-input w-full font-mono text-sm"
            disabled={loading}
          />
        </div>

        {/* Per-member splits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-muted uppercase">
              Amounts Owed to You
            </label>
            {otherMembers.length > 1 && total > 0 && (
              <button
                type="button"
                onClick={handleEqualSplit}
                className="text-[10px] font-mono text-muted border border-border px-2 py-1 hover:text-foreground hover:border-foreground transition-colors uppercase tracking-wider"
              >
                [= Split Equally]
              </button>
            )}
          </div>

          {otherMembers.length === 0 ? (
            <p className="text-xs font-mono text-muted border border-dashed border-border p-3">
              // NO_OTHER_MEMBERS — add members first
            </p>
          ) : (
            <ul className="divide-y divide-border border border-border">
              {otherMembers.map((m) => (
                <li key={m} className="flex items-center gap-3 px-4 py-3 bg-background">
                  <span className="flex-1 font-mono text-xs text-muted truncate">
                    {m.slice(0, 6)}...{m.slice(-4)}
                  </span>
                  <span className="text-xs font-mono text-muted shrink-0">OWES:</span>
                  <input
                    type="number"
                    placeholder="0.0000"
                    min="0"
                    step="0.0001"
                    value={splitAmounts[m] ?? ""}
                    onChange={(e) => handleSplitChange(m, e.target.value)}
                    className="minimal-input w-28 font-mono text-sm text-right"
                    disabled={loading}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Running total */}
        <div className="flex items-center justify-between border border-border bg-card px-4 py-3">
          <span className="text-xs font-mono text-muted uppercase tracking-wider">Total</span>
          <span className={`font-mono font-bold text-base ${total > 0 ? "text-foreground" : "text-muted"}`}>
            {total > 0 ? total.toFixed(4) : "0.0000"} ETH
          </span>
        </div>

        {error && (
          <div className="border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-500 font-mono">
            ERROR: {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || total <= 0 || !description.trim()}
          className="btn-primary w-full py-3 text-sm uppercase tracking-widest disabled:opacity-40"
        >
          {loading ? "PROCESSING..." : "ADD_RECORD"}
        </button>
      </form>
    </div>
  );
}
