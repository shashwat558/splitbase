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
      <div className="minimal-card border-dashed p-8 text-center bg-card/50">
        <p className="text-sm font-mono text-muted uppercase tracking-wide">
             // NO_SETTLEMENTS_FOUND
        </p>
      </div>
    );
  }

  return (
    <div className="minimal-card bg-card p-0 overflow-hidden">
      <div className="border-b border-border px-6 py-4 bg-muted/5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Settlement_Log</h3>
      </div>

      <ul className="divide-y divide-border">
        {settlements.map((s) => {
          const isPayer = s.paid_by.toLowerCase() === currentAddress?.toLowerCase();
          const isPayee = s.paid_to.toLowerCase() === currentAddress?.toLowerCase();
          const date = new Date(s.created_at).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
          });

          return (
            <li key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/5 transition-colors">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-mono text-muted">
                  <span className={isPayer ? "text-foreground font-bold" : "text-muted"}>
                    {isPayer ? "You" : `${s.paid_by.slice(0, 6)}...${s.paid_by.slice(-4)}`}
                  </span>
                  <span className="text-muted mx-3 font-light">{"->"}</span>
                  <span className={isPayee ? "text-foreground font-bold" : "text-muted"}>
                    {isPayee ? "You" : `${s.paid_to.slice(0, 6)}...${s.paid_to.slice(-4)}`}
                  </span>
                </p>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted font-mono">{date}</span>
                    {s.tx_hash && (
                        <a
                        href={`https://sepolia.basescan.org/tx/${s.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-muted hover:text-accent underline transition-colors"
                        >
                        TX_HASH
                        </a>
                    )}
                </div>
              </div>
              <div className="font-mono text-base font-bold text-accent">
                {formatUSDC(s.amount)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
