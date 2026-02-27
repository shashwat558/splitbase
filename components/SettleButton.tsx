"use client";

import { useEffect, useState } from "react";
import { useSettle } from "@/hooks/useSettle";
import { useToast } from "@/components/Toast";
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
  const { toast } = useToast();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isSuccess) toast("Payment settled! 🎉", "success");
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="bg-card/50 border border-dashed border-border p-6 text-center rounded-xl">
        <div className="text-2xl mb-2">🎉</div>
        <p className="text-sm font-semibold text-foreground mb-1">All settled up!</p>
        <p className="text-xs text-muted">You don't owe anything in this group.</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-accent/5 border border-accent/30 p-6 space-y-4 rounded-xl">
        <div className="text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-base font-semibold text-accent">Payment complete!</p>
          <p className="text-sm text-muted mt-1">Your debt has been settled onchain.</p>
        </div>
        {txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-accent hover:underline"
          >
            View transaction on BaseScan ↗
          </a>
        )}
        <button
          onClick={reset}
          className="w-full border border-border bg-transparent text-muted hover:text-foreground hover:bg-card py-3 text-sm font-medium rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
          💳 Settle Up
        </h3>
        <p className="text-sm text-muted">
          You owe a total of{" "}
          <span className="text-foreground font-bold font-mono">{formatUSDC(totalOwed)}</span>
        </p>
        {myDebts.length > 1 && (
          <p className="text-xs text-muted mt-1.5 bg-card/50 border border-border px-3 py-2 rounded-lg">
            ℹ️ {myDebts.length} separate payments — your wallet will ask you to confirm each one.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {myDebts.map((debt, i) => (
          <div key={i} className="flex justify-between items-center text-sm border border-border bg-background/50 p-3 rounded-lg gap-3">
            <span className="text-muted text-xs font-mono flex-1 truncate">
              → {debt.to.slice(0, 6)}…{debt.to.slice(-4)}
            </span>
            <span className="font-mono text-red-400 font-bold shrink-0 text-xs">{formatUSDC(debt.amount)}</span>
            <button
              onClick={() => copyPayLink(debt.to, debt.amount, i)}
              className="text-xs text-muted border border-border px-2 py-1 rounded-md hover:border-foreground hover:text-foreground transition-colors shrink-0"
              title="Copy payment link"
            >
              {copiedIdx === i ? "✓ Copied" : "🔗 Link"}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 p-3 border border-red-500/20 rounded-lg flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={() => settle(myDebts)}
        disabled={isLoading}
        className="btn-primary w-full py-3 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "pending"
          ? "⟳ Waiting for signature…"
          : status === "confirming"
          ? "⟳ Confirming transaction…"
          : status === "recording"
          ? "⟳ Recording…"
          : "Pay & Settle Up"}
      </button>
    </div>
  );
}
