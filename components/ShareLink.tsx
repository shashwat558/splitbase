"use client";

import { useState } from "react";

interface Props {
  groupId: string;
}

export function ShareLink({ groupId }: Props) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/group/${groupId}`
        : `/group/${groupId}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copyLink}
      className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 transition-all ${
        copied
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border bg-card text-foreground hover:border-foreground"
      }`}
      title="Copy invite link"
    >
      {copied ? (
        <>
          <span>✓</span> Copied!
        </>
      ) : (
        <>
          <span>🔗</span> Invite
        </>
      )}
    </button>
  );
}
