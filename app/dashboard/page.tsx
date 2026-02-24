"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { GroupCard } from "@/components/GroupCard";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import type { Group } from "@/types";

interface GroupWithCount extends Group {
  member_count: number;
}

export default function DashboardPage() {
  const { address, isConnected } = useWallet();
  const { isSigning } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  const fetchGroups = () => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/groups?wallet=${address}`)
      .then((r) => r.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGroups();
  }, [address]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-border selection:text-foreground pb-20 transition-colors duration-300">
      <Header />

      {isSigning && (
        <div className="bg-card border-b border-border px-6 py-3 text-center text-sm font-mono text-muted">
          <span className="animate-pulse mr-2">●</span> WAITING_FOR_SIGNATURE...
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 border-b border-border pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">DASHBOARD</h1>
            <p className="text-sm font-mono text-muted max-w-md">
              // VIEW_AND_MANAGE_GROUPS
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary px-6 py-3 text-sm uppercase tracking-widest flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-lg leading-none font-bold">+</span> NEW_GROUP
          </button>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-card border border-border animate-pulse rounded-sm" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="border border-dashed border-border bg-card/50 py-24 text-center rounded-sm">
            <div className="mx-auto mb-6 h-16 w-16 border border-border bg-background flex items-center justify-center text-2xl text-muted rounded-full">
              []
            </div>
            <h3 className="text-base font-mono text-muted uppercase tracking-wider mb-2">NO_GROUPS_FOUND</h3>
            <p className="text-sm text-muted font-mono max-w-xs mx-auto">
              Initialize a new group to begin tracking expenses.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} memberCount={g.member_count} />
            ))}
          </div>
        )}
      </main>

      <CreateGroupModal 
        isOpen={showCreate} 
        onClose={() => setShowCreate(false)} 
        onSuccess={() => {
            fetchGroups(); 
            router.refresh(); 
        }}
      />
    </div>
  );
}
