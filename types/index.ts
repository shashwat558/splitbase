// ─── Domain Types ────────────────────────────────────────────────────────────

export interface User {
  wallet_address: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  /** On-chain GroupTreasury contract address, null if treasury mode not activated */
  treasury_address: string | null;
}

export interface GroupMember {
  group_id: string;
  wallet_address: string;
}

/** Custom split entry: how much a specific member owes the payer */
export interface ExpenseSplit {
  wallet_address: string;
  amount: number;
}

export interface Expense {
  id: string;
  group_id: string;
  paid_by: string;          // wallet address of payer
  amount: number;           // total expense amount
  description: string;
  created_at: string;
  splits?: ExpenseSplit[];   // null/empty = equal split among all members
}

/** A recorded on-chain settlement (stored after a successful batch tx) */
export interface Settlement {
  id: string;
  group_id: string;
  paid_by: string;          // debtor wallet
  paid_to: string;          // creditor wallet
  amount: number;           // USDC amount
  tx_hash: string | null;   // on-chain transaction hash
  created_at: string;
}

// ─── Settlement Types ─────────────────────────────────────────────────────────

/** Directed transfer: `from` owes `amount` USDC to `to` */
export interface Transfer {
  from: string;             // wallet address
  to: string;               // wallet address
  amount: number;           // USDC (human-readable, 6 decimals on-chain)
}

/** Net balance for a single address in a group */
export interface Balance {
  address: string;
  net: number;              // positive = owed, negative = owes
}

// ─── API Payload Types ────────────────────────────────────────────────────────

export interface CreateGroupPayload {
  name: string;
  created_by: string;
  members: string[];        // wallet addresses (creator included)
}

export interface CreateExpensePayload {
  group_id: string;
  paid_by: string;
  amount: number;
  description: string;
  splits?: ExpenseSplit[];  // optional custom per-member splits
}

export interface CreateSettlementPayload {
  group_id: string;
  transfers: Array<{
    paid_by: string;
    paid_to: string;
    amount: number;
  }>;
  tx_hash: string | null;
}
