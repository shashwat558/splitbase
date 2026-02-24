"use client";

import { computeNetBalancesWithSettlements } from "@/lib/settlement";
import { formatUSDC } from "@/lib/usdc";
import type { Expense, Settlement } from "@/types";

interface Props {
  expenses: Expense[];
  settlements: Settlement[];
  members: string[];
  currentAddress?: string;
}

export function BalanceSummary({ expenses, settlements, members, currentAddress }: Props) {
  const balances = computeNetBalancesWithSettlements(expenses, settlements, members);

  if (balances.length === 0) {
    return (
      <div className="minimal-card border-dashed p-6 text-sm font-mono text-muted text-center bg-card/50">
        NO_DATA // WAITING_FOR_MEMBERS
      </div>
    );
  }

  return (
    <div className="minimal-card bg-card p-0 overflow-hidden">
      <div className="border-b border-border px-6 py-4 bg-muted/5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Net_Positions</h3>
      </div>

      <ul className="divide-y divide-border">
        {balances.map(({ address, net }) => {
          const isMe = address.toLowerCase() === currentAddress?.toLowerCase();
          const isCreditor = net > 0.004;
          const isDebtor = net < -0.004;

          return (
            <li
              key={address}
              className="flex items-center justify-between px-6 py-4 hover:bg-muted/5 transition-colors"
            >
              <span className="font-mono text-sm text-muted">
                {isMe ? "YOU" : `${address.slice(0, 6)}...${address.slice(-4)}`}
              </span>

              <span
                className={
                  isCreditor
                    ? "font-mono text-base font-bold text-accent"
                    : isDebtor
                    ? "font-mono text-base font-bold text-red-500"
                    : "font-mono text-base text-muted"
                }
              >
                {isCreditor ? "+" : ""}{formatUSDC(net)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
