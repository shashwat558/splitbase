"use client";

import Link from "next/link";
import type { Group } from "@/types";

interface Props {
  group: Group;
  memberCount: number;
}

export function GroupCard({ group, memberCount }: Props) {
  const date = new Date(group.created_at).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }); // MM/DD/YY format

  return (
    <Link
      href={`/group/${group.id}`}
      className="group block minimal-card bg-card hover:bg-muted/10 transition-all relative overflow-hidden h-full flex flex-col justify-between"
    >
      <div className="absolute top-0 right-0 w-3 h-3 border-l border-b border-border opacity-0 group-hover:opacity-100 transition-opacity bg-muted/20"></div>
      
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground group-hover:text-accent transition-colors truncate pr-4 uppercase tracking-tight">
          {group.name}
        </h3>
        <span className="text-sm font-mono text-muted border border-border px-2 py-1 whitespace-nowrap bg-background">
          {date}
        </span>
      </div>
      
      <div className="flex items-end justify-between mt-auto pt-4 border-t border-border/50">
        <p className="text-sm text-muted font-mono">
            ID: {group.id.slice(0, 4)}...{group.id.slice(-4)}
        </p>
        <div className="text-sm font-bold font-mono text-muted group-hover:text-foreground transition-colors">
            MEMBERS: {memberCount}
        </div>
      </div>
    </Link>
  );
}
