"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { useWallet } from "@/hooks/useWallet";

export function Header() {
  const { address } = useWallet();
  const { formatted: usdcBalance } = useUSDCBalance(address);
  
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  if (!mounted) return null;

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300">
      <Link
        href="/dashboard"
        className="text-lg font-bold tracking-tight text-foreground hover:text-accent transition-colors flex items-center gap-1"
      >
        Split<span className="text-accent">Base</span>
      </Link>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 border border-border bg-card text-foreground hover:bg-card/80 transition-colors rounded-lg text-sm"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {address && (
          <span className="text-sm text-muted bg-card px-3 py-1.5 border border-border rounded-lg hidden sm:block">
            💳 <span className="text-foreground font-medium">{usdcBalance}</span> USDC
          </span>
        )}

        <Wallet>
          <ConnectWallet className="bg-transparent border border-border hover:bg-card text-foreground text-sm px-4 py-2 h-10 min-h-0 rounded-lg font-medium transition-colors">
            <Avatar className="h-5 w-5 rounded-full" />
            <Name className="text-sm text-foreground ml-2" />
          </ConnectWallet>
          <WalletDropdown className="bg-background border border-border rounded-xl shadow-xl text-foreground">
            <Identity className="px-4 pt-4 pb-3 bg-background" hasCopyAddressOnClick>
              <Avatar className="rounded-full" />
              <Name className="text-foreground font-semibold text-base" />
              <Address className="text-muted text-sm" />
              <EthBalance className="text-muted text-sm" />
            </Identity>
            <WalletDropdownDisconnect className="bg-background text-muted hover:bg-card hover:text-foreground text-sm rounded-b-xl border-t border-border py-3 w-full text-center" />
          </WalletDropdown>
        </Wallet>
      </div>
    </header>
  );
}
