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

  // ─── Settlement math ───────────────────────────────────────────────────────
  const balances = computeNetBalancesWithSettlements(expenses, settlements, members);

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
  const myDebt    = myBalance < -0.000001 ? Math.abs(myBalance) : 0;

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
        <div className="minimal-card bg-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">
            Group_Treasury
          </h3>
          <p className="text-xs font-mono text-muted">
            // TREASURY_FACTORY_ADDRESS not set in .env<br />
            // Deploy factory: <span className="text-accent">forge script script/DeployTreasuryFactory.s.sol --rpc-url https://sepolia.base.org --account deployer --broadcast</span><br />
            // Then add NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS=0x... to .env
          </p>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="minimal-card bg-card p-6 space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">
            Group_Treasury
          </h3>
          <p className="text-xs font-mono text-muted py-2">// TREASURY_NOT_ACTIVATED — ask admin to activate</p>
        </div>
      );
    }

    return (
      <div className="minimal-card bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest border-b border-border pb-2">
          Group_Treasury
        </h3>
        <p className="text-xs font-mono text-muted leading-relaxed">
          // members pay into a shared on-chain vault<br />
          // admin disperses to creditors once funded<br />
          // no direct P2P required
        </p>
        {deployHook.error && (
          <p className="text-xs text-red-500 font-mono border-l-2 border-red-500 pl-3">
            ERR: {deployHook.error}
          </p>
        )}
        <button
          onClick={deployHook.deploy}
          disabled={deployHook.status !== "idle" && deployHook.status !== "error"}
          className="w-full btn-primary py-3 text-xs font-mono uppercase tracking-widest font-bold disabled:opacity-50"
        >
          {deployHook.status === "pending"    ? "WAITING_FOR_SIGNATURE..."  :
           deployHook.status === "confirming" ? "DEPLOYING_CONTRACT..."     :
           "ACTIVATE_TREASURY →"}
        </button>
        {deployHook.txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${deployHook.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs font-mono text-accent underline hover:text-foreground"
          >
            VIEW_TX ↗
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
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border p-3">
          <p className="text-xs font-mono text-muted uppercase tracking-wide mb-1">Balance</p>
          <p className="text-xl font-bold font-mono text-foreground">{balanceEth.toFixed(4)} ETH</p>
        </div>
        <div className="border border-border p-3">
          <p className="text-xs font-mono text-muted uppercase tracking-wide mb-1">To_Disperse</p>
          <p className="text-xl font-bold font-mono text-foreground">{formatUSDC(totalToDisperse)}</p>
        </div>
      </div>

      {/* Debtors status (who still needs to deposit) */}
      {debtors.length > 0 && (
        <div>
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Pending_Deposits</p>
          <ul className="space-y-2">
            {debtors.map(({ addr, owes }) => {
              const isYou = addr.toLowerCase() === currentAddress.toLowerCase();
              return (
                <li
                  key={addr}
                  className="flex items-center justify-between text-xs font-mono border-b border-border pb-2 last:border-0"
                >
                  <span className={isYou ? "text-foreground font-bold" : "text-muted"}>
                    {isYou ? "YOU" : `${addr.slice(0, 6)}…${addr.slice(-4)}`}
                  </span>
                  <span className="text-red-400">−{formatUSDC(owes)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* My deposit action */}
      {myDebt > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-mono text-muted uppercase tracking-widest">Your_Deposit</p>
          <p className="text-xs font-mono text-muted">
            // you owe{" "}
            <span className="text-foreground font-bold">{formatUSDC(myDebt)}</span> — deposit to treasury
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.0001"
              min="0"
              placeholder={myDebt.toFixed(4)}
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              className="minimal-input w-full font-mono text-xs"
            />
            <button
              onClick={() => setDepositInput(myDebt.toFixed(6))}
              className="flex-shrink-0 border border-border text-xs font-mono px-3 py-2 text-muted hover:text-foreground transition-colors"
              title="Fill with owed amount"
            >
              FILL
            </button>
          </div>
          {depositHook.error && (
            <p className="text-xs text-red-500 font-mono border-l-2 border-red-500 pl-3">
              ERR: {depositHook.error}
            </p>
          )}
          {depositHook.status === "success" ? (
            <div className="space-y-2">
              <p className="text-xs font-mono text-accent">// DEPOSIT_CONFIRMED</p>
              {depositHook.txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${depositHook.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs font-mono text-accent underline"
                >
                  VIEW_TX ↗
                </a>
              )}
              <button
                onClick={depositHook.reset}
                className="w-full border border-border text-xs font-mono py-2 uppercase text-muted hover:text-foreground transition-colors"
              >
                CLOSE
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const amount = parseFloat(depositInput || myDebt.toFixed(6));
                if (!isNaN(amount) && amount > 0) depositHook.deposit(amount);
              }}
              disabled={depositHook.status !== "idle" && depositHook.status !== "error"}
              className="w-full btn-primary py-3 text-xs font-mono uppercase tracking-widest font-bold disabled:opacity-50"
            >
              {depositHook.status === "pending"    ? "WAITING_FOR_SIGNATURE..." :
               depositHook.status === "confirming" ? "CONFIRMING_TX..."        :
               "DEPOSIT_TO_TREASURY →"}
            </button>
          )}
        </div>
      )}

      {/* Admin disperse action */}
      {isAdmin && creditors.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-mono text-muted uppercase tracking-widest">Admin_Disperse</p>

          {/* Creditor breakdown */}
          <ul className="space-y-2">
            {creditors.map(({ addr, owed }) => (
              <li
                key={addr}
                className="flex items-center justify-between text-xs font-mono border-b border-border pb-2 last:border-0"
              >
                <span className="text-muted">{`${addr.slice(0, 6)}…${addr.slice(-4)}`}</span>
                <span className="text-green-400">+{formatUSDC(owed)}</span>
              </li>
            ))}
          </ul>

          {balanceEth < totalToDisperse - 0.000001 && (
            <p className="text-xs font-mono text-yellow-500 border-l-2 border-yellow-500 pl-3">
              // INSUFFICIENT_BALANCE — treasury has {balanceEth.toFixed(4)} ETH, needs {totalToDisperse.toFixed(4)} ETH
            </p>
          )}

          {disperseHook.error && (
            <p className="text-xs text-red-500 font-mono border-l-2 border-red-500 pl-3">
              ERR: {disperseHook.error}
            </p>
          )}

          {disperseHook.status === "success" ? (
            <div className="space-y-2">
              <p className="text-xs font-mono text-accent">// DISPERSE_COMPLETE</p>
              {disperseHook.txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${disperseHook.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs font-mono text-accent underline"
                >
                  VIEW_TX ↗
                </a>
              )}
              <button
                onClick={disperseHook.reset}
                className="w-full border border-border text-xs font-mono py-2 uppercase text-muted hover:text-foreground transition-colors"
              >
                CLOSE_PANEL
              </button>
            </div>
          ) : (
            <button
              onClick={() => disperseHook.disperse(creditorTransfers)}
              disabled={
                (disperseHook.status !== "idle" && disperseHook.status !== "error") ||
                balanceEth < totalToDisperse - 0.000001
              }
              className="w-full btn-primary py-3 text-xs font-mono uppercase tracking-widest font-bold disabled:opacity-50"
            >
              {disperseHook.status === "pending"    ? "WAITING_FOR_SIGNATURE..." :
               disperseHook.status === "confirming" ? "CONFIRMING_TX..."        :
               disperseHook.status === "recording"  ? "RECORDING..."            :
               `DISPERSE_${formatUSDC(totalToDisperse)}_TO_${creditors.length}_MEMBERS →`}
            </button>
          )}
        </div>
      )}

      {/* All settled */}
      {debtors.length === 0 && creditors.length === 0 && (
        <div className="text-center py-2">
          <p className="text-xs font-mono text-muted">// ALL_SETTLED — no outstanding balances</p>
        </div>
      )}
    </div>
  );
}
