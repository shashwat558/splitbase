"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onSuccess }: Props) {
  const { address } = useWallet();
  const { authFetch } = useAuth();
  
  const [groupName, setGroupName] = useState("");
  const [membersInput, setMembersInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!groupName.trim() || !address) return;

    const extraMembers = membersInput
      .split(/[\n,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.startsWith("0x") && s.length === 42);

    const members = [...new Set([address.toLowerCase(), ...extraMembers])];

    setCreating(true);
    try {
      const res = await authFetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), created_by: address, members }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to create group");
      }

      onSuccess();
      onClose();
      setGroupName("");
      setMembersInput("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-none p-4">
      <div className="w-full max-w-lg border border-border bg-card p-8 shadow-2xl animate-in fade-in zoom-in duration-100">
        <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
          <h2 className="text-xl font-mono font-bold text-foreground uppercase tracking-tight">
            // NEW_GROUP_INIT
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors font-mono text-2xl leading-none"
          >
            [X]
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-8">
          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold text-muted uppercase tracking-wider">
              Group Name
            </label>
            <input
              type="text"
              required
              maxLength={30}
              placeholder="ENTER_NAME"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="minimal-input w-full"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold text-muted uppercase tracking-wider">
              Add Members (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="0x...ADDR1, 0x...ADDR2"
              value={membersInput}
              onChange={(e) => setMembersInput(e.target.value)}
              className="minimal-input w-full resize-none font-mono text-sm leading-relaxed"
            />
            <p className="text-xs text-muted font-mono px-1">
              * Separate addresses with commas or newlines
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 text-red-500 text-sm font-mono">
              ERROR: {error}
            </div>
          )}

          <div className="flex gap-4 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border bg-transparent px-6 py-4 text-sm font-mono text-muted hover:text-foreground hover:bg-muted/10 transition-colors uppercase tracking-widest font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary flex-1 py-4 text-sm uppercase tracking-widest"
            >
              {creating ? "Processing..." : "Confirm_Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
