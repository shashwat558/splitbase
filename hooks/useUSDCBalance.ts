import { useBalance } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { type Address } from "viem";
import { fromUSDCUnits, formatUSDC } from "@/lib/usdc";

/**
 * Fetch the native ETH balance of any address on Base Sepolia.
 * Returns the balance in human-readable form (e.g. 0.0420)
 * and a pre-formatted display string (e.g. "0.0420 ETH").
 */
export function useUSDCBalance(address: Address | null | undefined) {
  const { data, isLoading, isError, refetch } = useBalance({
    address: address ?? undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!address },
  });

  const balance = data ? fromUSDCUnits(data.value) : 0;

  return {
    balance,
    formatted: formatUSDC(balance),
    isLoading,
    isError,
    refetch,
  };
}
