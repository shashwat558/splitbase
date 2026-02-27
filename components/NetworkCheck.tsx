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
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 text-center text-sm relative z-50 flex items-center justify-center gap-4">
      <span className="text-amber-400 font-medium">
        ⚠️ Wrong network — please switch to <strong>Base Sepolia</strong> to continue
      </span>
      <button
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        disabled={isPending}
        className="border border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? "Switching..." : "Switch Network"}
      </button>
    </div>
  );
}
