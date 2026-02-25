"use client";

import { useEffect } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export function NetworkCheck() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  useEffect(() => {
    if (isConnected && chainId !== baseSepolia.id) {
      switchChain({ chainId: baseSepolia.id });
    }
  }, [isConnected, chainId, switchChain]);

  if (!isConnected || chainId === baseSepolia.id) return null;

  return (
    <div className="bg-card border-b border-border px-6 py-3 text-center text-sm font-mono text-muted relative z-50 flex items-center justify-center gap-6">
      <span>
        <span className="text-red-500 font-bold mr-2">[WRONG_NETWORK]</span>
        BASE_SEPOLIA_REQUIRED
      </span>
      <button
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        disabled={isPending}
        className="btn-primary px-4 py-1.5 text-xs uppercase tracking-widest font-mono font-bold disabled:opacity-50"
      >
        {isPending ? "SWITCHING..." : "SWITCH_NETWORK"}
      </button>
    </div>
  );
}
