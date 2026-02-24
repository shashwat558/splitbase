"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Subscribes to Supabase Realtime events for a group.
 * Calls `onRefresh` whenever an expense, settlement, or member is added.
 *
 * PREREQUISITE: In Supabase Dashboard → Database → Replication,
 * enable replication for `expenses`, `settlements`, and `group_members` tables.
 */
export function useGroupRealtime(groupId: string, onRefresh: () => void) {
  useEffect(() => {
    if (!groupId) return;

    const client = getSupabaseClient();

    const channel = client
      .channel(`group-realtime-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `group_id=eq.${groupId}`,
        },
        () => onRefresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settlements",
          filter: `group_id=eq.${groupId}`,
        },
        () => onRefresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => onRefresh()
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [groupId, onRefresh]);
}
