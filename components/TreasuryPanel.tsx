"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { useDeployTreasury } from "@/hooks/useDeployTreasury";
import { useTreasuryDeposit } from "@/hooks/useTreasuryDeposit";
import { useTreasuryDisperse } from "@/hooks/useTreasuryDisperse";
import { computeNetBalancesWithSettlements } from "@/lib/settlement";
import { GROUP_TREASURY_ABI, TREASURY_FACTORY_ADDRESS } from "@/lib/treasury";
import { formatUSDC } from "@/lib/usdc";
import type { Expense, Settlement } from "@/types";

interface Props {
  groupId: string;
  /** treasury contract address, or null/undefined if not yet deployed */
  treasuryAddress: string | null | undefined;
  members: string[];
  expenses: Expense[];
  settlements: Settlement[];
  currentAddress: string;
  isAdmin: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}

export function TreasuryPanel({
  groupId,
  treasuryAddress: initialTreasuryAddress,
  members,
  expenses,
  settlements,
  currentAddress,
  isAdmin,
  authFetch,
  onRefresh,
}: Props) {
  const [treasuryAddress, setTreasuryAddress] = useState(initialTreasuryAddress);
  const [depositInput, setDepositInput] = useState("");

  // Keep in sync with prop changes (realtime)
  useEffect(() => {
    setTreasuryAddress(initialTreasuryAddress);
  }, [initialTreasuryAddress]);

  // ─── On-chain treasury balance ─────────────────────────────────────────────
  const { data: balanceWei, refetch: refetchBalance } = useReadContract({
    address: treasuryAddress ? (treasuryAddress as `0x${string}`) : undefined,
    abi: GROUP_TREASURY_ABI,
    functionName: "getBalance",
    query: { enabled: !!treasuryAddress, refetchInterval: 8000 },
  });

  const balanceEth = balanceWei ? parseFloat(formatEther(balanceWei as bigint)) : 0;

  const balances = computeNetBalancesWithSettlements(expenses, settlements, members);

  const hasBeenDispersed = !!treasuryAddress &&
    settlements.some((s) => s.paid_by.toLowerCase() === treasuryAddress.toLowerCase());

  /** Members who owe money (net < 0) */
  const debtors = balances
    .filter((b) => b.net < -0.000001)
    .map((b) => ({ addr: b.address, owes: Math.abs(b.net) }));

  /** Members who are owed money (net > 0) */
  const creditors = balances
    .filter((b) => b.net > 0.000001)
    .map((b) => ({ addr: b.address, owed: b.net }));

  const myBalanceEntry = balances.find((b) => b.address === currentAddress.toLowerCase());
  const myBalance = myBalanceEntry?.net ?? 0;
  const myDebt    = myBalance < -0.000001 && !hasBeenDispersed ? Math.abs(myBalance) : 0;

  const totalToDisperse = creditors.reduce((s, c) => s + c.owed, 0);

  // ─── Hooks ─────────────────────────────────────────────────────────────────
  const handleDeployed = (addr: string) => {
    setTreasuryAddress(addr);
    onRefresh();
  };

  const deployHook = useDeployTreasury({
    groupId,
    adminAddress: currentAddress,
    onDeployed: handleDeployed,
    authFetch,
  });

  const depositHook = useTreasuryDeposit({
    treasuryAddress: treasuryAddress ?? "",
    onDeposited: () => { refetchBalance(); onRefresh(); },
  });

  const disperseHook = useTreasuryDisperse({
    groupId,
    treasuryAddress: treasuryAddress ?? "",
    authFetch,
    onDispersed: () => { refetchBalance(); onRefresh(); },
  });

  // Build creditor transfer list for disperse
  const creditorTransfers = creditors.map((c) => ({ from: treasuryAddress ?? "", to: c.addr, amount: c.owed }));

  const factoryNotConfigured = !TREASURY_FACTORY_ADDRESS;

  // ─── Not yet deployed ──────────────────────────────────────────────────────
  if (!treasuryAddress) {
    if (factoryNotConfigured) {
      return (
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            🏛️ Group Treasury
          </h3>
          <p className="text-sm text-muted">
            Treasury is not configured yet. Contact your admin to set it up.
          </p>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            🏛️ Group Treasury
          </h3>
          <p className="text-sm text-muted">The group treasury hasn't been set up yet. Ask the group admin to activate it.</p>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          🏛️ Group Treasury
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          A shared vault where members deposit their share. The admin then pays out everyone who is owed money — no awkward peer-to-peer transfers needed.
        </p>
        {deployHook.error && (
          <p className="text-sm text-red-400 bg-red-500/10 p-3 border border-red-500/20 rounded-lg flex items-start gap-2">
            <span>⚠️</span>
            <span>{deployHook.error}</span>
          </p>
        )}
        <button
          onClick={deployHook.deploy}
          disabled={deployHook.status !== "idle" && deployHook.status !== "error"}
          className="w-full btn-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          {deployHook.status === "pending"    ? "⟳ Waiting for signature…"  :
           deployHook.status === "confirming" ? "⟳ Deploying contract…"     :
           "Activate Treasury →"}
        </button>
        {deployHook.txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${deployHook.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-accent hover:underline text-center"
          >
            View transaction ↗
          </a>
        )}
      </div>
    );
  }

  // ─── Treasury is active ────────────────────────────────────────────────────
  return (
    <div className="minimal-card bg-card p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
            Group_Treasury
          </h3>
          <span className="text-xs font-mono text-accent border border-accent px-2 py-0.5">
            ACTIVE
          </span>
        </div>
        <a
          href={`https://sepolia.basescan.org/address/${treasuryAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs font-mono text-muted hover:text-foreground transition-colors truncate underline decoration-dotted"
          title={treasuryAddress}
        >
          {treasuryAddress.slice(0, 10)}…{treasuryAddress.slice(-8)}
        </a>
      </div>

      {/* Balance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Vault balance</p>
          <p className="text-lg font-bold font-mono text-foreground">{balanceEth.toFixed(4)} ETH</p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <p className="text-xs text-muted mb-1">To pay out</p>
          <p className="text-lg font-bold font-mono text-foreground">{formatUSDC(totalToDisperse)}</p>
        </div>
      </div>

      {/* Debtors status (who still needs to deposit) */}
      {debtors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Still need to deposit</p>
          <ul className="space-y-1.5">
            {debtors.map(({ addr, owes }) => {
              const isYou = addr.toLowerCase() === currentAddress.toLowerCase();
              return (
                <li
                  key={addr}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-border/60 last:border-0"
                >
                  <span className={isYou ? "text-foreground font-semibold" : "text-muted font-mono"}>
                    {isYou ? "You" : `${addr.slice(0, 6)}…${addr.slice(-4)}`}
                  </span>
                  <span className="text-red-400 font-mono">−{formatUSDC(owes)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* My deposit action */}
      {myDebt > 0 && !hasBeenDispersed && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground">Your deposit</p>
          <p className="text-sm text-muted">
            You owe{" "}
            <span className="text-foreground font-bold font-mono">{formatUSDC(myDebt)}</span> — deposit it to the group vault.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.0001"
              min="0"
              placeholder={myDebt.toFixed(4)}
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              className="minimal-input w-full text-sm rounded-lg font-mono"
            />
            <button
              onClick={() => setDepositInput(myDebt.toFixed(6))}
              className="flex-shrink-0 border border-border text-xs px-3 py-2 text-muted hover:text-foreground transition-colors rounded-lg"
              title="Fill exact amount owed"
            >
              Fill
            </button>
          </div>
          {depositHook.error && (
            <p className="text-sm text-red-400 bg-red-500/10 p-3 border border-red-500/20 rounded-lg flex items-start gap-2">
              <span>⚠️</span>
              <span>{depositHook.error}</span>
            </p>
          )}
          {depositHook.status === "success" ? (
            <div className="space-y-2">
              <p className="text-sm text-accent font-medium">✅ Deposit confirmed!</p>
              {depositHook.txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${depositHook.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-accent hover:underline"
                >
                  View transaction ↗
                </a>
              )}
              <button
                onClick={() => {
                  depositHook.reset();
                  setDepositInput("");
                }}
                className="w-full border border-border text-sm font-medium py-2 rounded-lg text-muted hover:text-foreground transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const amount = parseFloat(depositInput || myDebt.toFixed(6));
                if (!isNaN(amount) && amount > 0) depositHook.deposit(amount);
              }}
              disabled={depositHook.status !== "idle" && depositHook.status !== "error"}
              className="w-full btn-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
            >
              {depositHook.status === "pending"    ? "⟳ Waiting for signature…" :
               depositHook.status === "confirming" ? "⟳ Confirming…"            :
               "Deposit to Treasury →"}
            </button>
          )}
        </div>
      )}

      {hasBeenDispersed && myBalance < -0.000001 && (
        <div className="border-t border-border pt-4">
          <p className="text-sm font-semibold text-yellow-500">🎊 Settled via Treasury</p>
          <p className="text-sm text-muted mt-1">The admin has paid out all members. Your balance has been cleared.</p>
        </div>
      )}

      {/* Admin disperse action */}
      {isAdmin && creditors.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground">Pay out creditors</p>

          {/* Creditor breakdown */}
          <ul className="space-y-1.5">
            {creditors.map(({ addr, owed }) => (
              <li
                key={addr}
                className="flex items-center justify-between text-xs py-1.5 border-b border-border/60 last:border-0"
              >
                <span className="text-muted font-mono">{`${addr.slice(0, 6)}…${addr.slice(-4)}`}</span>
                <span className="text-green-400 font-mono">+{formatUSDC(owed)}</span>
              </li>
            ))}
          </ul>

          {balanceEth < totalToDisperse - 0.000001 && (
            <p className="text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg">
              ⚠️ Vault balance is too low ({balanceEth.toFixed(4)} ETH) — needs {totalToDisperse.toFixed(4)} ETH to pay out.
            </p>
          )}

          {disperseHook.error && (
            <p className="text-sm text-red-400 bg-red-500/10 p-3 border border-red-500/20 rounded-lg flex items-start gap-2">
              <span>⚠️</span>
              <span>{disperseHook.error}</span>
            </p>
          )}

          {disperseHook.status === "success" ? (
            <div className="space-y-2">
              <p className="text-sm text-accent font-medium">✅ All members paid out!</p>
              {disperseHook.txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${disperseHook.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-accent hover:underline"
                >
                  View transaction ↗
                </a>
              )}
              <button
                onClick={disperseHook.reset}
                className="w-full border border-border text-sm py-2 rounded-lg text-muted hover:text-foreground transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              onClick={() => disperseHook.disperse(creditorTransfers)}
              disabled={
                (disperseHook.status !== "idle" && disperseHook.status !== "error") ||
                balanceEth < totalToDisperse - 0.000001
              }
              className="w-full btn-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
            >
              {disperseHook.status === "pending"    ? "⟳ Waiting for signature…" :
               disperseHook.status === "confirming" ? "⟳ Confirming…"            :
               disperseHook.status === "recording"  ? "⟳ Recording…"             :
               `Pay out ${formatUSDC(totalToDisperse)} to ${creditors.length} member${creditors.length !== 1 ? "s" : ""} →`}
            </button>
          )}
        </div>
      )}

      {/* All settled */}
      {debtors.length === 0 && creditors.length === 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-muted">🎉 All settled — no outstanding balances.</p>
        </div>
      )}
    </div>
  );
}
