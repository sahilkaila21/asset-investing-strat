import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionTier = "free" | "pro" | "institutional";

/**
 * Looks up a user's subscription tier. Defaults to "free" for anonymous users,
 * and swallows any error (missing table, unconfigured Supabase project, etc.)
 * so this is safe to call before the `subscriptions` migration has been run.
 */
export async function getSubscriptionTier(
  supabase: SupabaseClient,
  userId: string | undefined | null
): Promise<SubscriptionTier> {
  if (!userId) return "free";

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("tier, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data || data.status !== "active") return "free";
    return (data.tier as SubscriptionTier) ?? "free";
  } catch {
    return "free";
  }
}
