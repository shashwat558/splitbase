"use client";

import Link from "next/link";
import type { Group } from "@/types";

interface Props {
  group: Group;
  memberCount: number;
}

export function GroupCard({ group, memberCount }: Props) {
  const date = new Date(group.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/group/${group.id}`}
      className="group block bg-card border border-border rounded-xl p-6 hover:border-accent/50 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 relative overflow-hidden flex flex-col justify-between h-full"
    >
      {/* Subtle accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" />

      <div className="flex items-start justify-between mb-5">
        <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors truncate pr-3 leading-snug">
          {group.name}
        </h3>
        <span className="text-xs text-muted border border-border px-2 py-1 rounded-md bg-background whitespace-nowrap shrink-0">
          {date}
        </span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/60">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <span>👥</span>
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
        <span className="text-xs text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Open →
        </span>
      </div>
    </Link>
  );
}

