"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useWallet } from "@/hooks/useWallet";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Ticker text content
const TICKER_TEXT = " // ONCHAIN_EXPENSE_SETTLEMENT // BUILT_ON_BASE // ZERO_DOWNTIME // TRUSTLESS_TREASURY // SPLIT_WITH_FRIENDS // ETH_NATIVE // ";

function Ticker({ direction = "left", speed = "30s" }: { direction?: "left" | "right", speed?: string }) {
  return (
    <div className="w-full overflow-hidden bg-background border-y border-border py-2 select-none relative z-20">
      <div 
        className="animate-marquee flex whitespace-nowrap text-xs font-mono text-muted uppercase tracking-widest"
        style={{ 
          animationDirection: direction === "right" ? "reverse" : "normal",
          animationDuration: speed
        }}
      >
        {/* Repeat enough times to fill screen width */}
        {[...Array(8)].map((_, i) => (
          <span key={i} className="mx-4">{TICKER_TEXT}</span>
        ))}
      </div>
    </div>
  );
}

function TypewriterText({ text, speed = 50 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  
  useEffect(() => {
    let i = 0;
    setDisplayed("");
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i > text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      <span className="animate-blink inline-block w-2 h-4 bg-accent ml-1 align-middle"></span>
    </span>
  );
}

export default function Home() {
  const { isConnected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-background flex flex-col transition-colors duration-300 overflow-x-hidden">
      <Header />
      
      {/* Top Ticker */}
      <Ticker speed="40s" />

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Animated Scanline */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
             <div className="w-full h-[2px] bg-accent/20 absolute top-0 animate-[scan_4s_linear_infinite]" />
        </div>

        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.15]" 
             style={{ 
               backgroundImage: `
                 linear-gradient(var(--border) 1px, transparent 1px), 
                 linear-gradient(90deg, var(--border) 1px, transparent 1px)
               `, 
               backgroundSize: '40px 40px',
               maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
             }}
        />

        <div className="relative z-10 max-w-6xl w-full text-center space-y-16 py-12">
          
          {/* Hero Header */}
          <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none uppercase select-none glitch-hover cursor-default">
              SPLIT<span className="text-muted transition-colors duration-300 hover:text-accent">BASE</span>
            </h1>
            
            <div className="h-8 md:h-10 text-lg md:text-xl font-mono text-accent max-w-3xl mx-auto flex items-center justify-center">
              <TypewriterText text="// ONCHAIN_EXPENSE_SETTLEMENT_PROTOCOL_V1" speed={40} />
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left border-t border-b border-border py-12 bg-background/50 backdrop-blur-sm">
             <div className="p-6 border border-border bg-card/50 hover:bg-card hover:border-accent transition-all duration-300 group animate-fade-in-up delay-200">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-mono text-muted group-hover:text-accent transition-colors">01_INIT</span>
                  <span className="w-2 h-2 rounded-full bg-muted group-hover:bg-accent transition-colors" />
                </div>
                <h3 className="text-2xl font-bold mb-2 group-hover:translate-x-1 transition-transform">GROUPS</h3>
                <p className="text-sm text-muted font-mono leading-relaxed">
                  Creating crypto-native expense clusters via smart contract factory linked ownership.
                </p>
             </div>

             <div className="p-6 border border-border bg-card/50 hover:bg-card hover:border-accent transition-all duration-300 group animate-fade-in-up delay-300">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-mono text-muted group-hover:text-accent transition-colors">02_LOG</span>
                  <span className="w-2 h-2 rounded-full bg-muted group-hover:bg-accent transition-colors" />
                </div>
                <h3 className="text-2xl font-bold mb-2 group-hover:translate-x-1 transition-transform">EXPENSES</h3>
                <p className="text-sm text-muted font-mono leading-relaxed">
                  Immutable ledger of shared costs denominated in ETH. Granular per-member splits.
                </p>
             </div>

             <div className="p-6 border border-border bg-card/50 hover:bg-card hover:border-accent transition-all duration-300 group animate-fade-in-up delay-500">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-mono text-muted group-hover:text-accent transition-colors">03_SETTLE</span>
                  <span className="w-2 h-2 rounded-full bg-muted group-hover:bg-accent transition-colors" />
                </div>
                <h3 className="text-2xl font-bold mb-2 group-hover:translate-x-1 transition-transform">TREASURY</h3>
                <p className="text-sm text-muted font-mono leading-relaxed">
                  Trustless settlement via group vault. Batch dispersal. Zero P2P friction.
                </p>
             </div>
          </div>

          {/* CTA */}
          <div className="pt-8 animate-fade-in-up delay-700">
            <Link 
              href="/dashboard"
              className="btn-primary inline-flex items-center gap-4 text-lg px-10 py-5 uppercase tracking-[0.2em] glitch-hover group relative overflow-hidden"
            >
              <span className="relative z-10">[ ENTER_PROTOCOL ]</span>
            </Link>
          </div>
        </div>

        <footer className="mt-auto pt-20 text-xs font-mono text-muted w-full max-w-6xl flex justify-between items-end animate-fade-in-up delay-700 opacity-50">
            <div className="flex flex-col gap-1">
              <span>NETWORK: BASE_SEPOLIA</span>
              <span>CONTRACT: 0x...FACTORY</span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span>STATUS: <span className="text-accent animate-pulse">● ONLINE</span></span>
              <span>LATENCY: 12ms</span>
            </div>
        </footer>
      </main>

      {/* Bottom Ticker */}
      <Ticker direction="right" speed="50s" />
    </div>
  );
}
