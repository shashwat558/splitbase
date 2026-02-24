"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useWallet } from "@/hooks/useWallet";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isConnected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-border selection:text-foreground flex flex-col transition-colors duration-300">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        ></div>

        <div className="relative z-10 max-w-4xl w-full text-center space-y-12 bg-background/80 p-12 border border-border backdrop-blur-sm">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none uppercase">
              SPLIT<span className="text-muted">BASE</span>
            </h1>
            <p className="text-lg md:text-xl font-mono text-muted max-w-2xl mx-auto border-t border-b border-border py-6">
              // ONCHAIN_EXPENSE_SETTLEMENT_PROTOCOL_V1
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left border-border">
             <div className="p-6 border border-border bg-card hover:border-foreground transition-colors group">
                <span className="text-xs font-mono text-muted mb-2 block group-hover:text-accent">01_CREATE</span>
                <h3 className="text-xl font-bold mb-2">GROUPS</h3>
                <p className="text-base text-muted">Initialize minimal expense clusters.</p>
             </div>
             <div className="p-6 border border-border bg-card hover:border-foreground transition-colors group">
                <span className="text-xs font-mono text-muted mb-2 block group-hover:text-accent">02_TRACK</span>
                <h3 className="text-xl font-bold mb-2">EXPENSES</h3>
                <p className="text-base text-muted">Log ETH transactions on Base.</p>
             </div>
             <div className="p-6 border border-border bg-card hover:border-foreground transition-colors group">
                <span className="text-xs font-mono text-muted mb-2 block group-hover:text-accent">03_SETTLE</span>
                <h3 className="text-xl font-bold mb-2">DEBTS</h3>
                <p className="text-base text-muted">One-click onchain settlement.</p>
             </div>
          </div>

          <div className="pt-8">
            <Link 
              href="/dashboard"
              className="btn-primary inline-flex items-center gap-3 text-lg px-8 py-4 uppercase tracking-widest"
            >
              [ ENTER_APP ]
            </Link>
          </div>
        </div>

        <footer className="mt-20 text-sm font-mono text-muted border-t border-border pt-8 w-full max-w-4xl flex justify-between">
            <span>RUNNING_ON: BASE_SEPOLIA</span>
            <span>STATUS: ONLINE</span>
        </footer>
      </main>
    </div>
  );
}
