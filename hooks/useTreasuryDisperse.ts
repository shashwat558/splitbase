"use client";

import { useCallback, useState } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { GROUP_TREASURY_ABI } from "@/lib/treasury";
import { toUSDCUnits } from "@/lib/usdc";
import type { Transfer } from "@/types";

type Status = "idle" | "pending" | "confirming" | "recording" | "success" | "error";

interface UseTreasuryDisperseOptions {
  groupId: string;
  treasuryAddress: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onDispersed?: () => void;
}

/**
 * Admin calls `disperse(recipients[], amounts[])` on the GroupTreasury,
 * then records the result as settlements in the DB.
 */
export function useTreasuryDisperse({
  groupId,
  treasuryAddress,
  authFetch,
  onDispersed,
}: UseTreasuryDisperseOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  /**
   * @param transfers  The creditor-side transfers: from = treasury, to = creditor.
   *                   Built from the settlement engine by the caller.
   */
  const disperse = useCallback(
    async (transfers: Transfer[]) => {
      if (transfers.length === 0) return;

      setStatus("pending");
      setError(null);
      setTxHash(null);

      try {
        const recipients = transfers.map((t) => t.to as `0x${string}`);
        const amounts    = transfers.map((t) => toUSDCUnits(t.amount));

        const hash = await writeContractAsync({
          address: treasuryAddress as `0x${string}`,
          abi: GROUP_TREASURY_ABI,
          functionName: "disperse",
          args: [recipients, amounts],
        });

        setTxHash(hash);
        setStatus("confirming");

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        // Record as settlements in DB (paid_by = treasury address, paid_to = each creditor)
        setStatus("recording");
        try {
          await authFetch(`/api/groups/${groupId}/settlements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              group_id: groupId,
              transfers: transfers.map((t) => ({
                paid_by: treasuryAddress.toLowerCase(),
                paid_to: t.to.toLowerCase(),
                amount: t.amount,
              })),
              tx_hash: hash,
            }),
          });
        } catch (err) {
          console.error("Failed to record disperse:", err);
        }

        setStatus("success");
        onDispersed?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Disperse failed";
        setError(msg);
        setStatus("error");
      }
    },
    [writeContractAsync, publicClient, treasuryAddress, groupId, authFetch, onDispersed]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { disperse, reset, status, error, txHash };
}
