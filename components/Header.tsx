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
  
  // Theme Toggle State
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage or system preference on mount
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

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <header className="border-b border-border bg-background px-6 py-5 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300">
      <Link href="/dashboard" className="text-base font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity border border-border px-3 py-1.5 bg-card">
        SB<span className="text-muted">_v1</span>
      </Link>

      <div className="flex items-center gap-4">
        {/* Simple Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="p-2 border border-border bg-card text-foreground hover:bg-muted/10 transition-colors rounded-sm"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>

        {address && (
          <span className="text-sm font-mono text-muted bg-card px-4 py-1.5 border border-border hidden sm:block">
            BAL: <span className="text-foreground">{usdcBalance}</span>
          </span>
        )}

        <Wallet>
          <ConnectWallet className="bg-transparent border border-border hover:bg-card text-foreground text-sm px-4 py-1.5 h-10 min-h-0 rounded-none font-mono transition-colors">
            <Avatar className="h-5 w-5 rounded-none" />
            <Name className="text-sm text-foreground ml-2" />
          </ConnectWallet>
          <WalletDropdown className="bg-background border border-border rounded-none shadow-none text-foreground">
            <Identity className="px-4 pt-4 pb-3 bg-background" hasCopyAddressOnClick>
              <Avatar className="rounded-none"/>
              <Name className="text-foreground font-mono text-base"/>
              <Address className="text-muted font-mono text-sm"/>
              <EthBalance className="text-muted font-mono text-sm"/>
            </Identity>
            <WalletDropdownDisconnect className="bg-background text-muted hover:bg-card hover:text-foreground font-mono text-sm rounded-none border-t border-border py-3" />
          </WalletDropdown>
        </Wallet>
      </div>
    </header>
  );
}
