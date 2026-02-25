import type { Expense, Settlement } from "@/types";

export function spendingPerMember(
  expenses: Expense[],
  members: string[]
): Array<{ address: string; label: string; total: number }> {
  const map: Record<string, number> = {};
  members.forEach((m) => (map[m.toLowerCase()] = 0));

  for (const e of expenses) {
    const payer = e.paid_by.toLowerCase();
    if (map[payer] !== undefined) map[payer] += e.amount;
  }

  return members.map((m) => ({
    address: m.toLowerCase(),
    label: shortAddr(m),
    total: Math.round(map[m.toLowerCase()] * 100) / 100,
  }));
}

export interface TimePoint {
  date: string;
  cumulative: number;
  daily: number;
}

export function spendingOverTime(expenses: Expense[]): TimePoint[] {
  if (expenses.length === 0) return [];

  const sorted = [...expenses].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const dayMap: Record<string, number> = {};
  for (const e of sorted) {
    const d = new Date(e.created_at);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dayMap[key] = (dayMap[key] ?? 0) + e.amount;
  }

  const points: TimePoint[] = [];
  let cumulative = 0;
  for (const [date, daily] of Object.entries(dayMap)) {
    cumulative += daily;
    points.push({
      date,
      cumulative: Math.round(cumulative * 100) / 100,
      daily: Math.round(daily * 100) / 100,
    });
  }

  return points;
}

export function settlementStats(
  expenses: Expense[],
  settlements: Settlement[]
): { totalOwed: number; totalSettled: number; rate: number } {
  const totalOwed = expenses.reduce((s, e) => s + e.amount, 0);
  const totalSettled = settlements.reduce((s, st) => s + st.amount, 0);
  const rate = totalOwed > 0 ? Math.min(100, (totalSettled / totalOwed) * 100) : 0;
  return {
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalSettled: Math.round(totalSettled * 100) / 100,
    rate: Math.round(rate * 10) / 10,
  };
}

export function avgSettlementVelocityHours(
  expenses: Expense[],
  settlements: Settlement[]
): number | null {
  if (settlements.length === 0 || expenses.length === 0) return null;

  const firstExpense = new Date(
    Math.min(...expenses.map((e) => new Date(e.created_at).getTime()))
  );

  const lastSettlement = new Date(
    Math.max(...settlements.map((s) => new Date(s.created_at).getTime()))
  );

  const diffMs = lastSettlement.getTime() - firstExpense.getTime();
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / 1000 / 3600);
}

export function topPayer(
  expenses: Expense[],
  members: string[]
): { address: string; label: string; total: number } | null {
  const data = spendingPerMember(expenses, members);
  if (data.length === 0) return null;
  return data.reduce((best, cur) => (cur.total > best.total ? cur : best));
}

export function mostActiveDay(expenses: Expense[]): string | null {
  if (expenses.length === 0) return null;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts: number[] = new Array(7).fill(0);
  for (const e of expenses) {
    counts[new Date(e.created_at).getDay()]++;
  }
  return days[counts.indexOf(Math.max(...counts))];
}

export function avgExpenseAmount(expenses: Expense[]): number {
  if (expenses.length === 0) return 0;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return Math.round((total / expenses.length) * 100) / 100;
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
