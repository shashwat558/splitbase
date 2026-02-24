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
      className="btn-primary px-4 py-3 text-xs uppercase tracking-widest flex items-center gap-2"
      title="COPY_INVITE_LINK"
    >
      {copied ? (
        <span className="text-accent font-bold">COPIED_TO_CLIPBOARD</span>
      ) : (
        <>
          <span className="font-bold text-lg leading-none">[+]</span> INVITE_LINK
        </>
      )}
    </button>
  );
}
