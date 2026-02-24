import type { Expense, Settlement, Transfer, Balance } from "@/types";

// Only ignore true floating-point noise (< 0.000001 ETH ≈ sub-micro-cent)
const DUST_THRESHOLD = 0.000001;

/**
 * Compute each member's net balance within a group.
 *
 * Positive net  → they are owed money (creditor).
 * Negative net  → they owe money (debtor).
 *
 * If an expense has `splits`, those are used directly.
 * Otherwise the expense is split equally among all current group members.
 */
export function computeNetBalances(
  expenses: Expense[],
  members: string[]
): Balance[] {
  const net: Record<string, number> = {};
  // Normalize all member addresses to lowercase so lookups are always consistent
  members.forEach((m) => (net[m.toLowerCase()] = 0));

  for (const expense of expenses) {
    if (members.length === 0) continue;

    const payer = expense.paid_by.toLowerCase();

    if (expense.splits && expense.splits.length > 0) {
      // Custom splits: each entry says "wallet_address owes `amount` to payer"
      for (const split of expense.splits) {
        const member = split.wallet_address.toLowerCase();
        if (member === payer) continue; // payer doesn't owe themselves
        if (net[member] !== undefined) net[member] -= split.amount;
        if (net[payer] !== undefined) net[payer] += split.amount;
      }
    } else {
      // Equal split fallback
      const share = expense.amount / members.length;
      for (const member of members) {
        const m = member.toLowerCase();
        const payerLower = expense.paid_by.toLowerCase();
        if (m === payerLower) {
          net[m] += expense.amount - share;
        } else {
          net[m] -= share;
        }
      }
    }
  }

  return Object.entries(net).map(([address, n]) => ({
    address,
    net: Math.round(n * 1e6) / 1e6,
  }));
}

/**
 * Apply past settlements on top of raw expense balances.
 *
 * Each settlement (from → to, amount) effectively:
 *   - reduces `from`'s debt (net goes up)
 *   - reduces `to`'s credit (net goes down)
 */
export function computeNetBalancesWithSettlements(
  expenses: Expense[],
  settlements: Settlement[],
  members: string[]
): Balance[] {
  const balances = computeNetBalances(expenses, members);
  const net: Record<string, number> = {};
  balances.forEach((b) => (net[b.address] = b.net));

  for (const s of settlements) {
    const payer = s.paid_by.toLowerCase();
    const payee = s.paid_to.toLowerCase();
    // net keys are already lowercase (from computeNetBalances)
    if (net[payer] !== undefined) net[payer] += s.amount;
    if (net[payee] !== undefined) net[payee] -= s.amount;
  }

  return Object.entries(net).map(([address, n]) => ({
    address,
    net: Math.round(n * 1e6) / 1e6,
  }));
}

/**
 * Reduce net balances to the minimum number of directed transfers using a
 * greedy two-pointer algorithm.
 */
export function minimizeTransfers(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.net > DUST_THRESHOLD)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);

  const debtors = balances
    .filter((b) => b.net < -DUST_THRESHOLD)
    .map((b) => ({ ...b, net: Math.abs(b.net) }))
    .sort((a, b) => b.net - a.net);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.net, debtor.net);

    transfers.push({
      from: debtor.address,
      to: creditor.address,
      amount: Math.round(amount * 1e6) / 1e6,
    });

    creditor.net -= amount;
    debtor.net -= amount;

    if (creditor.net < DUST_THRESHOLD) ci++;
    if (debtor.net < DUST_THRESHOLD) di++;
  }

  return transfers;
}

/** Compute remaining debts after accounting for past settlements */
export function calculateRemainingDebts(
  expenses: Expense[],
  settlements: Settlement[],
  members: string[]
): Transfer[] {
  const balances = computeNetBalancesWithSettlements(expenses, settlements, members);
  return minimizeTransfers(balances);
}

/** Convenience: compute balances then return the minimal transfer set (no settlements) */
export function calculateDebts(
  expenses: Expense[],
  members: string[]
): Transfer[] {
  const balances = computeNetBalances(expenses, members);
  return minimizeTransfers(balances);
}

/** Returns only the transfers where `address` is the debtor */
export function getMyDebts(
  expenses: Expense[],
  settlements: Settlement[],
  members: string[],
  address: string
): Transfer[] {
  return calculateRemainingDebts(expenses, settlements, members).filter(
    (t) => t.from.toLowerCase() === address.toLowerCase()
  );
}
