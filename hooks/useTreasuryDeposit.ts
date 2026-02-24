"use client";

import { useCallback, useState } from "react";
import { useSendTransaction, usePublicClient } from "wagmi";
import { GROUP_TREASURY_ABI } from "@/lib/treasury";
import { toUSDCUnits } from "@/lib/usdc";
import { encodeFunctionData } from "viem";

type Status = "idle" | "pending" | "confirming" | "success" | "error";

interface UseTreasuryDepositOptions {
  treasuryAddress: string;
  onDeposited?: (txHash: string) => void;
}

/**
 * Sends ETH into the group treasury using a standard ETH transfer
 * with encoded `deposit()` calldata. Works with any wallet.
 */
export function useTreasuryDeposit({
  treasuryAddress,
  onDeposited,
}: UseTreasuryDepositOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient();

  const deposit = useCallback(
    async (amountEth: number) => {
      if (amountEth <= 0) return;

      setStatus("pending");
      setError(null);
      setTxHash(null);

      try {
        const calldata = encodeFunctionData({
          abi: GROUP_TREASURY_ABI,
          functionName: "deposit",
          args: [],
        });

        const hash = await sendTransactionAsync({
          to: treasuryAddress as `0x${string}`,
          value: toUSDCUnits(amountEth),
          data: calldata,
        });

        setTxHash(hash);
        setStatus("confirming");

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        setStatus("success");
        onDeposited?.(hash);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Deposit failed";
        setError(msg);
        setStatus("error");
      }
    },
    [sendTransactionAsync, publicClient, treasuryAddress, onDeposited]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { deposit, reset, status, error, txHash };
}
