"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  spendingPerMember,
  spendingOverTime,
  settlementStats,
  avgSettlementVelocityHours,
  topPayer,
  mostActiveDay,
  avgExpenseAmount,
  shortAddr,
} from "@/lib/analytics";
import { computeNetBalancesWithSettlements } from "@/lib/settlement";
import { formatUSDC } from "@/lib/usdc";
import type { Expense, Settlement } from "@/types";

interface Props {
  expenses: Expense[];
  settlements: Settlement[];
  members: string[];
  currentAddress?: string;
}

const tooltipStyle = {
  backgroundColor: "var(--card-bg)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  color: "var(--foreground)",
  fontFamily: "monospace",
  fontSize: "11px",
  padding: "8px 12px",
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="minimal-card p-5 flex flex-col gap-1">
      <p className="text-xs font-mono text-muted uppercase tracking-widest">{label}</p>
      <p
        className={`text-2xl font-bold tracking-tight font-mono ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs font-mono text-muted mt-1">{sub}</p>}
    </div>
  );
}

export function AnalyticsDashboard({ expenses, settlements, members, currentAddress }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="minimal-card p-8 text-center border-dashed">
        <p className="text-sm font-mono text-muted uppercase tracking-widest">
          NO_DATA — Add expenses to see analytics
        </p>
      </div>
    );
  }

  // ─── Compute data ──────────────────────────────────────────────────────────
  const memberSpending = spendingPerMember(expenses, members);
  const timeData = spendingOverTime(expenses);
  const { totalOwed, totalSettled, rate } = settlementStats(expenses, settlements);
  const velocityHours = avgSettlementVelocityHours(expenses, settlements);
  const best = topPayer(expenses, members);
  const activeDay = mostActiveDay(expenses);
  const avgAmount = avgExpenseAmount(expenses);

  const netBalances = computeNetBalancesWithSettlements(expenses, settlements, members);

  const balanceData = netBalances
    .map((b) => ({
      label:
        currentAddress && b.address === currentAddress.toLowerCase()
          ? "YOU"
          : shortAddr(b.address),
      net: Math.round(b.net * 100) / 100,
    }))
    .sort((a, b) => b.net - a.net);

  const velocityLabel =
    velocityHours === null
      ? "N/A"
      : velocityHours < 24
      ? `${velocityHours}h`
      : `${Math.round(velocityHours / 24)}d`;

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">
          Analytics
        </h2>
        <p className="text-xs font-mono text-muted mt-1">
          {expenses.length} expenses // {settlements.length} settlements
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Spent"
          value={formatUSDC(totalOwed)}
          sub={`${expenses.length} expenses`}
        />
        <StatCard
          label="Settled"
          value={`${rate}%`}
          sub={formatUSDC(totalSettled)}
          accent={rate >= 80}
        />
        <StatCard
          label="Avg Expense"
          value={formatUSDC(avgAmount)}
          sub={activeDay ? `Most active: ${activeDay}` : undefined}
        />
        <StatCard
          label="Settle Speed"
          value={velocityLabel}
          sub={velocityHours !== null ? "first expense → last settlement" : "No settlements yet"}
        />
      </div>

      {best && best.total > 0 && (
        <div className="minimal-card p-5 flex items-center justify-between gap-4 border-accent/30 bg-accent/5">
          <div>
            <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">
              Top Payer
            </p>
            <p className="text-base font-bold font-mono text-foreground">
              {currentAddress && best.address === currentAddress.toLowerCase()
                ? "YOU 🏆"
                : best.label}
            </p>
            <p className="text-xs font-mono text-muted mt-0.5">
              Paid {formatUSDC(best.total)} of group expenses
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold font-mono text-accent">
              {Math.round((best.total / totalOwed) * 100)}%
            </p>
            <p className="text-xs font-mono text-muted">of total</p>
          </div>
        </div>
      )}

      <div className="minimal-card p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-5">
          Spending by Member
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={memberSpending} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number | undefined) => [formatUSDC(v ?? 0), "Paid"]}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="total" radius={[2, 2, 0, 0]}>
              {memberSpending.map((entry, i) => (
                <Cell
                  key={entry.address}
                  fill={
                    currentAddress && entry.address === currentAddress.toLowerCase()
                      ? "var(--accent)"
                      : i % 2 === 0
                      ? "var(--foreground)"
                      : "var(--muted)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {timeData.length > 1 && (
        <div className="minimal-card p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-5">
            Cumulative Spending Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number | undefined, name: string | undefined) => [
                  formatUSDC(v ?? 0),
                  name === "cumulative" ? "Total" : "Daily",
                ]}
                cursor={{ stroke: "var(--border)" }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--accent)" }}
              />
              <Line
                type="monotone"
                dataKey="daily"
                stroke="var(--muted)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="4 3"
                activeDot={{ r: 3, fill: "var(--muted)" }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-3">
            <span className="text-xs font-mono text-muted flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-accent" /> Cumulative
            </span>
            <span className="text-xs font-mono text-muted flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-muted border-dashed" /> Daily
            </span>
          </div>
        </div>
      )}

      <div className="minimal-card p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-5">
          Net Balances (After Settlements)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={balanceData} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number | undefined) => [
                `${(v ?? 0) >= 0 ? "+" : ""}${formatUSDC(Math.abs(v ?? 0))}`,
                (v ?? 0) >= 0 ? "Owed to them" : "They owe",
              ]}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="net" radius={[2, 2, 0, 0]}>
              {balanceData.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={
                    entry.net > 0
                      ? "var(--accent)"
                      : entry.net < 0
                      ? "#ef4444"
                      : "var(--muted)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-3">
          <span className="text-xs font-mono text-muted flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-accent rounded-sm" /> Owed to
          </span>
          <span className="text-xs font-mono text-muted flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-sm" /> Owes
          </span>
        </div>
      </div>

      <div className="minimal-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
            Settlement Progress
          </h3>
          <span className="text-xs font-mono text-muted">
            {formatUSDC(totalSettled)} / {formatUSDC(totalOwed)}
          </span>
        </div>
        <div className="w-full h-2 bg-border rounded-sm overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-700 rounded-sm"
            style={{ width: `${rate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs font-mono text-muted">0%</span>
          <span
            className={`text-xs font-mono font-bold ${
              rate >= 80 ? "text-accent" : "text-muted"
            }`}
          >
            {rate}% settled
          </span>
          <span className="text-xs font-mono text-muted">100%</span>
        </div>
      </div>

      <div className="minimal-card p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-5">
          Member Leaderboard
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left pb-2 pr-4 font-bold uppercase tracking-wider">#</th>
                <th className="text-left pb-2 pr-4 font-bold uppercase tracking-wider">Member</th>
                <th className="text-right pb-2 pr-4 font-bold uppercase tracking-wider">Paid</th>
                <th className="text-right pb-2 font-bold uppercase tracking-wider">Net</th>
              </tr>
            </thead>
            <tbody>
              {memberSpending
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((m, idx) => {
                  const bal = netBalances.find((b) => b.address === m.address);
                  const net = bal?.net ?? 0;
                  const isYou =
                    currentAddress && m.address === currentAddress.toLowerCase();
                  return (
                    <tr
                      key={m.address}
                      className={`border-b border-border last:border-0 ${
                        isYou ? "text-foreground" : "text-muted"
                      }`}
                    >
                      <td className="py-2.5 pr-4">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                      </td>
                      <td className="py-2.5 pr-4 font-medium">
                        {isYou ? `${m.label} (YOU)` : m.label}
                      </td>
                      <td className="py-2.5 pr-4 text-right">{formatUSDC(m.total)}</td>
                      <td
                        className={`py-2.5 text-right font-bold ${
                          net > 0
                            ? "text-accent"
                            : net < 0
                            ? "text-red-500"
                            : "text-muted"
                        }`}
                      >
                        {net > 0 ? "+" : ""}
                        {formatUSDC(Math.abs(net))}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
