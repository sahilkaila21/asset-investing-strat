import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only writes (Stripe webhooks, email capture).
 * Returns null until both the Supabase project and the service role key are configured,
 * so callers must handle the null case rather than assume persistence happened.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || !url.startsWith("http")) return null;

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
