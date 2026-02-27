"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/components/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onSuccess }: Props) {
  const { address } = useWallet();
  const { authFetch } = useAuth();
  const { toast } = useToast();
  
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

      toast(`Group "${groupName.trim()}" created! 🎉`, "success");
      onSuccess();
      onClose();
      setGroupName("");
      setMembersInput("");
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast(msg, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg border border-border bg-card rounded-2xl p-8 shadow-2xl animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create a new group</h2>
            <p className="text-sm text-muted mt-1">Give your group a name and invite members.</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-card border border-transparent hover:border-border"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              Group name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={30}
              placeholder="Trip to Paris, Shared Flat, Movie Night…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="minimal-input w-full rounded-lg text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              Invite members{" "}
              <span className="text-muted font-normal text-xs">(optional — you can add them later)</span>
            </label>
            <textarea
              rows={3}
              placeholder={"0xAbc...123\n0xDef...456"}
              value={membersInput}
              onChange={(e) => setMembersInput(e.target.value)}
              className="minimal-input w-full resize-none text-sm leading-relaxed rounded-lg font-mono"
            />
            <p className="text-xs text-muted">Paste wallet addresses, one per line or separated by commas.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-sm rounded-lg flex items-start gap-2">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border bg-transparent px-5 py-3 text-sm font-medium text-muted hover:text-foreground hover:bg-card/80 transition-colors rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !groupName.trim()}
              className="btn-primary flex-1 py-3 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating…" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
