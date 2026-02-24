-- ─── SplitBase Database Schema ─────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Users (identified by wallet address)
create table if not exists users (
  wallet_address text primary key,
  created_at     timestamptz default now() not null
);

-- Groups
create table if not exists groups (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  created_by       text not null references users(wallet_address),
  created_at       timestamptz default now() not null,
  treasury_address text        -- GroupTreasury contract address (null = P2P mode)
);

-- Group membership (many-to-many)
create table if not exists group_members (
  group_id       uuid not null references groups(id) on delete cascade,
  wallet_address text not null references users(wallet_address),
  primary key (group_id, wallet_address)
);

-- Expenses
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  paid_by     text not null references users(wallet_address),
  amount      numeric(18, 6) not null check (amount > 0),
  description text not null,
  splits      jsonb,          -- [{wallet_address, amount}] or null for equal split
  created_at  timestamptz default now() not null
);

-- Settlements (recorded after on-chain tx confirms)
create table if not exists settlements (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  paid_by    text not null references users(wallet_address),  -- debtor (sent USDC)
  paid_to    text not null references users(wallet_address),  -- creditor (received USDC)
  amount     numeric(18, 6) not null check (amount > 0),
  tx_hash    text,           -- on-chain transaction hash (EIP-5792 batch receipt)
  created_at timestamptz default now() not null
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_group_members_wallet  on group_members(wallet_address);
create index if not exists idx_group_members_group   on group_members(group_id);
create index if not exists idx_expenses_group        on expenses(group_id);
create index if not exists idx_expenses_paid_by      on expenses(paid_by);
create index if not exists idx_settlements_group     on settlements(group_id);
create index if not exists idx_settlements_paid_by   on settlements(paid_by);

-- ─── Row Level Security ────────────────────────────────────────────────────────
-- For MVP, RLS is disabled (API routes use service role key and perform
-- their own authorization checks). Enable when adding per-user auth tokens.
--
-- alter table users         enable row level security;
-- alter table groups        enable row level security;
-- alter table group_members enable row level security;
-- alter table expenses      enable row level security;
-- alter table settlements   enable row level security;

-- ─── Migration: add splits column to existing tables ─────────────────────────
-- Run this if you already have the expenses table from an older schema:
-- alter table expenses add column if not exists splits jsonb;

-- ─── Migration: add treasury_address to groups ───────────────────────────────
-- Run this if you already have the groups table from an older schema:
-- alter table groups add column if not exists treasury_address text;
