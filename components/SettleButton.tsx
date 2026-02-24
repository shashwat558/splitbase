"use client";

import { useState } from "react";
import { useSettle } from "@/hooks/useSettle";
import { calculateRemainingDebts } from "@/lib/settlement";
import { formatUSDC } from "@/lib/usdc";
import type { Expense, Settlement } from "@/types";

interface Props {
  groupId: string;
  expenses: Expense[];
  settlements: Settlement[];
  members: string[];
  currentAddress: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onSettled?: () => void;
}

export function SettleButton({
  groupId,
  expenses,
  settlements,
  members,
  currentAddress,
  authFetch,
  onSettled,
}: Props) {
  const { settle, status, error, txHash, isLoading, isSuccess, reset } =
    useSettle({ groupId, authFetch, onSuccess: onSettled });

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copyPayLink(to: string, amount: number, idx: number) {
    const url = `${window.location.origin}/pay?to=${to}&amount=${amount}&label=Group+Debt&group=${groupId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  const myDebts = calculateRemainingDebts(expenses, settlements, members).filter(
    (t) => t.from.toLowerCase() === currentAddress.toLowerCase()
  );

  const totalOwed = myDebts.reduce((sum, t) => sum + t.amount, 0);

  if (myDebts.length === 0) {
    return (
      <div className="minimal-card p-6 text-center border-dashed bg-card/50">
        <p className="text-sm font-mono text-muted uppercase tracking-wide">
             // STATUS: SETTLED
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="minimal-card border-accent bg-accent/5 p-6 space-y-4">
        <p className="text-sm font-mono text-accent uppercase tracking-wide font-bold">
            // SETTLEMENT_COMPLETE
        </p>
        {txHash && (
            <div className="mb-4">
                <a
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-accent underline hover:text-foreground transition-colors"
                >
                    VIEW_ON_ETHERSCAN -
                </a>
            </div>
        )}
        <button
          onClick={reset}
          className="w-full border border-accent text-accent hover:bg-accent hover:text-background py-3 text-sm font-mono uppercase transition-colors tracking-widest font-bold"
        >
          CLOSE_PANEL
        </button>
      </div>
    );
  }

  return (
    <div className="minimal-card bg-card p-6 space-y-6">
      <div className="border-b border-border pb-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-2">Outstanding</h3>
        <p className="text-sm font-mono text-muted">
            TOTAL_DEBT: <span className="text-foreground font-bold text-lg ml-2">{formatUSDC(totalOwed)}</span>
        </p>
        {myDebts.length > 1 && (
          <p className="text-xs font-mono text-muted mt-2 border-l-2 border-border pl-2">
            // {myDebts.length} transfers — wallet will prompt once per recipient
          </p>
        )}
      </div>

      <div className="space-y-3">
        {myDebts.map((debt, i) => (
          <div key={i} className="flex justify-between items-center text-sm border border-border bg-background p-4 rounded-sm gap-3">
            <span className="font-mono text-muted flex-1">To: {debt.to.slice(0, 6)}...{debt.to.slice(-4)}</span>
            <span className="font-mono text-red-500 font-bold shrink-0">{formatUSDC(debt.amount)}</span>
            <button
              onClick={() => copyPayLink(debt.to, debt.amount, i)}
              className="text-[10px] font-mono text-muted border border-border px-2 py-1 hover:border-foreground hover:text-foreground transition-colors uppercase tracking-wider shrink-0"
              title="Copy payment link"
            >
              {copiedIdx === i ? "COPIED!" : "[LINK]"}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 text-xs text-red-500 bg-red-500/10 p-3 border border-red-500/20 font-mono">
          ERR: {error}
        </div>
      )}

      <button
        onClick={() => settle(myDebts)}
        disabled={isLoading}
        className="btn-primary w-full py-4 text-sm uppercase tracking-widest mt-2"
      >
        {status === "pending" ? "WAITING_FOR_SIGNATURE..." : status === "confirming" ? "CONFIRMING_TX..." : status === "recording" ? "RECORDING..." : "SETTLE_DEBTS"}
      </button>
    </div>
  );
}
