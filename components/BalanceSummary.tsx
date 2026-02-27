"use client";

import { useState } from "react";
import { computeNetBalancesWithSettlements, calculateRemainingDebts } from "@/lib/settlement";
import { formatUSDC } from "@/lib/usdc";
import type { Expense, Settlement } from "@/types";

interface Props {
  expenses: Expense[];
  settlements: Settlement[];
  members: string[];
  currentAddress?: string;
  groupId?: string;
}

export function BalanceSummary({ expenses, settlements, members, currentAddress, groupId }: Props) {
  const balances = computeNetBalancesWithSettlements(expenses, settlements, members);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Debts owed TO me (I am the creditor)
  const myReceivables = currentAddress
    ? calculateRemainingDebts(expenses, settlements, members).filter(
        (t) => t.to.toLowerCase() === currentAddress.toLowerCase()
      )
    : [];

  function copyPayLink(from: string, amount: number, idx: number) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${base}/pay?to=${currentAddress}&amount=${amount}&label=Group+Debt${groupId ? `&group=${groupId}` : ""}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  if (balances.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border p-6 text-center rounded-xl">
        <p className="text-sm text-muted">No balance data yet — add some expenses first.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          ⚖️ Who owes what
        </h3>
        <p className="text-xs text-muted mt-0.5">Green = owed money · Red = owes money</p>
      </div>

      <ul className="divide-y divide-border/60">
        {balances.map(({ address, net }) => {
          const isMe = address.toLowerCase() === currentAddress?.toLowerCase();
          const isCreditor = net > 0.004;
          const isDebtor = net < -0.004;

          return (
            <li
              key={address}
              className="flex items-center justify-between px-5 py-3 hover:bg-muted/5 transition-colors"
            >
              <span className={`text-sm ${isMe ? "font-semibold text-foreground" : "text-muted"}`}>
                {isMe ? "You" : `${address.slice(0, 6)}…${address.slice(-4)}`}
                {isMe && " (you)"}
              </span>

              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-sm font-bold ${
                    isCreditor
                      ? "text-accent"
                      : isDebtor
                      ? "text-red-400"
                      : "text-muted"
                  }`}
                >
                  {isCreditor ? "+" : ""}{formatUSDC(net)}
                </span>
                {isCreditor && <span className="text-xs text-accent">← gets back</span>}
                {isDebtor && <span className="text-xs text-red-400">← owes</span>}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pay-request links for creditors */}
      {myReceivables.length > 0 && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">💸 Request payments</p>
            <p className="text-xs text-muted mt-0.5">Copy a link and send it to each person — they can pay in one click.</p>
          </div>
          <ul className="space-y-2">
            {myReceivables.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 bg-background/50 border border-border rounded-lg px-3 py-2">
                <span className="text-xs font-mono text-muted flex-1 truncate">
                  {r.from.slice(0, 6)}…{r.from.slice(-4)}
                </span>
                <span className="text-xs font-mono text-accent font-bold shrink-0">{formatUSDC(r.amount)}</span>
                <button
                  onClick={() => copyPayLink(r.from, r.amount, i)}
                  className="text-xs border border-border px-2 py-1 rounded-md hover:border-accent hover:text-accent transition-colors shrink-0"
                  title="Copy payment request link"
                >
                  {copiedIdx === i ? "✓ Copied!" : "📋 Copy link"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
