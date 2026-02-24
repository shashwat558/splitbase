import { type Address, parseUnits, formatEther } from "viem";
import type { Transfer } from "@/types";

// ─── Chain Currency: Native ETH on Base Sepolia ────────────────────────────────

/** ETH has 18 decimal places */
export const USDC_DECIMALS = 18; // kept as USDC_DECIMALS for backwards compat

// ERC20_ABI kept for potential future use
export const ERC20_ABI = [] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert human-readable ETH amount to on-chain wei (bigint) */
export function toUSDCUnits(amount: number): bigint {
  return parseUnits(amount.toFixed(18), 18);
}

/** Convert on-chain wei to human-readable ETH */
export function fromUSDCUnits(units: bigint): number {
  return parseFloat(formatEther(units));
}

/** Format an ETH amount for display, e.g. "0.0420 ETH" */
export function formatUSDC(amount: number): string {
  // Show up to 4 significant decimal places
  return `${amount.toFixed(4)} ETH`;
}

// Alias for cleaner imports in new code
export const formatETH = formatUSDC;

// ─── Batch Call Encoder ───────────────────────────────────────────────────────

/**
 * Encode a list of Transfer objects into EIP-5792 call objects for
 * Smart Wallet batch execution via useSendCalls — native ETH transfers.
 */
export function encodeBatchTransfers(
  transfers: Transfer[]
): Array<{ to: Address; value: bigint; data: `0x${string}` }> {
  return transfers.map((t) => ({
    to: t.to as Address,
    value: toUSDCUnits(t.amount),
    data: "0x",
  }));
}
