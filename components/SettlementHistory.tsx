"use client";

import type { Settlement } from "@/types";
import { formatUSDC } from "@/lib/usdc";

interface Props {
  settlements: Settlement[];
  currentAddress?: string;
}

export function SettlementHistory({ settlements, currentAddress }: Props) {
  if (settlements.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border p-8 text-center rounded-xl">
        <div className="text-3xl mb-2">🕊️</div>
        <p className="text-sm text-muted">No payments recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          ✅ Payment History
        </h3>
      </div>

      <ul className="divide-y divide-border/60">
        {settlements.map((s) => {
          const isPayer = s.paid_by.toLowerCase() === currentAddress?.toLowerCase();
          const isPayee = s.paid_to.toLowerCase() === currentAddress?.toLowerCase();
          const date = new Date(s.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <li key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/5 transition-colors">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-foreground">
                  <span className={isPayer ? "font-semibold" : "text-muted"}>
                    {isPayer ? "You" : `${s.paid_by.slice(0, 6)}…${s.paid_by.slice(-4)}`}
                  </span>
                  <span className="text-muted mx-2">paid</span>
                  <span className={isPayee ? "font-semibold" : "text-muted"}>
                    {isPayee ? "you" : `${s.paid_to.slice(0, 6)}…${s.paid_to.slice(-4)}`}
                  </span>
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{date}</span>
                  {s.tx_hash && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${s.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline transition-colors"
                    >
                      View on-chain ↗
                    </a>
                  )}
                </div>
              </div>
              <div className="font-mono text-sm font-bold text-accent">
                {formatUSDC(s.amount)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
