"use client";

import { formatUSDC } from "@/lib/usdc";
import type { Expense } from "@/types";

interface Props {
  expenses: Expense[];
  currentAddress?: string;
  onDelete?: (id: string) => void;
}

export function ExpenseList({ expenses, currentAddress, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="minimal-card border-dashed p-8 text-center bg-card/50">
        <p className="text-sm font-mono text-muted uppercase tracking-wide">
             // NO_EXPENSES_RECORDED
        </p>
      </div>
    );
  }

  return (
    <div className="minimal-card bg-card p-0 overflow-hidden">
      <div className="border-b border-border px-6 py-4 bg-muted/5 flex justify-between items-center">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Expense_Log</h3>
        <span className="text-xs font-mono text-muted border border-border px-2 py-1 bg-background rounded-sm">COUNT: {expenses.length}</span>
      </div>

      <ul className="divide-y divide-border">
        {expenses.map((exp) => {
          const isPayer = exp.paid_by.toLowerCase() === currentAddress?.toLowerCase();
          const date = new Date(exp.created_at).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
          });

          return (
            <li key={exp.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/5 transition-colors group">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-foreground uppercase tracking-wide">{exp.description}</span>
                    <span className="text-xs font-mono text-muted border border-border px-1.5 py-0.5">{date}</span>
                </div>
                <p className="text-xs font-mono text-muted">
                  PAID_BY: <span className={isPayer ? "text-foreground font-bold" : "text-muted"}>
                    {isPayer ? "YOU" : `${exp.paid_by.slice(0, 6)}...${exp.paid_by.slice(-4)}`}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-6">
                <span className="font-mono text-base font-bold text-foreground">
                  {formatUSDC(exp.amount)}
                </span>
                {onDelete && (
                  <button
                    onClick={() => onDelete(exp.id)}
                    className="text-muted hover:text-red-500 transition-colors font-mono text-xs opacity-0 group-hover:opacity-100 uppercase tracking-wider"
                    title="DELETE_RECORD"
                  >
                    [DEL]
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
