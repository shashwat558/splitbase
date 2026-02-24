"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSendTransaction } from "wagmi";
import { usePublicClient } from "wagmi";
import { Header } from "@/components/Header";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { toUSDCUnits, formatUSDC } from "@/lib/usdc";

type PayStatus = "idle" | "pending" | "confirming" | "recording" | "success" | "error";

function PayPageInner() {
  const params = useSearchParams();
  const to = params.get("to") ?? "";
  const amount = parseFloat(params.get("amount") ?? "0");
  const label = params.get("label") ?? "Payment";
  const groupId = params.get("group") ?? "";

  const { address, isConnected } = useWallet();
  const { authFetch } = useAuth();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<PayStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = to.startsWith("0x") && to.length === 42 && amount > 0;
  const isPayingSelf = address?.toLowerCase() === to.toLowerCase();

  async function handlePay() {
    if (!isValid || !address) return;
    setError(null);
    setStatus("pending");

    try {
      const hash = await sendTransactionAsync({
        to: to as `0x${string}`,
        value: toUSDCUnits(amount),
        data: "0x",
      });

      setTxHash(hash);
      setStatus("confirming");

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      // Record settlement in DB if this belongs to a group
      if (groupId) {
        setStatus("recording");
        try {
          await authFetch(`/api/groups/${groupId}/settlements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              group_id: groupId,
              transfers: [{ paid_by: address, paid_to: to, amount }],
              tx_hash: hash,
            }),
          });
        } catch (err) {
          console.error("Failed to record settlement:", err);
        }
      }

      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
        <Header />
        <main className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="font-mono text-red-500 text-sm mb-6">ERROR: INVALID_PAY_LINK</p>
          <p className="font-mono text-muted text-xs mb-8">
            This link is missing a valid recipient address or amount.
          </p>
          <Link href="/" className="btn-primary px-6 py-3 text-sm uppercase tracking-widest">
            ← HOME
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      <Header />
      <main className="mx-auto max-w-lg px-6 py-16">
        {/* Title */}
        <div className="mb-10 border-b border-border pb-8">
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
            // PAYMENT_REQUEST
          </p>
          <h1 className="text-3xl font-bold tracking-tighter text-foreground uppercase mb-2">
            {label}
          </h1>
          <p className="text-sm font-mono text-muted">
            Settle a payment on Base Sepolia
          </p>
        </div>

        {/* Payment details card */}
        <div className="minimal-card bg-card p-6 space-y-4 mb-8">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <span className="text-xs font-mono text-muted uppercase">Amount</span>
            <span className="text-2xl font-bold font-mono text-foreground">{formatUSDC(amount)}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-muted uppercase shrink-0">To</span>
            <span className="text-xs font-mono text-foreground text-right break-all ml-4">{to}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted uppercase">For</span>
            <span className="text-sm font-mono text-foreground">{label}</span>
          </div>

          {groupId && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-muted uppercase">Group</span>
              <span className="text-xs font-mono text-muted">{groupId.slice(0, 8)}...</span>
            </div>
          )}
        </div>

        {/* Status / Action */}
        {status === "success" ? (
          <div className="minimal-card bg-card p-6 space-y-4 text-center border-accent">
            <p className="text-sm font-bold font-mono text-accent uppercase tracking-widest">
              // PAYMENT_COMPLETE ✓
            </p>
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs font-mono text-accent underline hover:text-foreground transition-colors"
              >
                VIEW_ON_BASESCAN →
              </a>
            )}
            {groupId && (
              <Link
                href={`/group/${groupId}`}
                className="block text-xs font-mono text-muted underline hover:text-foreground transition-colors mt-2"
              >
                BACK_TO_GROUP →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {isPayingSelf && (
              <p className="text-xs font-mono text-red-500 border-l-2 border-red-500 pl-3">
                // WARN: recipient is your own address
              </p>
            )}

            {!isConnected && (
              <p className="text-xs font-mono text-muted border-l-2 border-border pl-3">
                // Connect your wallet above to pay
              </p>
            )}

            {error && (
              <div className="border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-500 font-mono">
                ERR: {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={!isConnected || !isValid || isPayingSelf || ["pending", "confirming", "recording"].includes(status)}
              className="btn-primary w-full py-4 text-sm uppercase tracking-widest disabled:opacity-40"
            >
              {status === "pending"
                ? "WAITING_FOR_SIGNATURE..."
                : status === "confirming"
                ? "CONFIRMING_TX..."
                : status === "recording"
                ? "RECORDING..."
                : `PAY ${formatUSDC(amount)}`}
            </button>

            <p className="text-center text-xs font-mono text-muted">
              Transaction on Base Sepolia testnet
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap in Suspense because useSearchParams requires it in Next.js 15
export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground font-sans">
          <div className="flex items-center justify-center h-screen">
            <p className="font-mono text-muted animate-pulse text-sm">LOADING_PAYMENT...</p>
          </div>
        </div>
      }
    >
      <PayPageInner />
    </Suspense>
  );
}
