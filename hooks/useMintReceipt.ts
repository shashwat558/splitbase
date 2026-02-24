"use client";

import { useState, useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import {
  RECEIPT_CONTRACT_ADDRESS,
  SETTLEMENT_RECEIPT_ABI,
  buildTokenURI,
  type ReceiptMetadata,
} from "@/lib/receiptNFT";

type MintStatus = "idle" | "pending" | "confirming" | "success" | "error";

export function useMintReceipt() {
  const [status, setStatus] = useState<MintStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const mint = useCallback(
    async (meta: ReceiptMetadata, recipients: `0x${string}`[]) => {
      setError(null);
      setStatus("pending");

      try {
        const uri = buildTokenURI(meta);

        const hash = await writeContractAsync({
          address: RECEIPT_CONTRACT_ADDRESS,
          abi: SETTLEMENT_RECEIPT_ABI,
          functionName: "mintReceipt",
          args: [recipients, uri, meta.groupId],
        });

        setTxHash(hash);
        setStatus("confirming");

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        setStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Mint failed");
        setStatus("error");
      }
    },
    [writeContractAsync, publicClient]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return {
    mint,
    reset,
    status,
    error,
    txHash,
    isLoading: status === "pending" || status === "confirming",
    isSuccess: status === "success",
  };
}
