"use client";

import { useCallback, useState } from "react";
import { useSendTransaction } from "wagmi";
import { usePublicClient } from "wagmi";
import { toUSDCUnits } from "@/lib/usdc";
import type { Transfer } from "@/types";

type SettleStatus = "idle" | "pending" | "confirming" | "recording" | "success" | "error";

interface UseSettleOptions {
  groupId: string;
  onSuccess?: (txHash: string | null) => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * Executes a list of native ETH transfers one-by-one using standard
 * sendTransaction — works with any wallet (MetaMask, Coinbase, etc.).
 * After all txs confirm, records settlements in the DB.
 */
export function useSettle({ groupId, onSuccess, authFetch }: UseSettleOptions) {
  const [status, setStatus] = useState<SettleStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();

  const settle = useCallback(
    async (transfers: Transfer[]) => {
      if (transfers.length === 0) return;

      setStatus("pending");
      setError(null);
      setTxHash(null);

      try {
        let lastHash: string | null = null;

        for (const transfer of transfers) {
          const hash = await sendTransactionAsync({
            to: transfer.to as `0x${string}`,
            value: toUSDCUnits(transfer.amount),
            data: "0x",
          });

          lastHash = hash;
          setTxHash(hash);
          setStatus("confirming");

          // Wait for this tx to confirm before prompting the next one
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash });
          }
        }

        // Record all transfers in DB
        setStatus("recording");
        try {
          await authFetch(`/api/groups/${groupId}/settlements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              group_id: groupId,
              transfers: transfers.map((t) => ({
                paid_by: t.from,
                paid_to: t.to,
                amount: t.amount,
              })),
              tx_hash: lastHash,
            }),
          });
        } catch (err) {
          console.error("Failed to record settlement:", err);
        }

        setStatus("success");
        onSuccess?.(lastHash);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        setError(msg);
        setStatus("error");
      }
    },
    [sendTransactionAsync, publicClient, groupId, authFetch, onSuccess]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return {
    settle,
    reset,
    status,
    error,
    txHash,
    isLoading: ["pending", "confirming", "recording"].includes(status),
    isSuccess: status === "success",
  };
}
