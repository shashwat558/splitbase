import { useAccount, useDisconnect } from "wagmi";

/**
 * Thin wrapper around wagmi's useAccount to expose
 * the normalized wallet address and connection state.
 */
export function useWallet() {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { disconnect } = useDisconnect();

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return {
    address: address ?? null,
    shortAddress,
    isConnected,
    isConnecting,
    chainId: chainId ?? null,
    disconnect,
  };
}
