import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Browser / client-side client (anon key) ─────────────────────────────────
let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

/** Convenience alias — use this in client components */
export const supabase = {
  get client() {
    return getSupabaseClient();
  },
};

/** Server-side Supabase client with elevated privileges (API routes only) */
export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
