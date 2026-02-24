"use client";

import { useCallback, useState } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { TREASURY_FACTORY_ABI, TREASURY_FACTORY_ADDRESS } from "@/lib/treasury";

type Status = "idle" | "pending" | "confirming" | "success" | "error";

interface UseDeployTreasuryOptions {
  /** DB group id (UUID string) */
  groupId: string;
  /** Admin wallet — will be stored on-chain as the only address allowed to disperse */
  adminAddress: string;
  /** Called with the newly deployed treasury address once the tx confirms */
  onDeployed: (treasuryAddress: string) => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * Deploys a new GroupTreasury via the factory contract, then persists
 * the treasury address to the DB via PATCH /api/groups/[id]/treasury.
 */
export function useDeployTreasury({
  groupId,
  adminAddress,
  onDeployed,
  authFetch,
}: UseDeployTreasuryOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const deploy = useCallback(async () => {
    if (!TREASURY_FACTORY_ADDRESS) {
      setError("TREASURY_FACTORY_ADDRESS not configured in .env");
      setStatus("error");
      return;
    }

    setStatus("pending");
    setError(null);
    setTxHash(null);

    try {
      const hash = await writeContractAsync({
        address: TREASURY_FACTORY_ADDRESS,
        abi: TREASURY_FACTORY_ABI,
        functionName: "deployTreasury",
        args: [adminAddress as `0x${string}`, groupId],
      });

      setTxHash(hash);
      setStatus("confirming");

      if (!publicClient) throw new Error("No public client");

      await publicClient.waitForTransactionReceipt({ hash });

      // After deployment, read the deployed address from the factory's mapping.
      const treasuryAddress = await publicClient.readContract({
        address: TREASURY_FACTORY_ADDRESS,
        abi: TREASURY_FACTORY_ABI,
        functionName: "getTreasury",
        args: [groupId],
      }) as string;

      if (!treasuryAddress || treasuryAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("Treasury not found in factory after deployment");
      }

      // Persist to DB
      await authFetch(`/api/groups/${groupId}/treasury`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treasury_address: treasuryAddress }),
      });

      setStatus("success");
      onDeployed(treasuryAddress);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deployment failed";
      setError(msg);
      setStatus("error");
    }
  }, [writeContractAsync, publicClient, groupId, adminAddress, authFetch, onDeployed]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { deploy, reset, status, error, txHash };
}
