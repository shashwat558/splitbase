"use client";

import { useMintReceipt } from "@/hooks/useMintReceipt";
import { RECEIPT_CONTRACT_DEPLOYED } from "@/lib/receiptNFT";
import type { Expense } from "@/types";

interface Props {
  groupId:   string;
  groupName: string;
  members:   string[];
  expenses:  Expense[];
}

export function MintReceiptButton({ groupId, groupName, members, expenses }: Props) {
  const { mint, reset, status, error, txHash, isLoading, isSuccess } = useMintReceipt();

  const totalETH = expenses.reduce((s, e) => s + e.amount, 0);
  const settledAt = new Date().toISOString().split("T")[0];

  async function handleMint() {
    await mint(
      { groupId, groupName, members, totalETH, settledAt },
      members as `0x${string}`[]
    );
  }

  if (!RECEIPT_CONTRACT_DEPLOYED) {
    return (
      <div className="minimal-card bg-card p-6 border-dashed">
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">
          // NFT_RECEIPTS
        </p>
        <p className="text-xs font-mono text-muted mb-3">
          Deploy the contract first to enable soulbound receipts.
        </p>
        <code className="block text-[10px] font-mono text-muted bg-background border border-border p-3 leading-relaxed">
          cd contracts<br />
          forge script script/DeployReceipt.s.sol \<br />
          {'  '}--rpc-url https://sepolia.base.org \<br />
          {'  '}--private-key $PRIVATE_KEY --broadcast<br />
          <br />
          # then add to .env:<br />
          NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS=0x...
        </code>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="minimal-card bg-card p-6 space-y-4 border-accent">
        <div className="flex items-center gap-3">
          <span className="text-lg">🎖</span>
          <div>
            <p className="text-sm font-bold font-mono text-accent uppercase tracking-widest">
              RECEIPT_MINTED
            </p>
            <p className="text-xs font-mono text-muted mt-0.5">
              Soulbound NFT sent to all {members.length} members
            </p>
          </div>
        </div>
        {txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs font-mono text-accent underline hover:text-foreground transition-colors"
          >
            VIEW_ON_BASESCAN →
          </a>
        )}
        <button
          onClick={reset}
          className="text-xs font-mono text-muted hover:text-foreground transition-colors uppercase"
        >
          [DISMISS]
        </button>
      </div>
    );
  }

  return (
    <div className="minimal-card bg-card p-6 space-y-4">
      <div>
        <p className="text-sm font-bold text-foreground uppercase tracking-widest mb-1">
          Proof_of_Settlement
        </p>
        <p className="text-xs font-mono text-muted">
          Group is fully settled. Mint a soulbound NFT receipt for all {members.length} members
          as permanent on-chain proof.
        </p>
      </div>

      <div className="border border-border bg-background p-4 space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-muted">TOTAL</span>
          <span className="text-foreground font-bold">{totalETH.toFixed(4)} ETH</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-muted">RECIPIENTS</span>
          <span className="text-foreground">{members.length} members</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-muted">TYPE</span>
          <span className="text-foreground">Soulbound (non-transferable)</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-muted">NETWORK</span>
          <span className="text-foreground">Base Sepolia</span>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-500 font-mono">
          ERR: {error}
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={isLoading}
        className="btn-primary w-full py-3 text-sm uppercase tracking-widest disabled:opacity-40"
      >
        {status === "pending"
          ? "WAITING_FOR_SIGNATURE..."
          : status === "confirming"
          ? "CONFIRMING_TX..."
          : "MINT_RECEIPT_NFT"}
      </button>

      <p className="text-center text-[10px] font-mono text-muted">
        // One NFT per member // Permanently non-transferable
      </p>
    </div>
  );
}
